import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { dbConfig, exportDatabaseSnapshot } from '../server/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const backupsDir = path.join(rootDir, 'backups');

fs.mkdirSync(backupsDir, { recursive: true });

async function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const targetSqlBackup = path.join(backupsDir, `echoes_backup_${timestamp}.sql`);
  const targetJsonBackup = path.join(backupsDir, `echoes_backup_${timestamp}.json`);

  console.log('🔄 Starting MySQL database backup...');
  console.log(`🐬 Source: ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port}`);

  try {
    const conn = await mysql.createConnection(dbConfig);
    const [echoes] = await conn.query('SELECT * FROM echoes');
    const [comments] = await conn.query('SELECT * FROM comments');
    const [reports] = await conn.query('SELECT * FROM reports');

    // 1. Generate standard .sql script for MySQL Workbench
    let sqlDump = `-- Echoes Sanctuary MySQL Workbench Backup
-- Generated at: ${new Date().toISOString()}
-- Database: ${dbConfig.database}

CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`;
USE \`${dbConfig.database}\`;

-- Table structure for echoes
CREATE TABLE IF NOT EXISTS echoes (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) DEFAULT 'To: The Universe (Anonymous)',
  category VARCHAR(64) NOT NULL,
  message TEXT NOT NULL,
  image LONGTEXT,
  likes INT DEFAULT 0,
  shares INT DEFAULT 0,
  themeId VARCHAR(64) DEFAULT 'amber-nostalgia',
  timestamp BIGINT NOT NULL,
  reported TINYINT(1) DEFAULT 0,
  report_count INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table structure for comments
CREATE TABLE IF NOT EXISTS comments (
  id VARCHAR(64) PRIMARY KEY,
  echo_id VARCHAR(64) NOT NULL,
  text TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  FOREIGN KEY (echo_id) REFERENCES echoes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table structure for reports
CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(64) PRIMARY KEY,
  echo_id VARCHAR(64) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  details TEXT,
  timestamp BIGINT NOT NULL,
  FOREIGN KEY (echo_id) REFERENCES echoes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Data Dumps
`;

    if (echoes.length > 0) {
      sqlDump += `REPLACE INTO echoes VALUES\n`;
      sqlDump += echoes.map((e) => {
        const cleanMsg = conn.escape(e.message);
        const cleanName = conn.escape(e.name);
        const cleanImg = conn.escape(e.image || '');
        return `('${e.id}', ${cleanName}, '${e.category}', ${cleanMsg}, ${cleanImg}, ${e.likes}, ${e.shares}, '${e.themeId}', ${e.timestamp}, ${e.reported}, ${e.report_count})`;
      }).join(',\n') + ';\n\n';
    }

    if (comments.length > 0) {
      sqlDump += `REPLACE INTO comments VALUES\n`;
      sqlDump += comments.map((c) => {
        const cleanTxt = conn.escape(c.text);
        return `('${c.id}', '${c.echo_id}', ${cleanTxt}, ${c.timestamp})`;
      }).join(',\n') + ';\n\n';
    }

    fs.writeFileSync(targetSqlBackup, sqlDump, 'utf-8');
    console.log(`✅ MySQL Workbench SQL dump created: ${path.basename(targetSqlBackup)}`);

    // 2. Export structured JSON snapshot
    const snapshot = {
      version: '1.0.0',
      engine: 'MySQL',
      database: dbConfig.database,
      exportedAt: new Date().toISOString(),
      stats: {
        echoesCount: echoes.length,
        commentsCount: comments.length,
        reportsCount: reports.length
      },
      data: { echoes, comments, reports }
    };
    fs.writeFileSync(targetJsonBackup, JSON.stringify(snapshot, null, 2), 'utf-8');
    console.log(`✅ JSON structured backup created: ${path.basename(targetJsonBackup)}`);
    console.log(`📊 Snapshot Summary: ${echoes.length} echoes, ${comments.length} comments, ${reports.length} reports.`);

    await conn.end();
    console.log('🎉 Database backup completed successfully!');
  } catch (err) {
    console.error('❌ Backup failed:', err.message);
  }
}

runBackup();
