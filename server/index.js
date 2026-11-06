import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import {
  initDatabase,
  getAllEchoes,
  getEchoById,
  createEcho,
  incrementLike,
  decrementLike,
  incrementShare,
  addComment,
  reportEcho,
  exportDatabaseSnapshot,
  getAdminOverview,
  restoreEcho,
  dismissReport,
  getAdminLogs,
  deleteEchoPermanently,
  deleteCommentPermanently
} from './db.js';
import {
  whisperRateLimiter,
  commentRateLimiter,
  validateWhisperContent
} from './middleware/spamProtection.js';

// Load environment variables from .env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 3001;

// Security & Production Middleware
app.use((req, res, next) => {
  // HTTPS enforcement header (HSTS)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Explicit Privacy Promise header
  res.setHeader('X-Sanctuary-Privacy', '100% Anonymous. Zero PII or IP addresses recorded.');
  next();
});

// Middleware configuration
app.use(cors());
app.use(express.json({ limit: '3mb' })); // Support image attachments up to 2MB

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

/**
 * Health check & system status
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: 'connected (MySQL Workbench Compatible)',
    privacy: 'Zero PII stored',
    timestamp: new Date().toISOString()
  });
});

/**
 * Ultra-lightweight Keep-Alive Ping (Zero DB overhead)
 * Used by GitHub Actions, UptimeRobot, and self-pinger to prevent Render spin-down.
 */
app.get('/api/ping', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('X-Render-Keep-Alive', 'active');
  res.status(200).send('pong');
});

/**
 * Privacy Promise audit endpoint
 */
app.get('/api/privacy', (req, res) => {
  res.json({
    title: 'Echoes Sanctuary Privacy & Data Handling Guarantee',
    anonymousPromise: 'We do not collect names, email addresses, phone numbers, or IP addresses.',
    dataStored: [
      'Whisper message text',
      'Optional chosen recipient tag (e.g. "To: The Stars")',
      'Emotional category and theme preset',
      'Encrypted or optional image data (if attached)',
      'Reaction & reflection counts',
      'Epoch timestamp'
    ],
    dataExplicitlyExcluded: [
      'IP addresses (NEVER logged or stored in database)',
      'User Agent tracking records',
      'Third-party marketing cookies or trackers',
      'Device finger-printing'
    ]
  });
});

/**
 * Get all echoes (with optional category, search, and sorting)
 */
app.get('/api/echoes', async (req, res) => {
  try {
    const { category, search, sortBy, includeReported } = req.query;
    const echoes = await getAllEchoes({
      category: category || 'all',
      search: search || '',
      sortBy: sortBy || 'newest',
      includeReported: includeReported === 'true'
    });
    res.json(echoes);
  } catch (err) {
    console.error('Error fetching echoes:', err);
    res.status(500).json({ error: 'Failed to retrieve whispers from MySQL database.' });
  }
});

/**
 * Get a single echo
 */
app.get('/api/echoes/:id', async (req, res) => {
  try {
    const echo = await getEchoById(req.params.id);
    if (!echo) {
      return res.status(404).json({ error: 'Echo not found' });
    }
    res.json(echo);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve echo.' });
  }
});

/**
 * Create a new echo / whisper (with rate limiting & spam protection)
 */
app.post('/api/echoes', whisperRateLimiter, validateWhisperContent, async (req, res) => {
  try {
    const { name, category, message, image, themeId } = req.body;

    const newEcho = {
      id: `ECHO-${Math.floor(10000 + Math.random() * 90000)}`,
      name: name || 'To: The Universe (Anonymous)',
      category: category || 'regret',
      message,
      image: image || '',
      likes: 1, // Author's silent flame
      shares: 0,
      themeId: themeId || 'amber-nostalgia',
      timestamp: Date.now()
    };

    const created = await createEcho(newEcho);
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating echo:', err);
    res.status(500).json({ error: 'Failed to save whisper to MySQL database.' });
  }
});

