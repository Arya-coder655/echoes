import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { dbConfig } from '../server/db.js';

dotenv.config();

async function run() {
  try {
    const conn = await mysql.createConnection(dbConfig);
    console.log('Connected to TiDB Cloud:', dbConfig.host);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS active_sessions (
        session_id VARCHAR(64) PRIMARY KEY,
        last_seen BIGINT NOT NULL,
        INDEX idx_last_seen (last_seen)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ Table `active_sessions` successfully created/verified on TiDB Cloud!');
    const [tables] = await conn.query('SHOW TABLES');
    console.log('Tables in TiDB schema:', tables.map(t => Object.values(t)[0]));

    await conn.end();
  } catch (err) {
    console.error('❌ Failed to create table:', err);
    process.exit(1);
  }
}

run();
