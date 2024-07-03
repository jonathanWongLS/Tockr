require('dotenv').config();
const {
      Client,
      IntentsBitField
} = require('discord.js');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const admin = require('firebase-admin');
const serviceAccount = require('./firebase.json');

admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
});

const DB = admin.firestore();

const client = new Client(
      {
            intents: [
                  IntentsBitField.Flags.Guilds,
                  IntentsBitField.Flags.GuildMembers,
                  IntentsBitField.Flags.GuildMessages,
                  IntentsBitField.Flags.MessageContent,
            ]
      }
)

client.on('ready', async (c) => {
      console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      if (interaction.commandName === 'create-project') {
            const projectName = await getUniqueProjectName(interaction.options.getString("project-name"));
            const projectOwnerID = interaction.user.id;
            var projectPassword = interaction.options.getString("project-password");
            const projectDescription = interaction.options.getString("project-description");

            // Assign a unique project ID
            var newId = uuidv4();
            var projectRef = DB.collection('projects').doc(newId);
            var doc = await projectRef.get();
            while (doc.exists) {
                  newId = uuidv4();
                  projectRef = DB.collection('projects').doc(newId);
                  doc = await projectRef.get();
            }
            const projectId = newId;

            // Store encrypted version of password 
            if (projectPassword) {
                  projectPassword = await encryptPassword(projectPassword);
            } else {
                  projectPassword = null;
            }

            // Add the project to the database
            DB.collection("projects").doc(projectId).set(
                  {
                        projectId: projectId,
                        projectName: projectName,
                        projectOwner: projectOwnerID,
                        projectPassword: projectPassword,
                        projectDescription: projectDescription,
                  }
            )
            interaction.reply(`Project with name **${projectName}** has been created! \nCreated by <@${interaction.user.id}>`);
            return;
      }

      if (interaction.commandName === 'create-task') {
            const projectName = interaction.options.getString('project-name');
            const projectPassword = interaction.options.getString('project-password');
            const taskName = interaction.options.getString('task-name');
            const taskDescription = interaction.options.getString('task-description') || "";
            const taskDeadline = interaction.options.getString('task-deadline');
            const assignedUsers = {
                  user1: null,
                  user2: null,
                  user3: null,
                  user4: null,
                  user5: null,
            }
            const password = interaction.options.getString('project-password');

            for (let i = 0; i <= 5; i++) {
                  const userData = interaction.options.getUser(`assigned-user-${i}`);
                  if (userData) {
                        assignedUsers[`user${i}`] = userData.id;
                  }
            }

            // Validate project name
            const projectsRef = DB.collection('projects');
            const snapshot = await projectsRef.where('projectName', '==', projectName).get();
            if (snapshot.empty) {
                  interaction.reply(`Project name '**${projectName}**' does not exist!\nCreate a **new project**, or find for a valid project name with */list-project-names*. \n <@${interaction.user.id}>`);
                  return;
            }

            const projectData = snapshot.docs[0].data();

            if (projectData.projectPassword) {
                  if (!projectPassword) {
                        interaction.reply(`Project \`${projectData.projectName}\` is protected with a password. Enter the correct password. \n <@${interaction.user.id}>`);
                        return;
                  } 
                  const correctPassword = await passwordIsCorrect(projectPassword, projectData.projectPassword);
                  
                  if (!correctPassword) {
                        interaction.reply(`Incorrect password for project \`${projectData.projectName}\`. Enter the __correct password__. \n <@${interaction.user.id}>`);
                        return;
                  }
            }

            // Validate task deadline format is DD/MM/YYYY HH:MM:SS
            if (!isValidDateTimeString(taskDeadline)) {
                  interaction.reply(`Invalid deadline format. Please use **DD/MM/YYYY HH:MM:SS** \n <@${interaction.user.id}>`);
                  return;
            }

            // Save task to database (Firestore)
            DB.collection("projects").doc(projectData.projectId).collection('tasks').doc(uuidv4()).set({ 
                  taskName: taskName,
                  taskDescription: taskDescription || null,
                  taskDeadline: taskDeadline,
                  assignedUser1: assignedUsers.user1 || null,
                  assignedUser2: assignedUsers.user2 || null,
                  assignedUser3: assignedUsers.user3 || null,
                  assignedUser4: assignedUsers.user4 || null,
                  assignedUser5: assignedUsers.user5 || null
            })
            .then(() => {
                  console.log("Task successfully added!");
            })
            .catch((error) => {
                  interaction.reply("An error occurred when attempting to save task to database. Try again or contact *jonw01*." + "\n <@" + interaction.user.id + ">");
                  console.error("Error adding task: ", error);
            });

            // Build reply 
            var reply = `:partying_face: **Successfully created task! (Project ${projectData.projectName})**`;
            reply += "\n=========================================\n";
            reply += `**Task Name**: \`${taskName}\` \n`;
            if (taskDescription)
                  reply += `**Task Description**: \`${taskDescription}\` \n`;
            reply += "**Assigned Users**: ";
            for (let i = 1; i <= 5; i++) {
                  if (interaction.options.getUser(`assigned-user-${i}`))
                        reply += `${interaction.options.getUser(`assigned-user-${i}`)}` + " ";
            };
            reply += "\n";
            reply += `**Task Deadline**: \`${taskDeadline}\` \n`;
            reply += "\n";

            // Send reply to user
            interaction.reply(`${reply} \n <@${interaction.user.id}>`);
            return;
      }

      if (interaction.commandName === 'details') {
            const projectName = interaction.options.getString('project-name');
            const projectPassword = interaction.options.getString('project-password') || null;
            
            // Validate project name
            const projectsRef = DB.collection('projects');
            const snapshot = await projectsRef.where('projectName', '==', projectName).get();
            if (snapshot.empty) {
                  interaction.reply(`Project name '**${projectName}**' does not exist!\nCreate a **new project**, or find for a valid project name with */list-project-names*. \n <@${interaction.user.id}>`);
                  return;
            }

            const projectData = snapshot.docs[0].data();

            // Validate password
            var tasksStr = "";
            if (projectData.projectPassword) {
                  if (!projectPassword) {
                        interaction.reply(`Project \`${projectData.projectName}\` is protected with a password. Enter the correct password. \n <@${interaction.user.id}>`);
                        return;
                  } 
                  const correctPassword = await passwordIsCorrect(projectPassword, projectData.projectPassword);
                  
                  if (!correctPassword) {
                        interaction.reply(`Incorrect password for project \`${projectData.projectName}\`. Enter the __correct password__. \n <@${interaction.user.id}>`);
                        return;
                  }
            }

            tasksStr += `**Project**: \t\`${projectData.projectName}\`\n`;
            if (projectData.projectDescription)
                  tasksStr += `**Project Description**: \t\`${projectData.projectDescription}\`\n`;
            tasksStr += `**Owned by**: <@${projectData.projectOwner}>\n\n`;
            if (projectData.projectPassword) 
                  tasksStr += `:lock: Protected by a password.\n`;
            else 
                  tasksStr += `:unlock: A public project\n`;

            // List tasks
            var projectRef = DB.collection('projects').doc(projectData.projectId);
            const tasksRef = projectRef.collection('tasks');
            const tasksSnapshot = await tasksRef.get();
            const tasks = tasksSnapshot.docs.map((doc) => doc.data());

            tasksStr += "==========================\n\n";

            if (!tasks || tasks.empty) {
                  tasksStr += "No tasks assigned in this project yet!\n";
                  interaction.reply(`${tasksStr} \n <@${interaction.user.id}>`);
                  return;
            }

            var tasksArray = tasks.map(task => ({
                ...task,
                taskDeadline: new Date(task.taskDeadline)  
            }));

            tasksArray.sort((a, b) => b.taskDeadline - a.taskDeadline);
            
            tasksArray = tasks.map(task => ({
                  ...task,
                  taskDeadline: task.taskDeadline.toString()
            }));

            tasksArray.forEach((task) => {
                  tasksStr += `> **Task Name**: \`${task.taskName}\`\n`;
                  if (task.taskDescription) 
                        tasksStr += `> **Task Description**: \`${task.taskDescription}\`\n`;
                  else 
                        tasksStr += `> **Task Description**: \`-\`\n`;
                  tasksStr += `> **Task Deadline**: \`${task.taskDeadline}\`\n`;
                  if (task.assignedUser1)
                        tasksStr += `> **Assigned User 1**: <@${task.assignedUser1}>\n`;
                  else 
                        tasksStr += `> **Assigned User 1**: \`-\`\n`;
                  
                  if (task.assignedUser2)
                        tasksStr += `> **Assigned User 2**: <@${task.assignedUser2}>\n`;
                  else 
                        tasksStr += `> **Assigned User 2**: \`-\`\n`;
                  
                  if (task.assignedUser3)
                        tasksStr += `> **Assigned User 3**: <@${task.assignedUser3}>\n`;
                  else 
                        tasksStr += `> **Assigned User 3**: \`-\`\n`;

                  if (task.assignedUser4)
                        tasksStr += `> **Assigned User 4**: <@${task.assignedUser4}>\n`;
                  else 
                        tasksStr += `> **Assigned User 4**: \`-\`\n`;

                  if (task.assignedUser5)
                        tasksStr += `> **Assigned User 5**: <@${task.assignedUser5}>\n`;
                  else 
                        tasksStr += `> **Assigned User 5**: \`-\`\n`;

                  tasksStr += "\n\n";
            });
            interaction.reply(`${tasksStr} \n <@${interaction.user.id}>`);
            return;
      }

      if (interaction.commandName === 'list-project-names') {
            const projectsRef = DB.collection('projects');
            const projectSnapshot = await projectsRef.get();
            const projectData = projectSnapshot.docs.map(doc => doc.data());

            var reply = "";
            if (projectData.length > 0) {
                  reply += "**List of Existing Project Names**\n";
                  reply += "====================================\n";
                  for (let i = 0; i < projectData.length; i++) {
                        if (projectData[i].projectPassword) {
                              reply += ":lock: " + projectData[i].projectName + "\n";
                        }
                        else {
                              reply += ":unlock: " + projectData[i].projectName + "\n";
                        }
                  }
            } else {
                  reply += "No projects yet!\nCreate one with `/new-project`!\n";
            }
            interaction.reply(`${reply}\n <@${interaction.user.id}>`);
            return;
      }

      if (interaction.commandName === 'delete-task') {
            const projectName = interaction.options.getString('project-name');
            const projectPassword = interaction.options.getString('project-password');
            const taskName = interaction.options.getString('task-name');
        
            // Validate project name
            const projectsRef = DB.collection('projects');
            const snapshot = await projectsRef.where('projectName', '==', projectName).get();
            if (snapshot.empty) {
                interaction.reply(`Project name '**${projectName}**' does not exist!\nCreate a **new project**, or find a valid project name with */list-project-names*. \n <@${interaction.user.id}>`);
                return;
            }
        
            const projectData = snapshot.docs[0].data();
        
            // Validate project password if required
            if (projectData.projectPassword) {
                if (!projectPassword) {
                    interaction.reply(`Project \`${projectData.projectName}\` is protected with a password. Enter the correct password. \n <@${interaction.user.id}>`);
                    return;
                } 
                const correctPassword = await passwordIsCorrect(projectPassword, projectData.projectPassword);
                
                if (!correctPassword) {
                    interaction.reply(`Incorrect password for project \`${projectData.projectName}\`. Enter the __correct password__. \n <@${interaction.user.id}>`);
                    return;
                }
            }
        
            // Validate task name
            const tasksRef = DB.collection('projects').doc(projectData.projectId).collection('tasks');
            const tasksSnapshot = await tasksRef.where('taskName', '==', taskName).get();
            if (tasksSnapshot.empty) {
                interaction.reply(`Task '**${taskName}**' does not exist!\nCreate a **new task**, or enter the correct task name that you want to remove. \n <@${interaction.user.id}>`);
                return;
            }
        
            const taskId = tasksSnapshot.docs[0].id;
        
            // Delete the task
            await DB.collection('projects').doc(projectData.projectId).collection('tasks').doc(taskId).delete();
        
            // Reply with a success message
            interaction.reply(`Task '**${taskName}**' has been successfully deleted from project \`${projectData.projectName}\`. \n<@${interaction.user.id}>`);
      }
})

