import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import crypto from 'node:crypto';

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

    // 6. Create Admin Activity Logs Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id VARCHAR(64) PRIMARY KEY,
        action VARCHAR(64) NOT NULL,
        target_id VARCHAR(64) NOT NULL,
        details TEXT,
        timestamp BIGINT NOT NULL,
        INDEX idx_log_timestamp (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. Create Active Sessions (Presence) Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS active_sessions (
        session_id VARCHAR(64) PRIMARY KEY,
        created_at BIGINT NOT NULL DEFAULT 0,
        last_seen BIGINT NOT NULL,
        INDEX idx_last_seen (last_seen)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. Create Anonymous Identities Table (My Echo)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS anonymous_identities (
        id VARCHAR(64) PRIMARY KEY,
        secret_hash VARCHAR(128) NOT NULL,
        salt VARCHAR(32) NOT NULL,
        created_at BIGINT NOT NULL,
        last_seen BIGINT NOT NULL,
        INDEX idx_identities_last_seen (last_seen)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 9. Schema migrations for echoes and comments tables (author_id & parent_id)
    try {
      const [echoCols] = await pool.query('DESCRIBE echoes');
      if (!echoCols.some(c => c.Field === 'author_id')) {
        await pool.query('ALTER TABLE echoes ADD COLUMN author_id VARCHAR(64) DEFAULT NULL');
        await pool.query('ALTER TABLE echoes ADD INDEX idx_echoes_author (author_id)');
      }
    } catch (migrErr) {
      console.warn('Echoes author_id migration notice:', migrErr.message);
    }

    try {
      const [commCols] = await pool.query('DESCRIBE comments');
      if (!commCols.some(c => c.Field === 'author_id')) {
        await pool.query('ALTER TABLE comments ADD COLUMN author_id VARCHAR(64) DEFAULT NULL');
        await pool.query('ALTER TABLE comments ADD INDEX idx_comments_author (author_id)');
      }
      if (!commCols.some(c => c.Field === 'parent_id')) {
        await pool.query('ALTER TABLE comments ADD COLUMN parent_id VARCHAR(64) DEFAULT NULL');
        await pool.query('ALTER TABLE comments ADD INDEX idx_comments_parent (parent_id)');
      }
    } catch (migrErr) {
      console.warn('Comments columns migration notice:', migrErr.message);
    }

    // 10. Create Bookmarks Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id VARCHAR(64) PRIMARY KEY,
        identity_id VARCHAR(64) NOT NULL,
        echo_id VARCHAR(64) NOT NULL,
        created_at BIGINT NOT NULL,
        UNIQUE KEY uq_identity_echo (identity_id, echo_id),
        INDEX idx_bookmarks_identity (identity_id),
        INDEX idx_bookmarks_echo (echo_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 11. Create Notifications Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(64) PRIMARY KEY,
        recipient_id VARCHAR(64) NOT NULL,
        actor_id VARCHAR(64) DEFAULT NULL,
        type VARCHAR(32) NOT NULL,
        echo_id VARCHAR(64) NOT NULL,
        comment_id VARCHAR(64) DEFAULT NULL,
        snippet TEXT,
        is_read TINYINT(1) DEFAULT 0,
        created_at BIGINT NOT NULL,
        INDEX idx_notif_recipient (recipient_id, is_read),
        INDEX idx_notif_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 12. Check if empty and seed initial sanctuary echoes
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
    },
    {
      id: "ECHO-70231",
      name: "To: 3:00 AM Silence",
      category: "midnight-thoughts",
      message: "It's 3:14 AM and the whole city is asleep except my brain wondering what our lives would look like if we had just held on five minutes longer in that parking lot.",
      image: "",
      likes: 138,
      shares: 42,
      themeId: "midnight-sorrow",
      timestamp: Date.now() - 1000 * 60 * 60 * 14,
      comments: [
        { id: "c8", text: "The midnight silence has a way of making old memories roar.", time: Date.now() - 1000 * 60 * 60 * 6 }
      ]
    },
    {
      id: "ECHO-80512",
      name: "To: Anyone carrying heavy grief",
      category: "healing-corner",
      message: "Healing isn't linear. Some days you will feel completely at peace, and other days an old song will crack your chest open. Both days belong to your healing. Give yourself grace.",
      image: "",
      likes: 215,
      shares: 68,
      themeId: "emerald-peace",
      timestamp: Date.now() - 1000 * 60 * 60 * 22,
      comments: [
        { id: "c9", text: "Reading this was like an exhale I didn't know I was holding.", time: Date.now() - 1000 * 60 * 60 * 8 }
      ]
    },
    {
      id: "ECHO-90344",
      name: "To: My refrigerator at 2 AM",
      category: "random-chaos",
      message: "I opened the fridge looking for answers to my existential dread and left with shredded cheese eaten directly out of the bag in complete darkness. 10/10 coping mechanism.",
      image: "",
      likes: 182,
      shares: 51,
      themeId: "amber-nostalgia",
      timestamp: Date.now() - 1000 * 60 * 60 * 28,
      comments: [
        { id: "c10", text: "Shredded cheese is universally therapeutic.", time: Date.now() - 1000 * 60 * 60 * 10 }
      ]
    },
    {
      id: "ECHO-95120",
      name: "To: You, across the breakfast table",
      category: "love-notes",
      message: "Watching you laugh while you spill coffee on your favourite oversized sweater made me realize forever wouldn't be long enough with you. You make this heavy world feel feather-light.",
      image: "",
      likes: 247,
      shares: 79,
      themeId: "rose-unspoken",
      timestamp: Date.now() - 1000 * 60 * 60 * 50,
      comments: [
        { id: "c11", text: "Pure poetry. Tell them this in person!", time: Date.now() - 1000 * 60 * 60 * 15 }
      ]
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
    'SELECT id, echo_id, text, timestamp as time, parent_id as parentId FROM comments ORDER BY timestamp ASC'
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
    'SELECT id, echo_id, text, timestamp as time, parent_id as parentId FROM comments WHERE echo_id = ? ORDER BY timestamp ASC',
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
    `INSERT INTO echoes (id, name, category, message, image, likes, shares, themeId, timestamp, reported, report_count, author_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`,
    [
      echo.id,
      echo.name || 'To: The Universe (Anonymous)',
      echo.category,
      echo.message,
      echo.image || '',
      echo.likes ?? 1,
      echo.shares ?? 0,
      echo.themeId || 'amber-nostalgia',
      echo.timestamp || Date.now(),
      echo.authorId || null
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
 * Add a comment / reflection
 * Optionally associates comment with author_id and parent_id (threaded reply)
 * and automatically triggers an anonymous notification for the echo author or parent comment author.
 */
export async function addComment(echoId, text, authorId = null, parentId = null) {
  const commentId = `comm-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const time = Date.now();

  await pool.query(
    'INSERT INTO comments (id, echo_id, text, timestamp, author_id, parent_id) VALUES (?, ?, ?, ?, ?, ?)',
    [commentId, echoId, text, time, authorId || null, parentId || null]
  );

  // Trigger notification for echo author
  try {
    const [echoRows] = await pool.query('SELECT author_id, name FROM echoes WHERE id = ?', [echoId]);
    const echoAuthor = echoRows[0]?.author_id;
    if (echoAuthor && echoAuthor !== authorId) {
      await createNotification(
        echoAuthor,
        authorId,
        'echo_reply',
        echoId,
        commentId,
        text.slice(0, 120)
      );
    }

    // If this is a reply to another comment
    if (parentId) {
      const [parentRows] = await pool.query('SELECT author_id FROM comments WHERE id = ?', [parentId]);
      const parentAuthor = parentRows[0]?.author_id;
      if (parentAuthor && parentAuthor !== authorId && parentAuthor !== echoAuthor) {
        await createNotification(
          parentAuthor,
          authorId,
          'comment_reply',
          echoId,
          commentId,
          text.slice(0, 120)
        );
      }
    }
  } catch (notifErr) {
    console.warn('Failed to queue reply notification:', notifErr.message);
  }

  return { id: commentId, text, time, authorId: authorId || null, parentId: parentId || null };
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

  const maxReports = Number(process.env.MAX_REPORTS_BEFORE_REVIEW || 1);
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

/**
 * Admin: Get sanctuary overview, stats, reported items & recent activity
 */
export async function getAdminOverview() {
  const [echoStats] = await pool.query(`
    SELECT 
      COUNT(*) as totalEchoes,
      SUM(CASE WHEN reported = 1 OR report_count > 0 THEN 1 ELSE 0 END) as reportedCount,
      COALESCE(SUM(likes), 0) as totalLikes,
      COALESCE(SUM(shares), 0) as totalShares
    FROM echoes
  `);

  const [commentStats] = await pool.query('SELECT COUNT(*) as totalComments FROM comments');
  const [reportStats] = await pool.query('SELECT COUNT(*) as totalReports FROM reports');

  // Fetch all reported echoes with associated reports
  const [reportedRows] = await pool.query(
    'SELECT * FROM echoes WHERE reported = 1 OR report_count > 0 ORDER BY timestamp DESC'
  );

  const [allReports] = await pool.query(
    'SELECT * FROM reports ORDER BY timestamp DESC'
  );

  const reportedEchoes = reportedRows.map((echo) => {
    const echoReports = allReports.filter((r) => r.echo_id === echo.id);
    return {
      id: echo.id,
      name: echo.name,
      category: echo.category,
      message: echo.message,
      image: echo.image || '',
      likes: echo.likes || 0,
      shares: echo.shares || 0,
      themeId: echo.themeId,
      timestamp: Number(echo.timestamp),
      reported: Boolean(echo.reported),
      report_count: Number(echo.report_count || 0),
      reports: echoReports.map((r) => ({
        id: r.id,
        reason: r.reason,
        details: r.details || '',
        timestamp: Number(r.timestamp)
      }))
    };
  });

  // Fetch recent echoes (up to 100)
  const [recentRows] = await pool.query(
    'SELECT * FROM echoes ORDER BY timestamp DESC LIMIT 100'
  );
  const recentEchoes = recentRows.map((row) => ({
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
    report_count: Number(row.report_count || 0)
  }));

  // Fetch recent 50 comments with echo snippet
  const [recentComments] = await pool.query(`
    SELECT c.id, c.echo_id, c.text, c.timestamp, e.message as echoSnippet, e.name as echoName
    FROM comments c
    LEFT JOIN echoes e ON c.echo_id = e.id
    ORDER BY c.timestamp DESC
    LIMIT 50
  `);

  // Fetch recent 50 admin audit activity logs
  const [recentLogs] = await pool.query(`
    SELECT * FROM admin_logs ORDER BY timestamp DESC LIMIT 50
  `).catch(() => [[]]);

  const systemHealth = {
    database: {
      status: 'connected',
      engine: 'TiDB Cloud Serverless (MySQL 8.0 Compatible)',
      host: dbConfig.host,
      database: dbConfig.database,
      ssl: Boolean(dbConfig.ssl),
      lastSync: new Date().toISOString()
    },
    backend: {
      status: 'online',
      nodeVersion: process.version,
      uptimeSeconds: Math.floor(process.uptime()),
      env: process.env.NODE_ENV || 'production'
    },
    privacy: {
      status: 'active',
      guarantee: 'Zero PII / No IP logs stored'
    }
  };

  return {
    stats: {
      totalEchoes: Number(echoStats[0]?.totalEchoes || 0),
      reportedCount: Number(echoStats[0]?.reportedCount || 0),
      totalComments: Number(commentStats[0]?.totalComments || 0),
      totalReports: Number(reportStats[0]?.totalReports || 0),
      totalLikes: Number(echoStats[0]?.totalLikes || 0),
      totalShares: Number(echoStats[0]?.totalShares || 0)
    },
    reportedEchoes,
    recentEchoes,
    recentComments: recentComments.map((c) => ({
      id: c.id,
      echoId: c.echo_id,
      text: c.text,
      timestamp: Number(c.timestamp),
      echoSnippet: c.echoSnippet || '',
      echoName: c.echoName || ''
    })),
    recentLogs: (recentLogs || []).map((l) => ({
      id: l.id,
      action: l.action,
      targetId: l.target_id,
      details: l.details || '',
      timestamp: Number(l.timestamp)
    })),
    systemHealth
  };
}

/**
 * Admin: Log activity into MySQL admin_logs
 */
export async function logAdminAction(action, targetId, details = '') {
  try {
    const id = `act-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const timestamp = Date.now();
    await pool.query(
      'INSERT INTO admin_logs (id, action, target_id, details, timestamp) VALUES (?, ?, ?, ?, ?)',
      [id, action, targetId, details, timestamp]
    );
    return { id, action, targetId, details, timestamp };
  } catch (err) {
    console.warn('Failed to insert admin log:', err.message);
    return null;
  }
}

/**
 * Admin: Fetch activity logs
 */
export async function getAdminLogs(limit = 50) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM admin_logs ORDER BY timestamp DESC LIMIT ?',
      [limit]
    );
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      targetId: r.target_id,
      details: r.details || '',
      timestamp: Number(r.timestamp)
    }));
  } catch (err) {
    console.warn('Failed fetching admin logs:', err.message);
    return [];
  }
}

