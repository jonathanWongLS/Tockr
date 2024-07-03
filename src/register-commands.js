require('dotenv').config();
const { REST, Routes, ApplicationCommandOptionType } = require('discord.js');

const commands = [
      {
            name: 'create-project',
            description: 'Creates a new project',
            options: [
                  {
                        name: "project-name",
                        description: "Name of project", 
                        type: ApplicationCommandOptionType.String,
                        required: true
                  },
                  {
                        name: "project-password",
                        description: "Enter password to make project private. Remember this if you do have a password!",
                        type: ApplicationCommandOptionType.String,
                        required: false    
                  },
                  {
                        name: "project-description",
                        description: "Description of project",
                        type: ApplicationCommandOptionType.String,
                        required: false
                  }
            ]
      },
      {
            name: 'create-task',
            description: 'Creates a new task in a project',
            options: [
                  {
                        name: "project-name",
                        description: "Name of project",
                        type: ApplicationCommandOptionType.String,
                        required: true
                  },
                  {
                        name: "task-name",
                        description: "Name of task",
                        type: ApplicationCommandOptionType.String,
                        required: true
                  },
                  {
                        name: "task-deadline",
                        description: "Deadline for task. Format: dd/mm/yyyy hh:mm:ss",
                        type: ApplicationCommandOptionType.String,
                        required: true
                  },
                  {
                        name: "assigned-user-1",
                        description: "First user assigned to task",
                        type: ApplicationCommandOptionType.User,
                        required: true
                  },
                  {
                        name: "assigned-user-2",
                        description: "Second user assigned to task",
                        type: ApplicationCommandOptionType.User,
                        required: false
                  },
                  {
                        name: "assigned-user-3",
                        description: "Third user assigned to task",
                        type: ApplicationCommandOptionType.User,
                        required: false
                  },
                  {
                        name: "assigned-user-4",
                        description: "Fourth user assigned to task",
                        type: ApplicationCommandOptionType.User,
                        required: false
                  },
                  {
                        name: "assigned-user-5",
                        description: "Fifth user assigned to task",
                        type: ApplicationCommandOptionType.User,
                        required: false
                  },
                  {
                        name: "project-password",
                        description: "Password of the project (if created with one). Leave this empty if no password needed.",
                        type: ApplicationCommandOptionType.String,
                        required: false
                  },
                  {
                        name: "task-description",
                        description: "Description of task",
                        type: ApplicationCommandOptionType.String,
                        required: false
                  }
            ]
      },
      {
            name: 'list-project-names',
            description: 'Check all project names.'
      },
      {
            name: 'details',
            description: "List all tasks in a project and the project's details.",
            options: [
                  {
                        name: "project-name",
                        description: "Name of project",
                        type: ApplicationCommandOptionType.String,
                        required: true
                  },
                  {
                        name: "project-password",
                        description: "Password of project. Leave it empty if no password is needed.",
                        type: ApplicationCommandOptionType.String,
                        required: false
                  }
            ]
      },
      {
            name: 'delete-task',
            description: "Remove task from project",
            options: [
                  {
                        name: "project-name",
                        description: "Name of project",
                        type: ApplicationCommandOptionType.String,
                        required: true
                  },
                  {
                        name: "task-name",
                        description: "Name of task to remove",
                        type: ApplicationCommandOptionType.String,
                        required: true
                  },
                  {
                        name: "project-password",
                        description: "Password of project. Leave it empty if no password is needed.",
                        type: ApplicationCommandOptionType.String,
                        required: false
                  }
            ]
      }
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
      try {
            console.log('Registering slash commands...');

            await rest.put(
                  Routes.applicationCommands(process.env.CLIENT_ID),
                  { body: commands }
            );

            console.log('Slash commands were registered successfully!');
      } catch (error) {
            console.log(`There was an error: ${error}`);
      }
})();


