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
  deleteCommentPermanently,
  updateSoulHeartbeat,
  getActiveSoulsCount,
  removeSoulSession,
  pruneExpiredSessions,
  logAdminAction,
  registerOrVerifyIdentity,
  verifyIdentityCredentials,
  recoverIdentity,
  getMyEchoOverview,
  getMyEchoPosts,
  deleteMyEchoPost,
  getMyEchoBookmarks,
  addMyEchoBookmark,
  removeMyEchoBookmark,
  getMyEchoComments,
  deleteMyEchoComment,
  getMyEchoReplies,
  getMyEchoNotifications,
  markMyEchoNotificationsRead,
  toggleCommentReaction,
  toggleCommentCandle,
  reportComment,
  getCommentsForEcho,
  getAdminCommentsWithReports,
  dismissCommentReports,
  toggleCommentVisibility
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
app.use(express.text({ type: ['text/plain', 'text/*'] })); // Support beacon exit payloads

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

// -------------------------------------------------------------
// Real-Time Active Souls (Accurate Presence Tracking)
// 100% Anonymous: Ephemeral UUID session tokens only. Zero PII/IP stored.
// Genuine counts backed by TiDB Cloud MySQL `active_sessions`.
// -------------------------------------------------------------
const SESSION_TIMEOUT_SECONDS = 75; // Active heartbeat window
const CACHE_TTL_MS = 2500; // 2.5s DB read cache to absorb concurrent traffic spikes
let cachedSoulsCount = null;
let lastCacheFetchTime = 0;

// Throttler to prevent spamming DB writes for the same session (max once per 8 seconds)
const sessionWriteThrottler = new Map();

// Periodic cleanup of session write throttler (every 5 minutes)
setInterval(() => {
  const cutoff = Date.now() - 5 * 60 * 1000;
  for (const [id, ts] of sessionWriteThrottler.entries()) {
    if (ts < cutoff) sessionWriteThrottler.delete(id);
  }
}, 5 * 60 * 1000);

// Safe periodic background pruning of stale sessions older than 5 minutes from TiDB
setInterval(async () => {
  try {
    await pruneExpiredSessions(300);
  } catch (err) {
    console.warn('[Presence Prune] Periodic cleanup notice:', err.message);
  }
}, 60 * 1000);

const SESSION_ID_REGEX = /^[a-zA-Z0-9_-]{8,64}$/;

function isValidSessionId(id) {
  return typeof id === 'string' && SESSION_ID_REGEX.test(id);
}

async function getAccurateActiveSouls() {
  const now = Date.now();
  if (cachedSoulsCount !== null && (now - lastCacheFetchTime) < CACHE_TTL_MS) {
    return cachedSoulsCount;
  }
  const count = await getActiveSoulsCount(SESSION_TIMEOUT_SECONDS);
  cachedSoulsCount = count;
  lastCacheFetchTime = now;
  return count;
}

function invalidatePresenceCache() {
  cachedSoulsCount = null;
  lastCacheFetchTime = 0;
}

/**
 * Record soul heartbeat & return current active souls
 */
app.post('/api/presence/heartbeat', async (req, res) => {
  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }
    const { sessionId } = body || {};

    if (!isValidSessionId(sessionId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid anonymous session identifier'
      });
    }

    const now = Date.now();
    const lastWrite = sessionWriteThrottler.get(sessionId) || 0;

    // Throttle DB updates to once per 8 seconds per unique session
    if (now - lastWrite >= 8000) {
      sessionWriteThrottler.set(sessionId, now);
      await updateSoulHeartbeat(sessionId);
      invalidatePresenceCache();
    }

    const activeSouls = await getAccurateActiveSouls();

    return res.json({
      success: true,
      activeSouls,
      updatedAt: new Date().toISOString(),
      status: 'live'
    });
  } catch (err) {
    console.error('Heartbeat error:', err.message);
    return res.status(503).json({
      success: false,
      activeSouls: null,
      updatedAt: new Date().toISOString(),
      status: 'unavailable',
      error: 'Presence tracking temporarily unavailable'
    });
  }
});

