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

client.login(process.env.TOKEN);