/**
 * Add reaction / like ("Felt this")
 */
app.post('/api/echoes/:id/like', async (req, res) => {
  try {
    const likes = await incrementLike(req.params.id);
    res.json({ id: req.params.id, likes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update reaction.' });
  }
});

/**
 * Remove reaction / like
 */
app.delete('/api/echoes/:id/like', async (req, res) => {
  try {
    const likes = await decrementLike(req.params.id);
    res.json({ id: req.params.id, likes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove reaction.' });
  }
});

/**
 * Record share count
 */
app.post('/api/echoes/:id/share', async (req, res) => {
  try {
    const shares = await incrementShare(req.params.id);
    res.json({ id: req.params.id, shares });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update share count.' });
  }
});

/**
 * Add a comment / reflection (with rate limiter)
 */
app.post('/api/echoes/:id/comments', commentRateLimiter, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Reflection comment cannot be empty.' });
    }

    if (text.trim().length > 1000) {
      return res.status(400).json({ error: 'Comment exceeds 1,000 characters.' });
    }

    const comment = await addComment(req.params.id, text.trim());
    res.status(201).json(comment);
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: 'Failed to record reflection.' });
  }
});

/**
 * Report an echo for moderation / spam review
 */
app.post('/api/echoes/:id/report', async (req, res) => {
  try {
    const { reason, details } = req.body;
    if (!reason) {
      return res.status(400).json({ error: 'Please select a reason for reporting.' });
    }

    const result = await reportEcho(req.params.id, reason, details || '');
    res.json({
      success: true,
      message: 'Thank you for protecting the sanctuary. This echo is now under review.',
      result
    });
  } catch (err) {
    console.error('Error reporting echo:', err);
    res.status(500).json({ error: 'Failed to submit report.' });
  }
});

// -------------------------------------------------------------
// Admin & Moderation Endpoints (Protected by Guardian Key)
// -------------------------------------------------------------

/**
 * Middleware: Verify Admin Secret PIN
 */
function requireAdminAuth(req, res, next) {
  const adminPin = (process.env.ADMIN_PIN || 'arya2026').trim();
  const providedPin = (
    req.headers['x-admin-key'] ||
    req.body?.pin ||
    req.query?.pin ||
    ''
  ).toString().trim();

  if (!providedPin || providedPin !== adminPin) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Guardian Key' });
  }
  next();
}

/**
 * Admin: Verify Guardian PIN
 */
app.post('/api/admin/verify', (req, res) => {
  const adminPin = (process.env.ADMIN_PIN || 'arya2026').trim();
  const { pin } = req.body || {};
  if (pin && pin.toString().trim() === adminPin) {
    return res.json({ success: true, message: 'Guardian key verified' });
  }
  return res.status(401).json({ success: false, error: 'Incorrect Guardian PIN' });
});

/**
 * Admin: Fetch full sanctuary overview & moderation queue
 */
app.get('/api/admin/overview', requireAdminAuth, async (req, res) => {
  try {
    const overview = await getAdminOverview();
    res.json(overview);
  } catch (err) {
    console.error('Error in /api/admin/overview:', err);
    res.status(500).json({ error: 'Failed to load admin overview.' });
  }
});

/**
 * Admin: Restore reported echo back to public sanctuary
 */
app.post('/api/admin/echoes/:id/restore', requireAdminAuth, async (req, res) => {
  try {
    const result = await restoreEcho(req.params.id);
    res.json({ success: true, message: 'Echo restored to sanctuary', result });
  } catch (err) {
    console.error('Error restoring echo:', err);
    res.status(500).json({ error: 'Failed to restore echo.' });
  }
});

/**
 * Admin: Dismiss reports on an echo
 */