// -------------------------------------------------------------
// Developer Support / Beer Donation API (90rs, 150rs, 250rs)
// -------------------------------------------------------------
const BEER_DONATION_CONFIG = {
  payeeName: 'Arya More',
  upiId: '9322794668-3@ybl',
  currency: 'INR',
  tiers: [
    { amount: 90, label: '🍺 ₹90', emoji: '🍺', description: 'Buy a beer' },
    { amount: 150, label: '🍻 ₹150', emoji: '🍻', description: 'Buy a round of beers', default: true },
    { amount: 250, label: '🌟 ₹250', emoji: '🌟', description: 'Super supporter' }
  ],
  validAmounts: [90, 150, 250]
};

app.get('/api/beer/config', (req, res) => {
  res.json(BEER_DONATION_CONFIG);
});

app.get('/api/support/tiers', (req, res) => {
  res.json(BEER_DONATION_CONFIG);
});

app.post('/api/beer/intent', async (req, res) => {
  const { amount = 150 } = req.body || {};
  const validAmounts = [90, 150, 250];
  const finalAmount = validAmounts.includes(Number(amount)) ? Number(amount) : 150;
  
  // Persist support intent activity into TiDB Cloud admin logs
  try {
    await logAdminAction('BEER_SUPPORT_INTENT', String(finalAmount), `Support intent selected: ₹${finalAmount}`);
  } catch (err) {
    console.warn('Could not record support intent to TiDB:', err.message);
  }

  res.json({
    success: true,
    amount: finalAmount,
    upiLink: `upi://pay?pa=9322794668-3@ybl&pn=Arya%20More&cu=INR&am=${finalAmount}&tn=Buy%20a%20beer%20for%20Arya%20More`,
    message: `Thank you for supporting Arya More with ₹${finalAmount}!`
  });
});

/**
 * Get current genuine active souls count
 */
app.get('/api/presence', async (req, res) => {
  try {
    const activeSouls = await getAccurateActiveSouls();
    res.json({
      success: true,
      activeSouls,
      updatedAt: new Date().toISOString(),
      status: 'live'
    });
  } catch (err) {
    console.error('Active Souls fetch error:', err.message);
    res.status(503).json({
      success: false,
      activeSouls: null,
      updatedAt: new Date().toISOString(),
      status: 'unavailable',
      error: 'Presence tracking temporarily unavailable'
    });
  }
});

/**
 * Handle graceful departure (beacon leave on pagehide)
 */
app.post('/api/presence/leave', async (req, res) => {
  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }
    const { sessionId } = body || {};

    if (isValidSessionId(sessionId)) {
      sessionWriteThrottler.delete(sessionId);
      await removeSoulSession(sessionId);
      invalidatePresenceCache();
    }

    res.json({ success: true });
  } catch (err) {
    console.warn('Presence leave notice:', err.message);
    res.json({ success: false });
  }
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
 * Automatically associates with anonymous identity if valid credentials are provided
 */
