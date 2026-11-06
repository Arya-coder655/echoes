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
        last_seen BIGINT NOT NULL,
        INDEX idx_last_seen (last_seen)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. Check if empty and seed initial sanctuary echoes
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
 */
export async function updateSoulHeartbeat(sessionId) {
  const now = Date.now();
  try {
    await pool.query(
      `INSERT INTO active_sessions (session_id, last_seen)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE last_seen = VALUES(last_seen)`,
      [sessionId, now]
    );
  } catch (err) {
    console.warn('Could not record heartbeat in MySQL:', err.message);
  }
}

/**
 * Prune stale sessions (>90 seconds old) and return active souls count
 */
export async function getActiveSoulsCount() {
  const cutoff = Date.now() - 90 * 1000;
  try {
    await pool.query('DELETE FROM active_sessions WHERE last_seen < ?', [cutoff]);
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM active_sessions');
    return rows[0]?.count || 0;
  } catch (err) {
    console.warn('Could not get active souls count from MySQL:', err.message);
    return 0;
  }
}