app.post('/api/admin/echoes/:id/dismiss', requireAdminAuth, async (req, res) => {
  try {
    const result = await dismissReport(req.params.id);
    res.json({ success: true, message: 'Reports dismissed for echo', result });
  } catch (err) {
    console.error('Error dismissing report:', err);
    res.status(500).json({ error: 'Failed to dismiss reports.' });
  }
});

/**
 * Admin: Fetch activity audit logs
 */
app.get('/api/admin/logs', requireAdminAuth, async (req, res) => {
  try {
    const logs = await getAdminLogs(Number(req.query.limit || 50));
    res.json(logs);
  } catch (err) {
    console.error('Error fetching admin logs:', err);
    res.status(500).json({ error: 'Failed to retrieve admin logs.' });
  }
});

/**
 * Admin: Permanently delete an echo
 */
app.delete('/api/admin/echoes/:id', requireAdminAuth, async (req, res) => {
  try {
    const result = await deleteEchoPermanently(req.params.id);
    res.json({ success: true, message: 'Echo permanently deleted', result });
  } catch (err) {
    console.error('Error deleting echo:', err);
    res.status(500).json({ error: 'Failed to delete echo.' });
  }
});

/**
 * Admin: Permanently delete a comment
 */
app.delete('/api/admin/comments/:id', requireAdminAuth, async (req, res) => {
  try {
    const result = await deleteCommentPermanently(req.params.id);
    res.json({ success: true, message: 'Comment permanently deleted', result });
  } catch (err) {
    console.error('Error deleting comment:', err);
    res.status(500).json({ error: 'Failed to delete comment.' });
  }
});

// -------------------------------------------------------------
// Production Static Serving
// -------------------------------------------------------------
const distPath = path.join(rootDir, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // Fallback to index.html for SPA routing (Express 5 compatible)
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
}

// Start Server and connect to MySQL
async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`🌌 Echoes Sanctuary Server running on http://localhost:${PORT}`);
      console.log(`🐬 Connected to MySQL (Viewable in MySQL Workbench)`);
      console.log(`🔒 Privacy Promise Active: Zero PII logged to disk.`);
      initKeepAlivePinger();
    });
  } catch (err) {
    console.error('⚠️ Could not connect to MySQL server:', err.message);
    console.error('💡 Please verify DB_USER and DB_PASSWORD in .env');
    // Start server anyway so frontend remains accessible
    app.listen(PORT, () => {
      console.log(`🌌 Echoes Sanctuary Server running on http://localhost:${PORT} (Offline/Fallback mode)`);
      initKeepAlivePinger();
    });
  }
}

/**
 * Render Free-Tier Self-Pinger (Runs every 12 minutes)
 * Generates an external HTTP request to the public URL so Render never sleeps.
 */
function initKeepAlivePinger() {
  // Only ping if running on Render or in production
  const isRender = Boolean(process.env.RENDER || process.env.RENDER_EXTERNAL_URL || process.env.NODE_ENV === 'production');
  if (!isRender && !process.env.ENABLE_KEEP_ALIVE) return;

  const publicUrl = process.env.RENDER_EXTERNAL_URL || 'https://echoes-9wsj.onrender.com';
  const pingUrl = `${publicUrl.replace(/\/+$/, '')}/api/ping`;
  const intervalMs = 12 * 60 * 1000; // 12 minutes (Render spins down after 15m)

  console.log(`⚡ Render Keep-Alive active: Pinging ${pingUrl} every 12 mins.`);

  setInterval(async () => {
    try {
      const res = await fetch(pingUrl, {
        headers: { 'User-Agent': 'EchoesSanctuary-KeepAlive/1.0' }
      });
      if (res.ok) {
        console.log(`[Keep-Alive] ⚡ Successful ping at ${new Date().toLocaleTimeString()} — Server kept active.`);
      } else {
        console.warn(`[Keep-Alive] ⚠️ Ping returned HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn(`[Keep-Alive] ⚠️ Ping error:`, err.message);
    }
  }, intervalMs);
}

startServer();

export default app;