app.post('/api/echoes', whisperRateLimiter, validateWhisperContent, async (req, res) => {
  try {
    const { name, category, message, image, themeId } = req.body;

    let authorId = null;
    const identityId = req.headers['x-echo-identity-id'];
    const identitySecret = req.headers['x-echo-identity-secret'];
    if (identityId && identitySecret) {
      const isValid = await verifyIdentityCredentials(identityId.toString().trim(), identitySecret.toString().trim());
      if (isValid) {
        authorId = identityId.toString().trim();
      }
    }

    const newEcho = {
      id: `ECHO-${Math.floor(10000 + Math.random() * 90000)}`,
      name: name || 'To: The Universe (Anonymous)',
      category: category || 'regret',
      message,
      image: image || '',
      likes: 1, // Author's silent flame
      shares: 0,
      themeId: themeId || 'amber-nostalgia',
      timestamp: Date.now(),
      authorId
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
 * Get comments for an echo with sorting and reaction counts
 */
app.get('/api/echoes/:id/comments', async (req, res) => {
  try {
    const echoId = req.params.id;
    const sortBy = req.query.sort || 'relevance';

    let identityId = null;
    const headerId = req.headers['x-echo-identity-id'];
    const headerSecret = req.headers['x-echo-identity-secret'];
    if (headerId && headerSecret) {
      const isValid = await verifyIdentityCredentials(headerId.toString().trim(), headerSecret.toString().trim());
      if (isValid) identityId = headerId.toString().trim();
    }

    const comments = await getCommentsForEcho(echoId, sortBy, identityId);
    res.json({ success: true, data: comments });
  } catch (err) {
    console.error('Error fetching comments for echo:', err);
    res.status(500).json({ error: 'Failed to retrieve reflections.' });
  }
});

/**
 * Add a comment / reflection (with rate limiter)
 * Supports text, parentId, gifUrl, and isWarmth
 */
app.post('/api/echoes/:id/comments', commentRateLimiter, async (req, res) => {
  try {
    const { text = '', parentId = null, gifUrl = null, isWarmth = false } = req.body || {};
    const trimmedText = typeof text === 'string' ? text.trim() : '';

    if (!trimmedText && !gifUrl) {
      return res.status(400).json({ error: 'Reflection comment or visual message cannot be empty.' });
    }

    if (trimmedText.length > 1000) {
      return res.status(400).json({ error: 'Comment exceeds 1,000 characters.' });
    }

    let authorId = null;
    const identityId = req.headers['x-echo-identity-id'];
    const identitySecret = req.headers['x-echo-identity-secret'];
    if (identityId && identitySecret) {
      const isValid = await verifyIdentityCredentials(identityId.toString().trim(), identitySecret.toString().trim());
      if (isValid) {
        authorId = identityId.toString().trim();
      }
    }

    const comment = await addComment(
      req.params.id,
      trimmedText,
      authorId,
      parentId || null,
      gifUrl || null,
      Boolean(isWarmth)
    );
    res.status(201).json(comment);
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: 'Failed to record reflection.' });
  }
});

/**
 * Toggle emotional reaction on a comment (Heart, Hug, Moved, Hope, Candle, Peace, Powerful, Gratitude)
 */
app.post('/api/comments/:id/reactions', async (req, res) => {
  try {
    const commentId = req.params.id;
    const { reactionType = 'heart' } = req.body || {};

    const identityId = req.headers['x-echo-identity-id'];
    const identitySecret = req.headers['x-echo-identity-secret'];

    if (!identityId || !identitySecret) {
      return res.status(401).json({ error: 'Anonymous identity credentials required to react.' });
    }

    const isValid = await verifyIdentityCredentials(identityId.toString().trim(), identitySecret.toString().trim());
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid anonymous identity secret.' });
    }

    const result = await toggleCommentReaction(commentId, identityId.toString().trim(), reactionType);
    res.json(result);
  } catch (err) {
    console.error('Error toggling comment reaction:', err);
    res.status(500).json({ error: 'Failed to record reaction.' });
  }
});

/**
 * Toggle lighting a virtual candle on a comment
 */
app.post('/api/comments/:id/candle', async (req, res) => {
  try {
    const commentId = req.params.id;
    const identityId = req.headers['x-echo-identity-id'];
    const identitySecret = req.headers['x-echo-identity-secret'];

    if (!identityId || !identitySecret) {
      return res.status(401).json({ error: 'Anonymous identity credentials required to light a candle.' });
    }

    const isValid = await verifyIdentityCredentials(identityId.toString().trim(), identitySecret.toString().trim());
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid anonymous identity secret.' });
    }

    const result = await toggleCommentCandle(commentId, identityId.toString().trim());
    res.json(result);
  } catch (err) {
    console.error('Error toggling comment candle:', err);
    res.status(500).json({ error: 'Failed to light candle.' });
  }
});

/**
 * Report an inappropriate reflection / reply
 */
app.post('/api/comments/:id/report', async (req, res) => {
  try {
    const commentId = req.params.id;
    const { echoId, reason, details = '' } = req.body || {};
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Please choose a reason for reporting this reflection.' });
    }

    let reporterId = null;
    const identityId = req.headers['x-echo-identity-id'];
    const identitySecret = req.headers['x-echo-identity-secret'];
    if (identityId && identitySecret) {
      const isValid = await verifyIdentityCredentials(identityId.toString().trim(), identitySecret.toString().trim());
      if (isValid) reporterId = identityId.toString().trim();
    }

    const result = await reportComment(commentId, echoId, reporterId, reason.trim(), details.trim());
    res.json(result);
  } catch (err) {
    console.error('Error reporting comment:', err);
    res.status(500).json({ error: 'Failed to submit report.' });
  }
});

/**
 * Curated & safe GIF Search API (Tenor integration with fallback)
 */
