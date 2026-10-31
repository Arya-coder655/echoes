import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'echoes_of_the_heart',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  ssl: process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined
};

export const pool = mysql.createPool(dbConfig);

/**
 * Initialize MySQL Database & Tables
 */
export async function initDatabase() {
  try {
    // 1. Connect without selecting database to ensure database schema exists
    const initConn = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      ssl: dbConfig.ssl
    });

    await initConn.query(`
      CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`
      CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    await initConn.end();

    // 2. Create Echoes (Whispers) Table
    await pool.query(`
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
        report_count INT DEFAULT 0,
        INDEX idx_category (category),
        INDEX idx_timestamp (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Create Comments Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id VARCHAR(64) PRIMARY KEY,
        echo_id VARCHAR(64) NOT NULL,
        text TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        INDEX idx_echo_id (echo_id),
        FOREIGN KEY (echo_id) REFERENCES echoes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Create Reports Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id VARCHAR(64) PRIMARY KEY,
        echo_id VARCHAR(64) NOT NULL,
        reason VARCHAR(255) NOT NULL,
        details TEXT,
        timestamp BIGINT NOT NULL,
        INDEX idx_report_echo_id (echo_id),
        FOREIGN KEY (echo_id) REFERENCES echoes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. Check if empty and seed initial sanctuary echoes
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM echoes');
    if (rows[0].count === 0) {
      await seedInitialData();
    }

    console.log(`🐬 MySQL Connected! Database: \`${dbConfig.database}\` on port ${dbConfig.port}`);
    return true;
  } catch (err) {
    console.error('❌ MySQL Initialization Failed:', err.message);
    throw err;
  }
}

/**
 * Seed initial sanctuary whispers into MySQL
 */