/**
 * Admin: Restore a reported echo back to the public sanctuary
 */
export async function restoreEcho(echoId) {
  await pool.query('UPDATE echoes SET reported = 0, report_count = 0 WHERE id = ?', [echoId]);
  await pool.query('DELETE FROM reports WHERE echo_id = ?', [echoId]);
  await logAdminAction('restore_echo', echoId, `Whisper #${echoId} restored to sanctuary feed`);
  return { success: true, id: echoId };
}

/**
 * Admin: Dismiss reports on an echo (clears report queue)
 */
export async function dismissReport(echoId) {
  await pool.query('UPDATE echoes SET reported = 0, report_count = 0 WHERE id = ?', [echoId]);
  await pool.query('DELETE FROM reports WHERE echo_id = ?', [echoId]);
  await logAdminAction('dismiss_report', echoId, `Reports dismissed for whisper #${echoId}`);
  return { success: true, id: echoId };
}

/**
 * Admin: Permanently delete an echo (cascades to comments and reports)
 */
export async function deleteEchoPermanently(echoId) {
  await pool.query('DELETE FROM echoes WHERE id = ?', [echoId]);
  await logAdminAction('delete_echo', echoId, `Whisper #${echoId} permanently erased`);
  return { success: true, id: echoId };
}

/**
 * Admin: Permanently delete a comment
 */