const CURATED_EMOTION_GIFS = [
  { id: 'gif-hug-1', title: 'Warm Hug', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3ZhcW13NXl6YmtvdXNveHprcXB3NmtyeGRjZ2phYTY3OHJ5eDltNSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/od5H3PmEG5EVq/giphy.gif', preview: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3ZhcW13NXl6YmtvdXNveHprcXB3NmtyeGRjZ2phYTY3OHJ5eDltNSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/od5H3PmEG5EVq/200.gif', tags: ['hug', 'comfort', 'support'] },
  { id: 'gif-heart-1', title: 'Glowing Heart', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjM2NXE5ZmVrNDQ3ZHFhYndwbTFlYjVrdDNuOTFndmR4dm90cmYxYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/M90mJvfWfd5mbUuULX/giphy.gif', preview: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjM2NXE5ZmVrNDQ3ZHFhYndwbTFlYjVrdDNuOTFndmR4dm90cmYxYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/M90mJvfWfd5mbUuULX/200.gif', tags: ['heart', 'love', 'glow'] },
  { id: 'gif-candle-1', title: 'Gentle Candle Light', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmNqaTZqc3V2bXk5bHF5aWZ3ejl6eTN5Y2pvN3FodXN5MmZ2czQ5ZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o6Zt481isNVuQI1l6/giphy.gif', preview: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmNqaTZqc3V2bXk5bHF5aWZ3ejl6eTN5Y2pvN3FodXN5MmZ2czQ5ZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o6Zt481isNVuQI1l6/200.gif', tags: ['candle', 'peace', 'warmth', 'light'] },
  { id: 'gif-rain-1', title: 'Rain on Window', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3B5ajl4YTF6eWNvb2E1dXF2YW55ZTFva2pxcnZoaDV4cXF5eGtpMCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/t7Qb8655Z1V9u/giphy.gif', preview: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3B5ajl4YTF6eWNvb2E1dXF2YW55ZTFva2pxcnZoaDV4cXF5eGtpMCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/t7Qb8655Z1V9u/200.gif', tags: ['rain', 'calm', 'peace', 'night'] },
  { id: 'gif-stars-1', title: 'Sparkling Night Sky', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWVsbTJ3bW5qN2M0Ympjc2N5cm95MmV4dXJ5Y3ZpOWs3NmtxeXp0cCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oKIPnAiaMCws8nOsE/giphy.gif', preview: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWVsbTJ3bW5qN2M0Ympjc2N5cm95MmV4dXJ5Y3ZpOWs3NmtxeXp0cCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oKIPnAiaMCws8nOsE/200.gif', tags: ['hope', 'stars', 'universe', 'healing'] },
  { id: 'gif-comfort-1', title: 'Gentle Support', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnFkcnZmdnpoaWJ0Y2tzNHpsdGZ5dnAyc3pobHRvN3p2bXN2NGM3MyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/EvYHHSntaIl5m/giphy.gif', preview: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnFkcnZmdnpoaWJ0Y2tzNHpsdGZ5dnAyc3pobHRvN3p2bXN2NGM3MyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/EvYHHSntaIl5m/200.gif', tags: ['hug', 'comfort', 'friend'] }
];

