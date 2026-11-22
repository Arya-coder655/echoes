/**
 * Echoes API Client Service
 * Connects the React front-end directly to the SQLite backend API.
 * Includes graceful offline fallback to localStorage.
 */

const RENDER_BACKEND_URL = 'https://echoes-9wsj.onrender.com';
const API_BASE = (typeof window !== 'undefined' && window.location.hostname.includes('github.io'))
  ? `${RENDER_BACKEND_URL}/api`
  : '/api';

// -------------------------------------------------------------
// Anonymous Persistent Identity (My Echo)
// Zero PII, cryptographically secure UUID + 256-bit secret key
// -------------------------------------------------------------
export const STORAGE_KEY_IDENTITY = 'echoes_anonymous_identity_v1';

export function getAnonymousIdentity() {
  if (typeof window === 'undefined') {
    return { identityId: 'anon_ssr', identitySecret: 'anon_secret', createdAt: Date.now() };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_IDENTITY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.identityId && parsed?.identitySecret) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read anonymous identity:', e);
  }

  // Generate new cryptographic identity
  let identityId;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    identityId = `anon_${crypto.randomUUID()}`;
  } else {
    identityId = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  let identitySecret;
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    identitySecret = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    identitySecret = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  }

  const identity = {
    identityId,
    identitySecret,
    createdAt: Date.now()
  };

  try {
    localStorage.setItem(STORAGE_KEY_IDENTITY, JSON.stringify(identity));
  } catch (e) {
    console.warn('Could not persist anonymous identity:', e);
  }

  return identity;
}

export function getAnonymousAuthHeaders() {
  const { identityId, identitySecret } = getAnonymousIdentity();
  return {
    'x-echo-identity-id': identityId,
    'x-echo-identity-secret': identitySecret
  };
}

export function generateRecoveryKey(identityId, identitySecret) {
  try {
    const payload = JSON.stringify({ id: identityId, secret: identitySecret });
    return `ECHO-REC-${btoa(payload)}`;
  } catch {
    return '';
  }
}

