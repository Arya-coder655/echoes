import crypto from 'node:crypto';

// In-memory rate limit tracker (Respects zero-PII privacy promise - no IPs stored on disk)
const postTimestamps = new Map();
const commentTimestamps = new Map();

// Periodic cleanup every 10 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;

  for (const [key, timestamps] of postTimestamps.entries()) {
    const active = timestamps.filter((t) => now - t < windowMs);
    if (active.length === 0) postTimestamps.delete(key);
    else postTimestamps.set(key, active);
  }

  for (const [key, timestamps] of commentTimestamps.entries()) {
    const active = timestamps.filter((t) => now - t < windowMs);
    if (active.length === 0) commentTimestamps.delete(key);
    else commentTimestamps.set(key, active);
  }
}, 10 * 60 * 1000);

/**
 * Anonymized client hash generator
 * Generates a one-way salt hash to rate limit spam bots without storing IP or personal info
 */
function getAnonymizedClientHash(req) {
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
  const ua = req.headers['user-agent'] || 'unknown';
  return crypto.createHash('sha256').update(`${ip}-${ua}`).digest('hex');
}

/**
 * Rate limiter middleware for Whisper / Echo creation
 */
export function whisperRateLimiter(req, res, next) {
  const clientHash = getAnonymizedClientHash(req);
  const now = Date.now();
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 300000); // 5 mins
  const maxPosts = Number(process.env.MAX_POSTS_PER_WINDOW || 5);

  const history = postTimestamps.get(clientHash) || [];
  const recent = history.filter((t) => now - t < windowMs);

  // Check cooldown: at least 10 seconds between posts
  if (recent.length > 0 && now - recent[recent.length - 1] < 10000) {
    return res.status(429).json({
      error: 'Please pause for a gentle breath before releasing another whisper. (10s cooldown)'
    });
  }

  if (recent.length >= maxPosts) {
    return res.status(429).json({
      error: 'You have released multiple echoes in a short time. Please wait a few minutes before sharing again.'
    });
  }

  recent.push(now);
  postTimestamps.set(clientHash, recent);
  next();
}

/**
 * Rate limiter middleware for Comment creation
 */
export function commentRateLimiter(req, res, next) {
  const clientHash = getAnonymizedClientHash(req);
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  const maxComments = 15;

  const history = commentTimestamps.get(clientHash) || [];
  const recent = history.filter((t) => now - t < windowMs);

  if (recent.length >= maxComments) {
    return res.status(429).json({
      error: 'Reflection rate limit reached. Please wait a moment before sending more replies.'
    });
  }

  recent.push(now);
  commentTimestamps.set(clientHash, recent);
  next();
}

/**
 * Spam & Quality Content Moderation Validator
 */
export function validateWhisperContent(req, res, next) {
  const { message, name, category } = req.body || {};

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'A whisper message is required.' });
  }

  const trimmed = message.trim();

  if (trimmed.length < 5) {
    return res.status(400).json({ error: 'Your whisper must be at least 5 characters long.' });
  }

  if (trimmed.length > 2000) {
    return res.status(400).json({ error: 'Whisper exceeds maximum allowed length of 2,000 characters.' });
  }

  // Check for suspicious commercial/scam link spam
  const linkSpamPattern = /(http:\/\/|https:\/\/|www\.)\S+/gi;
  const links = trimmed.match(linkSpamPattern);
  if (links && links.length > 2) {
    return res.status(400).json({
      error: 'Echoes is an anonymous sanctuary for reflections, not for links or advertising.'
    });
  }

  // Prevent repetitive character spam (e.g. "aaaaa......" for 50+ chars)
  const repetitivePattern = /(.)\1{40,}/;
  if (repetitivePattern.test(trimmed)) {
    return res.status(400).json({
      error: 'Message contains excessive repeated characters.'
    });
  }

  // Sanitize fields
  req.body.message = trimmed;
  if (name && typeof name === 'string') {
    req.body.name = name.trim().slice(0, 100);
  }
  if (category && typeof category === 'string') {
    const validCategories = [
      'regret',
      'unsent',
      'midnight-thoughts',
      'healing-corner',
      'random-chaos',
      'last-words',
      'love-notes',
      'themed',
      'all'
    ];
    if (!validCategories.includes(category)) {
      req.body.category = 'regret';
    }
  }

  next();
}