export async function deleteCommentPermanently(commentId) {
  await pool.query('DELETE FROM comments WHERE id = ?', [commentId]);
  await logAdminAction('delete_comment', commentId, `Comment #${commentId} removed`);
  return { success: true, id: commentId };
}

/**
 * Record/refresh an active soul's heartbeat in TiDB/MySQL
 * Upserts session_id with created_at and last_seen timestamps (UTC ms).
 * Strictly anonymous: session_id is a client-generated ephemeral random UUID.
 */
export async function updateSoulHeartbeat(sessionId) {
  const now = Date.now();
  try {
    await pool.query(
      `INSERT INTO active_sessions (session_id, created_at, last_seen)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE last_seen = VALUES(last_seen)`,
      [sessionId, now, now]
    );
    return true;
  } catch (err) {
    console.warn('Could not record heartbeat in MySQL:', err.message);
    throw err;
  }
}

/**
 * Return genuinely accurate active souls count from TiDB/MySQL.
 * Read-only, indexed O(log N) query on idx_last_seen.
 * Returns only sessions that have sent a valid heartbeat within timeoutSeconds.
 */
export async function getActiveSoulsCount(timeoutSeconds = 75) {
  const cutoff = Date.now() - (timeoutSeconds * 1000);
  try {
    const [rows] = await pool.query(
      'SELECT COUNT(*) as count FROM active_sessions WHERE last_seen >= ?',
      [cutoff]
    );
    return Number(rows[0]?.count || 0);
  } catch (err) {
    console.warn('Could not get active souls count from MySQL:', err.message);
    throw err;
  }
}