export async function fetchEchoesFromDb(params = {}) {
  try {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'all') query.append('category', params.category);
    if (params.search) query.append('search', params.search);
    if (params.sortBy) query.append('sortBy', params.sortBy);

    const res = await fetch(`${API_BASE}/echoes?${query.toString()}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    return { data, isOnline: true };
  } catch (err) {
    console.warn('API fetch failed, falling back to local storage cache:', err.message);
    return { data: null, isOnline: false };
  }
}

export async function createEchoInDb(echoData) {
  try {
    const authHeaders = getAnonymousAuthHeaders();
    const res = await fetch(`${API_BASE}/echoes`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify(echoData)
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Failed to save whisper');
    }
    return { data: json, success: true };
  } catch (err) {
    console.warn('Offline or API error while creating echo:', err.message);
    return { error: err.message, success: false };
  }
}

export async function toggleLikeInDb(id, currentlyLiked) {
  try {
    const method = currentlyLiked ? 'DELETE' : 'POST';
    const res = await fetch(`${API_BASE}/echoes/${id}/like`, { method });
    if (!res.ok) throw new Error('Reaction failed');
    return await res.json();
  } catch (err) {
    console.warn('Failed syncing reaction to database:', err.message);
    return null;
  }
}

export async function recordShareInDb(id) {
  try {
    const res = await fetch(`${API_BASE}/echoes/${id}/share`, { method: 'POST' });
    if (!res.ok) throw new Error('Share sync failed');
    return await res.json();
  } catch (err) {
    console.warn('Failed recording share in database:', err.message);
    return null;
  }
}

export async function addCommentInDb(id, text, parentId = null) {
  try {
    const authHeaders = getAnonymousAuthHeaders();
    const res = await fetch(`${API_BASE}/echoes/${id}/comments`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify({ text, parentId })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to add comment');
    return { data: json, success: true };
  } catch (err) {
    console.warn('Failed adding comment to database:', err.message);
    return { error: err.message, success: false };
  }
}

export async function reportEchoInDb(id, reason, details = '') {
  try {
    const res = await fetch(`${API_BASE}/echoes/${id}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, details })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to submit report');
    return { success: true, message: json.message };
  } catch (err) {
    console.warn('Failed reporting echo to database:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Admin: Verify Guardian PIN
 */
export async function verifyAdminPin(pin) {
  try {
    const res = await fetch(`${API_BASE}/admin/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    if (res.status === 404) {
      return { ok: false, is404: true, status: 404, error: 'Render backend is updating. Deploying endpoints...' };
    }
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data: json, error: json?.error };
  } catch (err) {
    return { ok: false, isNetworkError: true, error: err.message };
  }
}

/**
 * Admin: Fetch moderation overview & stats
 */
export async function fetchAdminOverview(pin) {
  try {
    const res = await fetch(`${API_BASE}/admin/overview`, {
      headers: {
        'x-admin-key': pin
      }
    });
    if (res.status === 404) {
      return { ok: false, is404: true, status: 404, error: 'Render backend update pending deployment.' };
    }
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `HTTP ${res.status}`);
    }
    const data = await res.json().catch(() => null);
    if (!data) throw new Error('Invalid JSON response');
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Admin: Restore reported echo
 */
export async function restoreEchoAsAdmin(id, pin) {
  try {
    const res = await fetch(`${API_BASE}/admin/echoes/${id}/restore`, {
      method: 'POST',
      headers: {
        'x-admin-key': pin
      }
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, data: json, error: json?.error };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Admin: Dismiss reports on an echo
 */
export async function dismissReportAsAdmin(id, pin) {
  try {
    const res = await fetch(`${API_BASE}/admin/echoes/${id}/dismiss`, {
      method: 'POST',
      headers: {
        'x-admin-key': pin
      }
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, data: json, error: json?.error };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Admin: Fetch activity audit logs
 */
export async function fetchAdminLogs(pin, limit = 50) {
  try {
    const res = await fetch(`${API_BASE}/admin/logs?limit=${limit}`, {
      headers: {
        'x-admin-key': pin
      }
    });
    const json = await res.json().catch(() => []);
    return { ok: res.ok, data: json };
  } catch (err) {
    return { ok: false, error: err.message, data: [] };
  }
}

/**
 * System Health check
 */
export async function fetchHealthStatus() {
  try {
    const start = performance.now();
    const res = await fetch(`${API_BASE}/health`);
    const latency = Math.round(performance.now() - start);
    const data = await res.json().catch(() => null);
    return { ok: res.ok, latency, data };
  } catch (err) {
    return { ok: false, latency: null, error: err.message };
  }
}

/**
 * Admin: Permanently delete echo
 */
export async function deleteEchoAsAdmin(id, pin) {
  try {
    const res = await fetch(`${API_BASE}/admin/echoes/${id}`, {
      method: 'DELETE',
      headers: {
        'x-admin-key': pin
      }
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, data: json, error: json?.error };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Admin: Permanently delete comment
 */
export async function deleteCommentAsAdmin(id, pin) {
  try {
    const res = await fetch(`${API_BASE}/admin/comments/${id}`, {
      method: 'DELETE',
      headers: {
        'x-admin-key': pin
      }
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, data: json, error: json?.error };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Real-Time Active Souls (Accurate Presence Tracking)
 * Generates an anonymous, cryptographically secure random session UUID.
 * Stored in localStorage so multiple tabs & windows in the same browser
 * share the identical identifier (1 browser = 1 Active Soul, zero count inflation).
 * Page refresh reuses the session ID.
 * Zero PII, zero cookies, zero IP addresses recorded.
 */
export function getSoulSessionId() {
  if (typeof window === 'undefined') return 'soul_ssr_session';
  const STORAGE_KEY = 'echoes_soul_session_v3';
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    // Validate UUID format
    if (!id || typeof id !== 'string' || id.length < 10 || id.length > 64) {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        id = crypto.randomUUID();
      } else {
        // Fallback for environments lacking crypto.randomUUID
        const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        id = `${s4()}${s4()}-${s4()}-4${s4().substr(0, 3)}-${s4()}-${s4()}${s4()}${s4()}`;
      }
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // In strict private mode when localStorage is denied
    return 'soul_guest_' + Math.random().toString(36).slice(2, 12);
  }
}

/**
 * Send heartbeat to refresh presence in TiDB Cloud
 * Returns accurate global count of active souls.
 */
export async function sendSoulHeartbeat() {
  const sessionId = getSoulSessionId();
  try {
    const res = await fetch(`${API_BASE}/presence/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      activeSouls: typeof data.activeSouls === 'number' ? data.activeSouls : null,
      updatedAt: data.updatedAt || null,
      status: data.status || 'live',
      isOnline: true
    };
  } catch (err) {
    return { activeSouls: null, status: 'offline', isOnline: false };
  }
}

/**
 * Fetch current real-time active souls count
 */
export async function fetchActiveSouls() {
  try {
    const res = await fetch(`${API_BASE}/presence`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      activeSouls: typeof data.activeSouls === 'number' ? data.activeSouls : null,
      updatedAt: data.updatedAt || null,
      status: data.status || 'live',
      isOnline: true
    };
  } catch (err) {
    return { activeSouls: null, status: 'offline', isOnline: false };
  }
}

/**
 * Gracefully notify backend when visitor departs (beacon on pagehide)
 */
export function sendSoulLeave() {
  if (typeof window === 'undefined') return;
  try {
    const sessionId = getSoulSessionId();
    const url = `${API_BASE}/presence/leave`;
    const payload = JSON.stringify({ sessionId });

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    } else {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      }).catch(() => {});
    }
  } catch {}
}