function isValidDateTimeString(dateString) {
      // Regex pattern to match the format DD/MM/YYYY HH:MM:SS
      const regex = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/;

      // Test if the string matches the regex pattern
      if (!regex.test(dateString)) {
            return false;
      }

      // Split the string into its components (date and time)
      const parts = dateString.split(' ');
      const date = parts[0];
      const time = parts[1];

      // Split the date part further (day, month, year)
      const dateParts = date.split('/');
      const day = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1; // Months are zero-indexed (January is 0)
      const year = parseInt(dateParts[2], 10);

      // Split the time part further (hours, minutes, seconds)
      const timeParts = time.split(':');
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      const seconds = parseInt(timeParts[2], 10);

      // Check for valid date values
      if (
            isNaN(day) ||
            isNaN(month) ||
            isNaN(year) ||
            isNaN(hours) ||
            isNaN(minutes) ||
            isNaN(seconds)
      ) {
            return false;
      }

      // Check for valid day range (1-31)
      if (day < 1 || day > 31) {
            return false;
      }

      // Check for valid month range (0-11)
      if (month < 0 || month > 11) {
            return false;
      }

      // Check for valid year
      if (year < 1000) {
            return false;
      }

      // Check for leap year (if applicable)
      if (month === 1) { // February (month 1)
            if (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) {
                  // Leap year: allow 29 days
                  if (day > 29) {
                        return false;
                  }
            } else {
                  // Not a leap year: allow only 28 days
                  if (day > 28) {
                        return false;
                  }
            }
      } else {
            // Months with 30 days (April, June, September, November)
            if ([3, 5, 8, 10].includes(month) && day > 30) {
                  return false;
            }
      }

      // All checks passed, valid date string
      return true;
}

async function encryptPassword(passwordString) {
      // Generate a random 10 char string (salt)
      const salt = await bcrypt.genSalt(10);

      // Hash the password, this cannot be reversed
      const encryptedPassword = await bcrypt.hash(passwordString, salt); 

      return encryptedPassword;
}

async function passwordIsCorrect(passwordString, hashedPassword) {
      const isPasswordCorrect = await bcrypt.compare(passwordString, hashedPassword);
      return isPasswordCorrect;
}

async function getUniqueProjectName(baseName) {
      const projectsRef = DB.collection('projects');
      const snapshot = await projectsRef.get();
      const projectNames = snapshot.docs.map(doc => doc.data().projectName);

      let uniqueName = baseName;
      let counter = 1;

      while (projectNames.includes(uniqueName)) {
            uniqueName = `${baseName}-${counter}`;
            counter++;
      }

      return uniqueName;
}

client.login(process.env.TOKEN);