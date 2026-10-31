import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { dbConfig } from '../server/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const backupsDir = path.join(rootDir, 'backups');

async function runRestore(backupFileName) {
  console.log('🔄 Initiating MySQL database restoration...');

  if (!fs.existsSync(backupsDir)) {
    console.error('❌ Backups directory not found.');
    process.exit(1);
  }

  const files = fs.readdirSync(backupsDir).filter((f) => f.endsWith('.sql'));
  if (files.length === 0) {
    console.error('❌ No .sql backup files found in backups/ directory.');
    process.exit(1);
  }

  const chosenFile = backupFileName || files.sort().reverse()[0];
  const chosenBackupPath = path.join(backupsDir, chosenFile);

  console.log(`📁 Selected SQL backup: ${chosenFile}`);

  try {
    const conn = await mysql.createConnection({
      ...dbConfig,
      multipleStatements: true
    });

    const sqlContent = fs.readFileSync(chosenBackupPath, 'utf-8');
    await conn.query(sqlContent);

    const [rows] = await conn.query('SELECT COUNT(*) as count FROM echoes');
    console.log(`🎉 Successfully restored to MySQL! Current active whispers: ${rows[0].count}`);
    await conn.end();
  } catch (err) {
    console.error('❌ Restoration failed:', err.message);
  }
}

const arg = process.argv[2];
runRestore(arg);
