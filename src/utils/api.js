/**
 * Echoes API Client Service
 * Connects the React front-end directly to the SQLite backend API.
 * Includes graceful offline fallback to localStorage.
 */

const RENDER_BACKEND_URL = 'https://echoes-9wsj.onrender.com';
const API_BASE = (typeof window !== 'undefined' && window.location.hostname.includes('github.io'))
  ? `${RENDER_BACKEND_URL}/api`
  : '/api';

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
    const res = await fetch(`${API_BASE}/echoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

export async function addCommentInDb(id, text) {
  try {
    const res = await fetch(`${API_BASE}/echoes/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
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
    const json = await res.json();
    return { ok: res.ok, data: json };
  } catch (err) {
    return { ok: false, error: err.message };
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
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
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
    const json = await res.json();
    return { ok: res.ok, data: json };
  } catch (err) {
    return { ok: false, error: err.message };
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
    const json = await res.json();
    return { ok: res.ok, data: json };
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
    const json = await res.json();
    return { ok: res.ok, data: json };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