async function seedInitialData() {
  const INITIAL_SEED = [
    {
      id: "ECHO-10829",
      name: "To: The girl at the train station",
      category: "regret",
      message: "We shared an umbrella under the pouring rain for twenty minutes in November 2022. You smiled and said you loved winter coffee. The train arrived and I never asked for your name. Three years later, every autumn rain smells like that conversation.",
      image: "",
      likes: 84,
      shares: 19,
      themeId: "amber-nostalgia",
      timestamp: Date.now() - 1000 * 60 * 60 * 3,
      comments: [
        { id: "c1", text: "I felt a tear reading this. Don't hesitate next time.", time: Date.now() - 1000 * 60 * 45 },
        { id: "c2", text: "Maybe she remembers that rainy morning too.", time: Date.now() - 1000 * 60 * 20 }
      ]
    },
    {
      id: "ECHO-20491",
      name: "To: Dad",
      category: "last-words",
      message: "You called twice on Tuesday evening asking if I was free to talk. I said I was buried in work deadlines and would call you back on the weekend. The stroke took you on Thursday morning. I still look at your contact card every Sunday waiting for the phone to ring.",
      image: "",
      likes: 142,
      shares: 38,
      themeId: "midnight-sorrow",
      timestamp: Date.now() - 1000 * 60 * 60 * 18,
      comments: [
        { id: "c3", text: "He knows how deeply you loved him. Please be gentle with your heart.", time: Date.now() - 1000 * 60 * 60 * 5 },
        { id: "c4", text: "I'm calling my father right now because of this post. Thank you for the wake-up call.", time: Date.now() - 1000 * 60 * 60 * 2 }
      ]
    },
    {
      id: "ECHO-30914",
      name: "To: My childhood best friend",
      category: "unsent",
      message: "We swore we would grow old together and laugh about our teenage silly dreams. Ego and silence separated us over a stupid argument ten years ago. Today I saw you pushing a stroller in the park. You looked happy, and I hid behind a tree so I wouldn't disrupt your peace.",
      image: "",
      likes: 67,
      shares: 11,
      themeId: "violet-whisper",
      timestamp: Date.now() - 1000 * 60 * 60 * 36,
      comments: [
        { id: "c5", text: "Text them. Life is too short for decade-long ego.", time: Date.now() - 1000 * 60 * 60 * 12 }
      ]
    },
    {
      id: "ECHO-40182",
      name: "To: The one who got away",
      category: "themed",
      message: "Loving you was like holding warm sand—the harder I tried to hold on, the faster it slipped through my fingers. I don't hate you for leaving; I just hate that a piece of my soul left on that flight with you.",
      image: "",
      likes: 119,
      shares: 27,
      themeId: "crimson-regret",
      timestamp: Date.now() - 1000 * 60 * 60 * 60,
      comments: [
        { id: "c6", text: "Poetic and heartbreaking.", time: Date.now() - 1000 * 60 * 60 * 24 }
      ]
    },
    {
      id: "ECHO-50619",
      name: "To: My younger self at 16",
      category: "unsent",
      message: "Stop crying in the bathroom mirror. The kids in high school won't matter in five years. You are not broken, you are just growing in harsh soil. You will find people who cherish your weird laughter.",
      image: "",
      likes: 203,
      shares: 54,
      themeId: "emerald-peace",
      timestamp: Date.now() - 1000 * 60 * 60 * 80,
      comments: [
        { id: "c7", text: "I needed to hear this today. Thank you so much.", time: Date.now() - 1000 * 60 * 60 * 40 }
      ]
    },
    {
      id: "ECHO-60721",
      name: "To: Maya",
      category: "regret",
      message: "I let fear dictate my silence. When you told me you were moving across the country, I just said 'congratulations'. I should have held your hand and told you I wanted you to stay.",
      image: "",
      likes: 95,
      shares: 16,
      themeId: "rose-unspoken",
      timestamp: Date.now() - 1000 * 60 * 60 * 110,
      comments: []
    }
  ];

  for (const echo of INITIAL_SEED) {
    await pool.query(
      `INSERT INTO echoes (id, name, category, message, image, likes, shares, themeId, timestamp, reported, report_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
      [
        echo.id,
        echo.name,
        echo.category,
        echo.message,
        echo.image || '',
        echo.likes || 0,
        echo.shares || 0,
        echo.themeId,
        echo.timestamp
      ]
    );

    if (echo.comments && echo.comments.length > 0) {
      for (const comm of echo.comments) {
        await pool.query(
          `INSERT INTO comments (id, echo_id, text, timestamp) VALUES (?, ?, ?, ?)`,
          [comm.id, echo.id, comm.text, comm.time || Date.now()]
        );
      }
    }
  }
}

/**
 * Fetch all echoes from MySQL
 */
export async function getAllEchoes({ category = 'all', search = '', sortBy = 'newest', includeReported = false } = {}) {
  let sql = 'SELECT * FROM echoes';
  const conditions = [];
  const params = [];

  if (!includeReported) {
    conditions.push('reported = 0');
  }

  if (category && category !== 'all') {
    conditions.push('category = ?');
    params.push(category);
  }

  if (search && search.trim()) {
    const q = `%${search.trim().toLowerCase()}%`;
    conditions.push('(LOWER(message) LIKE ? OR LOWER(name) LIKE ? OR LOWER(id) LIKE ? OR LOWER(category) LIKE ?)');
    params.push(q, q, q, q);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  switch (sortBy) {
    case 'most-felt':
      sql += ' ORDER BY likes DESC, timestamp DESC';
      break;
    case 'most-shared':
      sql += ' ORDER BY shares DESC, timestamp DESC';
      break;
    case 'newest':
    default:
      sql += ' ORDER BY timestamp DESC';
      break;
  }

  const [echoes] = await pool.query(sql, params);

  // Fetch comments for all returned echoes
  const [allComments] = await pool.query(
    'SELECT id, echo_id, text, timestamp as time FROM comments ORDER BY timestamp DESC'
  );

  const commentsMap = {};
  for (const c of allComments) {
    if (!commentsMap[c.echo_id]) commentsMap[c.echo_id] = [];
    commentsMap[c.echo_id].push(c);
  }

  return echoes.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    message: row.message,
    image: row.image || '',
    likes: row.likes || 0,
    shares: row.shares || 0,
    themeId: row.themeId,
    timestamp: Number(row.timestamp),
    reported: Boolean(row.reported),
    reportCount: row.report_count || 0,
    comments: commentsMap[row.id] || []
  }));
}

/**
 * Get single echo by ID
 */
export async function getEchoById(id) {
  const [rows] = await pool.query('SELECT * FROM echoes WHERE id = ?', [id]);
  if (!rows || rows.length === 0) return null;
  const row = rows[0];

  const [comments] = await pool.query(
    'SELECT id, echo_id, text, timestamp as time FROM comments WHERE echo_id = ? ORDER BY timestamp DESC',
    [id]
  );

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    message: row.message,
    image: row.image || '',
    likes: row.likes || 0,
    shares: row.shares || 0,
    themeId: row.themeId,
    timestamp: Number(row.timestamp),
    reported: Boolean(row.reported),
    reportCount: row.report_count || 0,
    comments: comments || []
  };
}

/**
 * Create a new whisper / echo
 */
export async function createEcho(echo) {
  await pool.query(
    `INSERT INTO echoes (id, name, category, message, image, likes, shares, themeId, timestamp, reported, report_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
    [
      echo.id,
      echo.name || 'To: The Universe (Anonymous)',
      echo.category,
      echo.message,
      echo.image || '',
      echo.likes ?? 1,
      echo.shares ?? 0,
      echo.themeId || 'amber-nostalgia',
      echo.timestamp || Date.now()
    ]
  );

  return await getEchoById(echo.id);
}

/**
 * Increment like (felt)
 */
export async function incrementLike(id) {
  await pool.query('UPDATE echoes SET likes = likes + 1 WHERE id = ?', [id]);
  const [rows] = await pool.query('SELECT likes FROM echoes WHERE id = ?', [id]);
  return rows[0] ? rows[0].likes : 0;
}

/**
 * Decrement like
 */
export async function decrementLike(id) {
  await pool.query('UPDATE echoes SET likes = GREATEST(0, likes - 1) WHERE id = ?', [id]);
  const [rows] = await pool.query('SELECT likes FROM echoes WHERE id = ?', [id]);
  return rows[0] ? rows[0].likes : 0;
}

/**
 * Increment share
 */
export async function incrementShare(id) {
  await pool.query('UPDATE echoes SET shares = shares + 1 WHERE id = ?', [id]);
  const [rows] = await pool.query('SELECT shares FROM echoes WHERE id = ?', [id]);
  return rows[0] ? rows[0].shares : 0;
}

/**
 * Add a comment
 */
export async function addComment(echoId, text) {
  const commentId = `comm-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const time = Date.now();

  await pool.query(
    'INSERT INTO comments (id, echo_id, text, timestamp) VALUES (?, ?, ?, ?)',
    [commentId, echoId, text, time]
  );

  return { id: commentId, text, time };
}

/**
 * Report an echo
 */
export async function reportEcho(echoId, reason, details = '') {
  const reportId = `rep-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const timestamp = Date.now();

  await pool.query(
    'INSERT INTO reports (id, echo_id, reason, details, timestamp) VALUES (?, ?, ?, ?, ?)',
    [reportId, echoId, reason, details, timestamp]
  );

  await pool.query('UPDATE echoes SET report_count = report_count + 1 WHERE id = ?', [echoId]);

  const maxReports = Number(process.env.MAX_REPORTS_BEFORE_REVIEW || 3);
  const [rows] = await pool.query('SELECT report_count FROM echoes WHERE id = ?', [echoId]);
  const count = rows[0]?.report_count || 1;

  if (count >= maxReports) {
    await pool.query('UPDATE echoes SET reported = 1 WHERE id = ?', [echoId]);
  }

  return { reportId, echoId, reportCount: count };
}

/**
 * Export full MySQL database snapshot
 */
export async function exportDatabaseSnapshot() {
  const [echoes] = await pool.query('SELECT * FROM echoes');
  const [comments] = await pool.query('SELECT * FROM comments');
  const [reports] = await pool.query('SELECT * FROM reports');

  return {
    version: '1.0.0',
    engine: 'MySQL',
    database: dbConfig.database,
    exportedAt: new Date().toISOString(),
    stats: {
      echoesCount: echoes.length,
      commentsCount: comments.length,
      reportsCount: reports.length
    },
    data: {
      echoes,
      comments,
      reports
    }
  };
}