/**
 * Explicitly remove a soul session on graceful departure (beacon leave/pagehide)
 */
export async function removeSoulSession(sessionId) {
  try {
    const [result] = await pool.query(
      'DELETE FROM active_sessions WHERE session_id = ?',
      [sessionId]
    );
    return (result?.affectedRows || 0) > 0;
  } catch (err) {
    console.warn('Could not remove soul session from MySQL:', err.message);
    return false;
  }
}

/**
 * Periodically prune stale sessions older than retentionSeconds (default 5 minutes).
 * Kept separate from count reads to keep presence queries blazing fast.
 */
export async function pruneExpiredSessions(retentionSeconds = 300) {
  const cutoff = Date.now() - (retentionSeconds * 1000);
  try {
    const [result] = await pool.query(
      'DELETE FROM active_sessions WHERE last_seen < ? LIMIT 1000',
      [cutoff]
    );
    return result?.affectedRows || 0;
  } catch (err) {
    console.warn('Could not prune expired sessions from MySQL:', err.message);
    return 0;
  }
}

// -------------------------------------------------------------
// MY ECHO: Anonymous Identity, Dashboard & Notification Engine
// -------------------------------------------------------------

/**
 * Register or verify an anonymous identity with secure salt + SHA-256 hash.
 */
export async function registerOrVerifyIdentity(identityId, identitySecret) {
  if (!identityId || !identitySecret || typeof identityId !== 'string' || typeof identitySecret !== 'string') {
    throw new Error('Invalid identity credentials');
  }

  const [existing] = await pool.query(
    'SELECT id, secret_hash, salt, created_at, last_seen FROM anonymous_identities WHERE id = ?',
    [identityId]
  );

  const now = Date.now();

  if (existing && existing.length > 0) {
    const record = existing[0];
    const candidateHash = crypto.createHash('sha256').update(identitySecret + record.salt).digest('hex');
    
    // Timing-safe comparison to prevent timing attacks
    const bufA = Buffer.from(candidateHash, 'utf8');
    const bufB = Buffer.from(record.secret_hash, 'utf8');
    if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
      return { success: false, error: 'Unauthorized: Invalid identity secret' };
    }

    await pool.query('UPDATE anonymous_identities SET last_seen = ? WHERE id = ?', [now, identityId]);
    return { success: true, identityId, isNew: false, createdAt: Number(record.created_at) };
  } else {
    // Generate fresh salt and hash
    const salt = crypto.randomBytes(16).toString('hex');
    const secretHash = crypto.createHash('sha256').update(identitySecret + salt).digest('hex');

    await pool.query(
      'INSERT INTO anonymous_identities (id, secret_hash, salt, created_at, last_seen) VALUES (?, ?, ?, ?, ?)',
      [identityId, secretHash, salt, now, now]
    );

    return { success: true, identityId, isNew: true, createdAt: now };
  }
}

