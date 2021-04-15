import fs from 'fs';
import _ from 'lodash';
import * as db from './db';
import * as api from './api';

async function processArgs() {
  try {
    await db.connectDB();
    switch (process.argv[2]) {
      case '--create-tables':
        await db.dropTables();
        await db.createTables();
        break;
      case '--insert-data':
        await db.insertConversation(
          JSON.parse(
            fs.readFileSync('./conversations/conversation1.json', 'utf8')
          )
        );
        await db.insertConversation(
          JSON.parse(
            fs.readFileSync('./conversations/conversation2.json', 'utf8')
          )
        );
        console.log('Conversations inserted successfully');
        break;
      case '--fetch-data':
        var conversationFromFile = JSON.parse(
          fs.readFileSync('./conversations/conversation1.json', 'utf8')
        );
        var conversationFromDb = await db.fetchConversation(
          conversationFromFile.conversationId
        );
        console.log(_.isMatch(conversationFromDb, conversationFromFile) ? 'conversation1 from the database is equal to conversation1 from the file':
            'conversation1 from the database is not equal to conversation1 from the file');
        conversationFromFile = JSON.parse(
          fs.readFileSync('./conversations/conversation2.json', 'utf8')
        );
        conversationFromDb = await db.fetchConversation(
          conversationFromFile.conversationId
        );
        console.log(_.isMatch(conversationFromDb, conversationFromFile) ? 'conversation2 from the database is equal to conversation2 from the file':
            'conversation2 from the database is not equal to conversation2 from the file');
        break;
      case '--drop-tables':
        await db.dropTables();
        break;
      case '--invoke-api':
        await api.connectAPI();
        const conversations = await api.getConversations(`${process.argv[3]}/${process.argv[4]}`);
        if (!conversations || conversations.length == 0) {
          console.log('No conversations available for the given date range');
          break;
        }
        for (const conversation of conversations) {
            console.log(`Inserting conversation ${conversation.conversationId} into the database`);
            await db.insertConversation(conversation);
        }
    }
  } catch (err) {
    console.log(err.message);
    process.exit(1);
  }
  process.exit(0);
}

processArgs();
