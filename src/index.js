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

client.login(process.env.TOKEN);