// -------------------------------------------------------------
// MY ECHO: Client Dashboard Service Methods
// Authenticated with anonymous headers, graceful offline fallback
// -------------------------------------------------------------

export async function syncAnonymousIdentityWithServer() {
  try {
    const { identityId, identitySecret } = getAnonymousIdentity();
    const res = await fetch(`${API_BASE}/my-echo/identity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identityId, identitySecret })
    });
    if (!res.ok) return { success: false };
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function recoverAnonymousIdentity(recoveryKey) {
  try {
    const res = await fetch(`${API_BASE}/my-echo/identity/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recoveryKey })
    });
    const data = await res.json();
    if (res.ok && data.success && data.identityId && data.identitySecret) {
      localStorage.setItem(STORAGE_KEY_IDENTITY, JSON.stringify({
        identityId: data.identityId,
        identitySecret: data.identitySecret,
        createdAt: Date.now()
      }));
      return { success: true, identityId: data.identityId };
    }
    return { success: false, error: data.error || 'Failed to restore identity' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export function resetAnonymousIdentity() {
  try {
    localStorage.removeItem(STORAGE_KEY_IDENTITY);
  } catch {}
  return getAnonymousIdentity();
}

export async function fetchMyEchoOverview() {
  try {
    const res = await fetch(`${API_BASE}/my-echo/overview`, {
      headers: getAnonymousAuthHeaders()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function fetchMyEchoPosts(page = 1, limit = 20) {
  try {
    const res = await fetch(`${API_BASE}/my-echo/posts?page=${page}&limit=${limit}`, {
      headers: getAnonymousAuthHeaders()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message, items: [] };
  }
}

export async function deleteMyEchoPost(id) {
  try {
    const res = await fetch(`${API_BASE}/my-echo/posts/${id}`, {
      method: 'DELETE',
      headers: getAnonymousAuthHeaders()
    });
    const data = await res.json();
    return { success: res.ok, ...data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function fetchMyEchoBookmarks() {
  try {
    const res = await fetch(`${API_BASE}/my-echo/bookmarks`, {
      headers: getAnonymousAuthHeaders()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message, items: [] };
  }
}

export async function addMyEchoBookmark(echoId) {
  try {
    const res = await fetch(`${API_BASE}/my-echo/bookmarks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAnonymousAuthHeaders()
      },
      body: JSON.stringify({ echoId })
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function removeMyEchoBookmark(echoId) {
  try {
    const res = await fetch(`${API_BASE}/my-echo/bookmarks/${echoId}`, {
      method: 'DELETE',
      headers: getAnonymousAuthHeaders()
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function fetchMyEchoComments(page = 1, limit = 50) {
  try {
    const res = await fetch(`${API_BASE}/my-echo/comments?page=${page}&limit=${limit}`, {
      headers: getAnonymousAuthHeaders()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message, items: [] };
  }
}

export async function deleteMyEchoComment(id) {
  try {
    const res = await fetch(`${API_BASE}/my-echo/comments/${id}`, {
      method: 'DELETE',
      headers: getAnonymousAuthHeaders()
    });
    const data = await res.json();
    return { success: res.ok, ...data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function fetchMyEchoReplies() {
  try {
    const res = await fetch(`${API_BASE}/my-echo/replies`, {
      headers: getAnonymousAuthHeaders()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message, items: [] };
  }
}

export async function fetchMyEchoNotifications() {
  try {
    const res = await fetch(`${API_BASE}/my-echo/notifications`, {
      headers: getAnonymousAuthHeaders()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message, unreadCount: 0, items: [] };
  }
}

export async function markMyEchoNotificationsRead(notificationIds = null) {
  try {
    const res = await fetch(`${API_BASE}/my-echo/notifications/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAnonymousAuthHeaders()
      },
      body: JSON.stringify({ notificationIds })
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