app.get('/api/gifs/search', async (req, res) => {
  const query = (req.query.q || '').toString().trim().toLowerCase();
  const tenorKey = process.env.TENOR_API_KEY;

  if (tenorKey && query) {
    try {
      const tenorUrl = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${tenorKey}&client_key=echoes&limit=24&media_filter=tinygif,gif&contentfilter=high`;
      const tenorRes = await fetch(tenorUrl, { signal: AbortSignal.timeout(4000) });
      if (tenorRes.ok) {
        const data = await tenorRes.json();
        const results = (data.results || []).map(r => ({
          id: r.id,
          title: r.content_description || 'Emotion GIF',
          preview: r.media_formats?.tinygif?.url || r.media_formats?.gif?.url,
          url: r.media_formats?.gif?.url || r.media_formats?.tinygif?.url
        }));
        return res.json({ success: true, results, source: 'tenor' });
      }
    } catch (tenorErr) {
      console.warn('Tenor API lookup failed, falling back to curated:', tenorErr.message);
    }
  }

  // Filter curated collection
  let matched = CURATED_EMOTION_GIFS;
  if (query) {
    const qWords = query.split(/\s+/);
    matched = CURATED_EMOTION_GIFS.filter(g =>
      qWords.some(w => g.title.toLowerCase().includes(w) || g.tags.some(t => t.includes(w)))
    );
    if (matched.length === 0) matched = CURATED_EMOTION_GIFS;
  }

  res.json({ success: true, results: matched, source: 'curated' });
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
// MY ECHO: Anonymous Identity & Personal Dashboard API
// Zero PII, cryptographically authenticated, rate-limited
// -------------------------------------------------------------

/**
 * Middleware: Verify Anonymous Identity Credentials
 * Authenticates private requests to /api/my-echo/*
 */
async function requireAnonymousAuth(req, res, next) {
  const identityId = req.headers['x-echo-identity-id'] || req.query?.identityId;
  const identitySecret = req.headers['x-echo-identity-secret'] || req.query?.identitySecret;

  if (!identityId || !identitySecret) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing anonymous identity credentials',
      code: 'AUTH_REQUIRED'
    });
  }

  try {
    const isValid = await verifyIdentityCredentials(identityId.toString().trim(), identitySecret.toString().trim());
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid anonymous credentials or secret mismatch',
        code: 'INVALID_CREDENTIALS'
      });
    }

    req.anonymousIdentity = { id: identityId.toString().trim() };
    next();
  } catch (authErr) {
    console.error('Anonymous auth check error:', authErr);
    return res.status(500).json({ success: false, error: 'Authentication verification failure' });
  }
}

/**
 * Register or sync an anonymous identity with cryptographic salt + hash
 */
app.post('/api/my-echo/identity', async (req, res) => {
  try {
    const { identityId, identitySecret } = req.body || {};
    if (!identityId || !identitySecret || typeof identityId !== 'string' || typeof identitySecret !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid identityId and identitySecret are required' });
    }

    if (identityId.length < 8 || identityId.length > 64) {
      return res.status(400).json({ success: false, error: 'identityId length out of allowed bounds' });
    }

    const result = await registerOrVerifyIdentity(identityId.trim(), identitySecret.trim());
    if (!result.success) {
      return res.status(401).json(result);
    }

    res.json(result);
  } catch (err) {
    console.error('Error in /api/my-echo/identity:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Restore an anonymous identity using an exportable recovery key
 */
app.post('/api/my-echo/identity/recover', async (req, res) => {
  try {
    const { recoveryKey } = req.body || {};
    if (!recoveryKey || typeof recoveryKey !== 'string') {
      return res.status(400).json({ success: false, error: 'Recovery key is required' });
    }

    const result = await recoverIdentity(recoveryKey);
    if (!result.success) {
      return res.status(401).json(result);
    }

    res.json(result);
  } catch (err) {
    console.error('Error in /api/my-echo/identity/recover:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Get My Echo Overview (counts of posts, bookmarks, reflections, unread notifications)
 */
app.get('/api/my-echo/overview', requireAnonymousAuth, async (req, res) => {
  try {
    const overview = await getMyEchoOverview(req.anonymousIdentity.id);
    res.json({ success: true, ...overview });
  } catch (err) {
    console.error('Error fetching My Echo overview:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch personal sanctuary overview' });
  }
});

/**
 * Get user's published Echoes
 */
app.get('/api/my-echo/posts', requireAnonymousAuth, async (req, res) => {
  try {
    const { page, limit } = req.query;
    const posts = await getMyEchoPosts(req.anonymousIdentity.id, { page, limit });
    res.json({ success: true, ...posts });
  } catch (err) {
    console.error('Error fetching personal Echoes:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve your published Echoes' });
  }
});

/**
 * Delete user's own published Echo
 */
app.delete('/api/my-echo/posts/:id', requireAnonymousAuth, async (req, res) => {
  try {
    const result = await deleteMyEchoPost(req.anonymousIdentity.id, req.params.id);
    if (!result.success) {
      if (result.notFound) return res.status(404).json(result);
      if (result.unauthorized) return res.status(403).json(result);
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error('Error deleting personal Echo:', err);
    res.status(500).json({ success: false, error: 'Failed to erase your Echo' });
  }
});

/**
 * Get user's bookmarked Echoes
 */
app.get('/api/my-echo/bookmarks', requireAnonymousAuth, async (req, res) => {
  try {
    const items = await getMyEchoBookmarks(req.anonymousIdentity.id);
    res.json({ success: true, items });
  } catch (err) {
    console.error('Error fetching personal bookmarks:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve saved Echoes' });
  }
});

/**
 * Save an Echo to bookmarks
 */
app.post('/api/my-echo/bookmarks', requireAnonymousAuth, async (req, res) => {
  try {
    const { echoId } = req.body || {};
    if (!echoId) {
      return res.status(400).json({ success: false, error: 'echoId is required' });
    }
    const result = await addMyEchoBookmark(req.anonymousIdentity.id, echoId);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error('Error saving bookmark:', err);
    res.status(500).json({ success: false, error: 'Failed to save bookmark' });
  }
});

/**
 * Remove an Echo from bookmarks
 */
app.delete('/api/my-echo/bookmarks/:id', requireAnonymousAuth, async (req, res) => {
  try {
    const result = await removeMyEchoBookmark(req.anonymousIdentity.id, req.params.id);
    res.json(result);
  } catch (err) {
    console.error('Error removing bookmark:', err);
    res.status(500).json({ success: false, error: 'Failed to remove bookmark' });
  }
});

/**
 * Get reflections (comments) written by user
 */
app.get('/api/my-echo/comments', requireAnonymousAuth, async (req, res) => {
  try {
    const { page, limit } = req.query;
    const comments = await getMyEchoComments(req.anonymousIdentity.id, { page, limit });
    res.json({ success: true, ...comments });
  } catch (err) {
    console.error('Error fetching personal reflections:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve your reflections' });
  }
});

/**
 * Delete user's own reflection (comment)
 */
app.delete('/api/my-echo/comments/:id', requireAnonymousAuth, async (req, res) => {
  try {
    const result = await deleteMyEchoComment(req.anonymousIdentity.id, req.params.id);
    if (!result.success) {
      if (result.notFound) return res.status(404).json(result);
      if (result.unauthorized) return res.status(403).json(result);
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error('Error deleting personal reflection:', err);
    res.status(500).json({ success: false, error: 'Failed to delete reflection' });
  }
});

/**
 * Get replies received on user's echoes or reflections
 */
app.get('/api/my-echo/replies', requireAnonymousAuth, async (req, res) => {
  try {
    const items = await getMyEchoReplies(req.anonymousIdentity.id);
    res.json({ success: true, items });
  } catch (err) {
    console.error('Error fetching personal replies:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve replies' });
  }
});

/**
 * Get notifications for identity
 */
app.get('/api/my-echo/notifications', requireAnonymousAuth, async (req, res) => {
  try {
    const notifs = await getMyEchoNotifications(req.anonymousIdentity.id);
    res.json({ success: true, ...notifs });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve notifications' });
  }
});

/**
 * Mark notifications as read
 */
app.post('/api/my-echo/notifications/read', requireAnonymousAuth, async (req, res) => {
  try {
    const { notificationIds } = req.body || {};
    const result = await markMyEchoNotificationsRead(req.anonymousIdentity.id, notificationIds);
    res.json(result);
  } catch (err) {
    console.error('Error marking notifications read:', err);
    res.status(500).json({ success: false, error: 'Failed to update notification state' });
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
 * Admin: List comments with moderation & report details
 */
app.get('/api/admin/comments', requireAdminAuth, async (req, res) => {
  try {
    const filter = req.query.filter || 'all';
    const comments = await getAdminCommentsWithReports(filter);
    res.json({ success: true, comments });
  } catch (err) {
    console.error('Error fetching admin comments:', err);
    res.status(500).json({ error: 'Failed to retrieve comments for moderation.' });
  }
});

/**
 * Admin: Dismiss reports on a comment
 */
app.post('/api/admin/comments/:id/dismiss-reports', requireAdminAuth, async (req, res) => {
  try {
    const result = await dismissCommentReports(req.params.id);
    res.json({ success: true, message: 'Reports dismissed', result });
  } catch (err) {
    console.error('Error dismissing comment reports:', err);
    res.status(500).json({ error: 'Failed to dismiss reports.' });
  }
});

/**
 * Admin: Toggle comment visibility (hide/unhide)
 */
app.patch('/api/admin/comments/:id/visibility', requireAdminAuth, async (req, res) => {
  try {
    const isHidden = Boolean(req.body.isHidden);
    const result = await toggleCommentVisibility(req.params.id, isHidden);
    res.json({ success: true, result });
  } catch (err) {
    console.error('Error toggling comment visibility:', err);
    res.status(500).json({ error: 'Failed to update reflection visibility.' });
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
  const staticOptions = {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.webmanifest')) {
        res.setHeader('Content-Type', 'application/manifest+json');
      }
    }
  };

  // Serve static assets at both '/echoes' (base URL) and root '/'
  app.use('/echoes', express.static(distPath, staticOptions));
  app.use(express.static(distPath, staticOptions));

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