/**
 * Verify identity credentials (boolean check for auth middleware)
 */
export async function verifyIdentityCredentials(identityId, identitySecret) {
  if (!identityId || !identitySecret) return false;
  try {
    const [existing] = await pool.query(
      'SELECT secret_hash, salt FROM anonymous_identities WHERE id = ?',
      [identityId]
    );
    if (!existing || existing.length === 0) return false;
    const record = existing[0];
    const candidateHash = crypto.createHash('sha256').update(identitySecret + record.salt).digest('hex');
    const bufA = Buffer.from(candidateHash, 'utf8');
    const bufB = Buffer.from(record.secret_hash, 'utf8');
    if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
      return false;
    }
    // Update last_seen asynchronously without blocking
    pool.query('UPDATE anonymous_identities SET last_seen = ? WHERE id = ?', [Date.now(), identityId]).catch(() => {});
    return true;
  } catch (err) {
    console.warn('Identity verification error:', err.message);
    return false;
  }
}

/**
 * Recover identity from a user-provided recovery key.
 * Expected format: "ECHO-REC-" + base64(JSON.stringify({ id, secret }))
 */
export async function recoverIdentity(recoveryKey) {
  if (!recoveryKey || typeof recoveryKey !== 'string') {
    return { success: false, error: 'Recovery key cannot be empty' };
  }
  try {
    let cleanKey = recoveryKey.trim();
    if (cleanKey.startsWith('ECHO-REC-')) {
      cleanKey = cleanKey.slice(9);
    }
    const decoded = Buffer.from(cleanKey, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    const { id, secret } = parsed || {};

    if (!id || !secret) {
      return { success: false, error: 'Malformed recovery key structure' };
    }

    const isValid = await verifyIdentityCredentials(id, secret);
    if (!isValid) {
      return { success: false, error: 'Invalid recovery credentials. Identity not found or secret does not match.' };
    }

    return { success: true, identityId: id, identitySecret: secret };
  } catch (err) {
    return { success: false, error: 'Failed to decode recovery key: ' + err.message };
  }
}

/**
 * Create a new notification for an anonymous user
 */
export async function createNotification(recipientId, actorId, type, echoId, commentId, snippet) {
  if (!recipientId || recipientId === actorId) return null;
  const id = `notif-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  try {
    await pool.query(
      `INSERT INTO notifications (id, recipient_id, actor_id, type, echo_id, comment_id, snippet, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [id, recipientId, actorId || null, type, echoId, commentId || null, snippet || '', Date.now()]
    );
    return id;
  } catch (err) {
    console.warn('Failed to insert notification:', err.message);
    return null;
  }
}

