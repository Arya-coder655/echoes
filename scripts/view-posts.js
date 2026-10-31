import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { dbConfig } from '../server/db.js';

dotenv.config();

async function viewPosts() {
  console.log('====================================================');
  console.log(`🐬 MySQL Database: ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port}`);
  console.log('====================================================\n');

  try {
    const conn = await mysql.createConnection(dbConfig);
    const [echoes] = await conn.query('SELECT * FROM echoes ORDER BY timestamp DESC');

    if (echoes.length === 0) {
      console.log('No posts found in the MySQL database yet.');
      await conn.end();
      return;
    }

    console.log(`Found ${echoes.length} saved whispers in MySQL Workbench schema:\n`);

    for (let i = 0; i < echoes.length; i++) {
      const e = echoes[i];
      const [comments] = await conn.query('SELECT * FROM comments WHERE echo_id = ?', [e.id]);
      console.log(`[#${i + 1}] ID: ${e.id} | Category: ${e.category} | Likes: ${e.likes} | Replies: ${comments.length}`);
      console.log(`     Recipient: ${e.name}`);
      console.log(`     Date:      ${new Date(Number(e.timestamp)).toLocaleString()}`);
      console.log(`     Message:   "${e.message}"`);
      if (comments.length > 0) {
        console.log(`     Replies:`);
        comments.forEach((c) => console.log(`       - "${c.text}"`));
      }
      if (e.reported) {
        console.log(`     ⚠️ Flagged for review (${e.report_count} reports)`);
      }
      console.log('----------------------------------------------------');
    }

    await conn.end();
  } catch (err) {
    console.error('❌ Could not connect to MySQL:', err.message);
    console.log('💡 Tip: Make sure your MySQL password in .env matches your MySQL Workbench password.');
  }
}

viewPosts();