/**
 * Get summary stats for My Echo dashboard
 */
export async function getMyEchoOverview(identityId) {
  const [echoStats] = await pool.query(
    'SELECT COUNT(*) as totalPosts FROM echoes WHERE author_id = ?',
    [identityId]
  );
  const [bookmarkStats] = await pool.query(
    'SELECT COUNT(*) as totalBookmarks FROM bookmarks WHERE identity_id = ?',
    [identityId]
  );
  const [reflectionStats] = await pool.query(
    'SELECT COUNT(*) as totalReflections FROM comments WHERE author_id = ?',
    [identityId]
  );
  const [unreadNotifs] = await pool.query(
    'SELECT COUNT(*) as unread FROM notifications WHERE recipient_id = ? AND is_read = 0',
    [identityId]
  );

  return {
    identityId,
    totalPosts: Number(echoStats[0]?.totalPosts || 0),
    totalBookmarks: Number(bookmarkStats[0]?.totalBookmarks || 0),
    totalReflections: Number(reflectionStats[0]?.totalReflections || 0),
    unreadNotifications: Number(unreadNotifs[0]?.unread || 0)
  };
}

/**
 * Get echoes authored by this identity with comments count and pagination
 */
export async function getMyEchoPosts(identityId, { page = 1, limit = 20 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const [posts] = await pool.query(
    `SELECT id, name, category, message, image, likes, shares, themeId, timestamp, reported, report_count
     FROM echoes
     WHERE author_id = ?
     ORDER BY timestamp DESC
     LIMIT ? OFFSET ?`,
    [identityId, limitNum, offset]
  );

  const postIds = posts.map(p => p.id);
  const commentsMap = {};
  if (postIds.length > 0) {
    const [comments] = await pool.query(
      `SELECT id, echo_id, text, timestamp as time, parent_id
       FROM comments
       WHERE echo_id IN (?)
       ORDER BY timestamp DESC`,
      [postIds]
    );
    for (const c of comments) {
      if (!commentsMap[c.echo_id]) commentsMap[c.echo_id] = [];
      commentsMap[c.echo_id].push({
        id: c.id,
        echoId: c.echo_id,
        text: c.text,
        time: Number(c.time),
        parentId: c.parent_id
      });
    }
  }

  const [totalRow] = await pool.query(
    'SELECT COUNT(*) as total FROM echoes WHERE author_id = ?',
    [identityId]
  );
  const total = Number(totalRow[0]?.total || 0);

  return {
    page: pageNum,
    limit: limitNum,
    total,
    totalPages: Math.ceil(total / limitNum),
    items: posts.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      message: p.message,
      image: p.image || '',
      likes: p.likes || 0,
      shares: p.shares || 0,
      themeId: p.themeId,
      timestamp: Number(p.timestamp),
      reported: Boolean(p.reported),
      reportCount: p.report_count || 0,
      status: p.reported ? 'under_review' : 'active',
      comments: commentsMap[p.id] || []
    }))
  };
}

/**
 * Delete own echo (strictly authorized)
 */
export async function deleteMyEchoPost(identityId, echoId) {
  const [existing] = await pool.query('SELECT author_id FROM echoes WHERE id = ?', [echoId]);
  if (!existing || existing.length === 0) {
    return { success: false, notFound: true, error: 'Echo not found' };
  }
  if (existing[0].author_id !== identityId) {
    return { success: false, unauthorized: true, error: 'You are not the author of this Echo' };
  }

  // Delete cascaded bookmarks, comments, reports, notifications
  await pool.query('DELETE FROM notifications WHERE echo_id = ?', [echoId]);
  await pool.query('DELETE FROM bookmarks WHERE echo_id = ?', [echoId]);
  await pool.query('DELETE FROM reports WHERE echo_id = ?', [echoId]);
  await pool.query('DELETE FROM comments WHERE echo_id = ?', [echoId]);
  await pool.query('DELETE FROM echoes WHERE id = ? AND author_id = ?', [echoId, identityId]);

  return { success: true, id: echoId };
}

/**
 * Get bookmarked echoes for this identity
 */
export async function getMyEchoBookmarks(identityId) {
  const [rows] = await pool.query(
    `SELECT e.id, e.name, e.category, e.message, e.image, e.likes, e.shares, e.themeId, e.timestamp, e.reported, b.created_at as savedAt
     FROM bookmarks b
     JOIN echoes e ON b.echo_id = e.id
     WHERE b.identity_id = ? AND e.reported = 0
     ORDER BY b.created_at DESC`,
    [identityId]
  );

  return rows.map(r => ({
    id: r.id,
    name: r.name,
    category: r.category,
    message: r.message,
    image: r.image || '',
    likes: r.likes || 0,
    shares: r.shares || 0,
    themeId: r.themeId,
    timestamp: Number(r.timestamp),
    savedAt: Number(r.savedAt)
  }));
}

/**
 * Add an echo to bookmarks
 */
export async function addMyEchoBookmark(identityId, echoId) {
  const [echoCheck] = await pool.query('SELECT id FROM echoes WHERE id = ?', [echoId]);
  if (!echoCheck || echoCheck.length === 0) {
    return { success: false, error: 'Echo does not exist' };
  }
  const id = `bm-${identityId.slice(0, 8)}-${echoId}`;
  await pool.query(
    `INSERT INTO bookmarks (id, identity_id, echo_id, created_at)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE created_at = VALUES(created_at)`,
    [id, identityId, echoId, Date.now()]
  );
  return { success: true, echoId };
}

/**
 * Remove an echo from bookmarks
 */
export async function removeMyEchoBookmark(identityId, echoId) {
  await pool.query(
    'DELETE FROM bookmarks WHERE identity_id = ? AND echo_id = ?',
    [identityId, echoId]
  );
  return { success: true, echoId };
}

/**
 * Get reflections (comments) written by this identity
 */
export async function getMyEchoComments(identityId, { page = 1, limit = 50 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (pageNum - 1) * limitNum;

  const [comments] = await pool.query(
    `SELECT c.id, c.echo_id, c.text, c.timestamp, c.parent_id,
            e.name as echoRecipient, e.message as echoSnippet, e.category as echoCategory, e.themeId as echoThemeId
     FROM comments c
     LEFT JOIN echoes e ON c.echo_id = e.id
     WHERE c.author_id = ?
     ORDER BY c.timestamp DESC
     LIMIT ? OFFSET ?`,
    [identityId, limitNum, offset]
  );

  const [totalRow] = await pool.query('SELECT COUNT(*) as total FROM comments WHERE author_id = ?', [identityId]);

  return {
    page: pageNum,
    limit: limitNum,
    total: Number(totalRow[0]?.total || 0),
    items: comments.map(c => ({
      id: c.id,
      echoId: c.echo_id,
      text: c.text,
      timestamp: Number(c.timestamp),
      parentId: c.parent_id,
      echoRecipient: c.echoRecipient || 'The Sanctuary',
      echoSnippet: c.echoSnippet ? c.echoSnippet.slice(0, 100) : '',
      echoCategory: c.echoCategory || 'all',
      echoThemeId: c.echoThemeId || 'amber-nostalgia'
    }))
  };
}

/**
 * Delete own reflection (comment)
 */
export async function deleteMyEchoComment(identityId, commentId) {
  const [existing] = await pool.query('SELECT author_id FROM comments WHERE id = ?', [commentId]);
  if (!existing || existing.length === 0) {
    return { success: false, notFound: true, error: 'Comment not found' };
  }
  if (existing[0].author_id !== identityId) {
    return { success: false, unauthorized: true, error: 'Unauthorized to delete this reflection' };
  }
  await pool.query('DELETE FROM comments WHERE id = ? AND author_id = ?', [commentId, identityId]);
  return { success: true, id: commentId };
}

/**
 * Get replies received on user's echoes or reflections
 */
export async function getMyEchoReplies(identityId) {
  const [rows] = await pool.query(
    `SELECT 
       c.id as commentId,
       c.echo_id as echoId,
       c.text as replyText,
       c.timestamp as replyTime,
       c.parent_id as parentId,
       e.name as echoRecipient,
       e.message as echoSnippet,
       e.category as echoCategory,
       e.themeId as echoThemeId,
       n.id as notificationId,
       COALESCE(n.is_read, 0) as isRead
     FROM comments c
     JOIN echoes e ON c.echo_id = e.id
     LEFT JOIN notifications n ON n.comment_id = c.id AND n.recipient_id = ?
     WHERE (e.author_id = ? AND (c.author_id IS NULL OR c.author_id != ?))
        OR (c.parent_id IN (SELECT id FROM comments WHERE author_id = ?) AND (c.author_id IS NULL OR c.author_id != ?))
     ORDER BY c.timestamp DESC
     LIMIT 50`,
    [identityId, identityId, identityId, identityId, identityId]
  );

  return rows.map(r => ({
    id: r.commentId,
    echoId: r.echoId,
    replyText: r.replyText,
    replyTime: Number(r.replyTime),
    parentId: r.parentId,
    echoRecipient: r.echoRecipient || 'The Sanctuary',
    echoSnippet: r.echoSnippet ? r.echoSnippet.slice(0, 100) : '',
    echoCategory: r.echoCategory || 'all',
    echoThemeId: r.echoThemeId || 'amber-nostalgia',
    notificationId: r.notificationId || null,
    isRead: Boolean(r.isRead)
  }));
}

/**
 * Get notifications for identity
 */
export async function getMyEchoNotifications(identityId) {
  const [rows] = await pool.query(
    `SELECT id, recipient_id, actor_id, type, echo_id, comment_id, snippet, is_read, created_at
     FROM notifications
     WHERE recipient_id = ?
     ORDER BY created_at DESC
     LIMIT 50`,
    [identityId]
  );

  const unreadCount = rows.filter(r => !r.is_read).length;

  return {
    unreadCount,
    items: rows.map(r => ({
      id: r.id,
      type: r.type,
      echoId: r.echo_id,
      commentId: r.comment_id,
      snippet: r.snippet || '',
      isRead: Boolean(r.is_read),
      createdAt: Number(r.created_at)
    }))
  };
}

/**
 * Mark notifications as read
 */
export async function markMyEchoNotificationsRead(identityId, notificationIds = null) {
  if (Array.isArray(notificationIds) && notificationIds.length > 0) {
    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE recipient_id = ? AND id IN (?)',
      [identityId, notificationIds]
    );
  } else {
    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE recipient_id = ? AND is_read = 0',
      [identityId]
    );
  }
  return { success: true };
}



