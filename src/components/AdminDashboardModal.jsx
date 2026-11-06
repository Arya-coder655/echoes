import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  LogOut,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Search,
  MessageSquare,
  Heart,
  Share2,
  X,
  Eye,
  Clock,
  ExternalLink
} from 'lucide-react';
import {
  verifyAdminPin,
  fetchAdminOverview,
  restoreEchoAsAdmin,
  deleteEchoAsAdmin,
  deleteCommentAsAdmin
} from '../utils/api';

const SESSION_PIN_KEY = 'echoes_admin_pin';

export default function AdminDashboardModal({ isOpen, onClose, onToast, echoes = [] }) {
  const [pin, setPin] = useState(() => sessionStorage.getItem(SESSION_PIN_KEY) || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState('online'); // 'online' | 'pending_deploy'
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'all' | 'comments'
  const [overviewData, setOverviewData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionInProgress, setActionInProgress] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Load data function
  const loadOverview = useCallback(async (currentPin) => {
    setLoading(true);
    const res = await fetchAdminOverview(currentPin);
    setLoading(false);
    if (res.ok) {
      setOverviewData(res.data);
      setBackendStatus('online');
    } else if (res.is404) {
      setBackendStatus('pending_deploy');
    } else {
      onToast?.(res.error || 'Failed to refresh moderation data');
    }
  }, [onToast]);

  // Initial authentication check on modal open
  useEffect(() => {
    if (!isOpen) return;

    const savedPin = sessionStorage.getItem(SESSION_PIN_KEY);
    if (!savedPin) return;

    verifyAdminPin(savedPin).then((res) => {
      if (res.ok) {
        setIsAuthenticated(true);
        setPin(savedPin);
        setBackendStatus('online');
        loadOverview(savedPin);
      } else if (res.is404 && savedPin === 'arya2026') {
        setIsAuthenticated(true);
        setPin(savedPin);
        setBackendStatus('pending_deploy');
        loadOverview(savedPin);
      } else {
        sessionStorage.removeItem(SESSION_PIN_KEY);
        setIsAuthenticated(false);
      }
    });
  }, [isOpen, loadOverview]);

  // Keydown escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    const cleanPin = pinInput.trim();
    if (!cleanPin) return;

    setLoading(true);
    setAuthError('');
    const res = await verifyAdminPin(cleanPin);
    setLoading(false);

    if (res.ok) {
      sessionStorage.setItem(SESSION_PIN_KEY, cleanPin);
      setPin(cleanPin);
      setIsAuthenticated(true);
      setPinInput('');
      setBackendStatus('online');
      loadOverview(cleanPin);
      onToast?.('🛡️ Guardian access granted. Welcome back, Arya.');
    } else if (res.is404) {
      // If Render backend is still deploying, allow client entry if PIN matches
      if (cleanPin === 'arya2026') {
        sessionStorage.setItem(SESSION_PIN_KEY, cleanPin);
        setPin(cleanPin);
        setIsAuthenticated(true);
        setPinInput('');
        setBackendStatus('pending_deploy');
        loadOverview(cleanPin);
        onToast?.('🛡️ Guardian unlocked (Standby Mode). Deploying on Render.');
      } else {
        setAuthError('Incorrect Guardian key. Access denied.');
      }
    } else if (res.status === 401) {
      setAuthError('Incorrect Guardian key. Access denied.');
    } else {
      if (cleanPin === 'arya2026') {
        sessionStorage.setItem(SESSION_PIN_KEY, cleanPin);
        setPin(cleanPin);
        setIsAuthenticated(true);
        setPinInput('');
        setBackendStatus('pending_deploy');
        onToast?.('🛡️ Guardian unlocked.');
      } else {
        setAuthError(res.error || 'Incorrect Guardian key. Access denied.');
      }
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_PIN_KEY);
    setPin('');
    setIsAuthenticated(false);
    setOverviewData(null);
    onToast?.('Guardian portal locked.');
  };

  // Restore echo action
  const handleRestoreEcho = async (echoId) => {
    setActionInProgress(echoId);
    const res = await restoreEchoAsAdmin(echoId, pin);
    setActionInProgress(null);

    if (res.ok) {
      onToast?.(`Echo #${echoId} restored to sanctuary feed.`);
      loadOverview(pin);
    } else {
      onToast?.(res.error || 'Failed to restore echo');
    }
  };

  // Delete echo action
  const handleDeleteEcho = async (echoId) => {
    setActionInProgress(echoId);
    const res = await deleteEchoAsAdmin(echoId, pin);
    setActionInProgress(null);
    setConfirmDeleteId(null);

    if (res.ok) {
      onToast?.(`Echo #${echoId} permanently removed.`);
      loadOverview(pin);
    } else {
      onToast?.(res.error || 'Failed to delete echo');
    }
  };

  // Delete comment action
  const handleDeleteComment = async (commentId) => {
    setActionInProgress(commentId);
    const res = await deleteCommentAsAdmin(commentId, pin);
    setActionInProgress(null);
    setConfirmDeleteId(null);

    if (res.ok) {
      onToast?.('Reflection removed.');
      loadOverview(pin);
    } else {
      onToast?.(res.error || 'Failed to delete reflection');
    }
  };

  // Data fallback when overviewData is loading or pending render deploy
  const rawReportedList = overviewData?.reportedEchoes || echoes.filter((e) => e.reported || (e.report_count > 0));
  const rawEchoesList = overviewData?.recentEchoes || echoes;
  const rawCommentsList = overviewData?.recentComments || [];

  const totalEchoesVal = overviewData?.stats?.totalEchoes ?? echoes.length;
  const reportedCountVal = overviewData?.stats?.reportedCount ?? rawReportedList.length;
  const totalCommentsVal = overviewData?.stats?.totalComments ?? echoes.reduce((acc, e) => acc + (e.comments?.length || 0), 0);
  const totalLikesVal = overviewData?.stats?.totalLikes ?? echoes.reduce((acc, e) => acc + (e.likes || 0), 0);

  const reportedList = rawReportedList;
  const allWhispers = rawEchoesList.filter((echo) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (echo.id && echo.id.toLowerCase().includes(q)) ||
      (echo.name && echo.name.toLowerCase().includes(q)) ||
      (echo.message && echo.message.toLowerCase().includes(q)) ||
      (echo.category && echo.category.toLowerCase().includes(q))
    );
  });
  const recentComments = rawCommentsList.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.text && c.text.toLowerCase().includes(q)) ||
      (c.echoId && c.echoId.toLowerCase().includes(q)) ||
      (c.echoName && c.echoName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div 
        className="admin-modal-window"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-portal-title"
      >
        {/* Header */}
        <div className="admin-modal-header">
          <div className="admin-header-title-wrap">
            <div className="admin-title-icon-badge">
              <ShieldCheck size={22} className="text-amber-400" />
            </div>
            <div>
              <h3 id="admin-portal-title" className="admin-title">
                Sanctuary Guardian Portal
              </h3>
              <p className="admin-subtitle">
                Echo moderation, content oversight & sanctuary preservation
              </p>
            </div>
          </div>

          <div className="admin-header-actions">
            {isAuthenticated && (
              <>
                <button
                  type="button"
                  onClick={() => loadOverview(pin)}
                  className="admin-icon-btn"
                  title="Refresh data"
                  disabled={loading}
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="admin-icon-btn admin-logout-btn"
                  title="Lock Guardian Portal"
                >
                  <LogOut size={16} />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="admin-icon-btn admin-close-btn"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        {!isAuthenticated ? (
          /* Login Screen */
          <div className="admin-login-container">
            <div className="admin-login-card">
              <div className="admin-login-icon">
                <Lock size={32} />
              </div>
              <h4 className="admin-login-heading">Enter Guardian Secret Key</h4>
              <p className="admin-login-desc">
                Protected space for Sanctuary Guardians. Please enter your secret PIN to access the moderation console.
              </p>

              <form onSubmit={handleLogin} className="admin-login-form">
                <div className="admin-input-group">
                  <input
                    type="password"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="Enter Guardian PIN..."
                    className="admin-pin-input"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="admin-login-submit-btn"
                    disabled={loading || !pinInput.trim()}
                  >
                    {loading ? 'Verifying...' : 'Unlock'}
                  </button>
                </div>

                {authError && (
                  <p className="admin-login-error">
                    <AlertTriangle size={15} />
                    <span>{authError}</span>
                  </p>
                )}
              </form>
            </div>
          </div>
        ) : (
          /* Dashboard Content */
          <div className="admin-dashboard-body">
            {/* Notice if Render is still deploying latest endpoints */}
            {backendStatus === 'pending_deploy' && (
              <div className="admin-deploy-alert-banner">
                <AlertTriangle size={18} className="text-amber-400 shrink-0" />
                <div className="admin-deploy-alert-text">
                  <span>
                    <strong>Render Backend Updating:</strong> The new admin endpoints are pending deployment on Render. To activate live database sync, open your{' '}
                    <a
                      href="https://dashboard.render.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-deploy-link"
                    >
                      Render Dashboard <ExternalLink size={12} className="inline ml-0.5" />
                    </a>{' '}
                    and click <strong>"Manual Deploy" → "Deploy latest commit"</strong>.
                  </span>
                </div>
              </div>
            )}

            {/* Metric Overview Strip */}
            <div className="admin-metrics-grid">
              <div className="admin-metric-card">
                <span className="admin-metric-label">Total Whispers</span>
                <span className="admin-metric-val">{totalEchoesVal}</span>
              </div>
              <div className={`admin-metric-card ${reportedCountVal > 0 ? 'metric-alert' : ''}`}>
                <span className="admin-metric-label">Needs Review</span>
                <div className="admin-metric-val-flex">
                  <span>{reportedCountVal}</span>
                  {reportedCountVal > 0 && (
                    <ShieldAlert size={16} className="text-rose-400" />
                  )}
                </div>
              </div>
              <div className="admin-metric-card">
                <span className="admin-metric-label">Reflections</span>
                <span className="admin-metric-val">{totalCommentsVal}</span>
              </div>
              <div className="admin-metric-card">
                <span className="admin-metric-label">Total Empathy</span>
                <span className="admin-metric-val">{totalLikesVal} ❤️</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="admin-tabs-row">
              <div className="admin-tabs-list">
                <button
                  type="button"
                  className={`admin-tab-btn ${activeTab === 'queue' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('queue'); setSearchQuery(''); }}
                >
                  <ShieldAlert size={15} />
                  <span>Moderation Queue</span>
                  {reportedList.length > 0 && (
                    <span className="admin-tab-badge alert-badge">{reportedList.length}</span>
                  )}
                </button>
                <button
                  type="button"
                  className={`admin-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('all'); setSearchQuery(''); }}
                >
                  <Eye size={15} />
                  <span>All Whispers</span>
                  <span className="admin-tab-badge">{allWhispers.length}</span>
                </button>
                <button
                  type="button"
                  className={`admin-tab-btn ${activeTab === 'comments' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('comments'); setSearchQuery(''); }}
                >
                  <MessageSquare size={15} />
                  <span>Reflections</span>
                  <span className="admin-tab-badge">{recentComments.length}</span>
                </button>
              </div>

              {(activeTab === 'all' || activeTab === 'comments') && (
                <div className="admin-search-wrap">
                  <Search size={14} className="admin-search-icon" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={activeTab === 'all' ? 'Search whispers by id, text, author...' : 'Search reflections...'}
                    className="admin-search-input"
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')} className="admin-search-clear">
                      <X size={12} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Tab Panels */}
            <div className="admin-tab-content">
              {/* TAB 1: MODERATION QUEUE */}
              {activeTab === 'queue' && (
                <div className="admin-queue-view">
                  {reportedList.length === 0 ? (
                    <div className="admin-empty-state">
                      <CheckCircle2 size={40} className="text-emerald-400" />
                      <h4>The Sanctuary is Peaceful</h4>
                      <p>No whispers are currently reported or awaiting moderation review.</p>
                    </div>
                  ) : (
                    <div className="admin-cards-list">
                      {reportedList.map((echo) => (
                        <div key={echo.id} className="admin-review-card">
                          <div className="admin-review-top">
                            <div className="admin-review-meta">
                              <span className="admin-review-id">#{echo.id}</span>
                              <span className="admin-category-pill">{echo.category}</span>
                              <span className="admin-author-pill">{echo.name}</span>
                              <span className="admin-report-count-tag">
                                <ShieldAlert size={13} />
                                {echo.report_count || 1} {(echo.report_count || 1) === 1 ? 'report' : 'reports'}
                              </span>
                            </div>

                            <span className="admin-timestamp">
                              <Clock size={12} />
                              {echo.timestamp ? new Date(echo.timestamp).toLocaleDateString() : 'Recent'}
                            </span>
                          </div>

                          {/* Report Reasons Box */}
                          {echo.reports && echo.reports.length > 0 && (
                            <div className="admin-reasons-box">
                              <span className="admin-reasons-title">Reported reasons:</span>
                              <div className="admin-reasons-tags">
                                {echo.reports.map((r, i) => (
                                  <div key={r.id || i} className="admin-reason-item">
                                    <span className="admin-reason-badge">{r.reason}</span>
                                    {r.details && <span className="admin-reason-details">"{r.details}"</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Message Body */}
                          <div className="admin-review-message">
                            "{echo.message}"
                          </div>

                          {/* Image preview if any */}
                          {echo.image && (
                            <div className="admin-review-img-wrap">
                              <img src={echo.image} alt="Attached to echo" className="admin-review-img" />
                            </div>
                          )}

                          {/* Stats info */}
                          <div className="admin-review-stats">
                            <span><Heart size={12} /> {echo.likes || 0}</span>
                            <span><Share2 size={12} /> {echo.shares || 0}</span>
                          </div>

                          {/* Action Buttons */}
                          <div className="admin-review-actions">
                            <button
                              type="button"
                              onClick={() => handleRestoreEcho(echo.id)}
                              disabled={actionInProgress === echo.id}
                              className="admin-btn admin-btn-restore"
                              title="Dismiss reports and restore to public sanctuary"
                            >
                              <CheckCircle2 size={15} />
                              <span>{actionInProgress === echo.id ? 'Restoring...' : 'Approve & Restore to Feed'}</span>
                            </button>

                            {confirmDeleteId === echo.id ? (
                              <div className="admin-confirm-group">
                                <span className="admin-confirm-prompt">Erase permanently?</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEcho(echo.id)}
                                  className="admin-btn admin-btn-confirm-delete"
                                  disabled={actionInProgress === echo.id}
                                >
                                  Yes, Erase
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="admin-btn admin-btn-cancel"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(echo.id)}
                                disabled={actionInProgress === echo.id}
                                className="admin-btn admin-btn-delete"
                                title="Permanently delete from database"
                              >
                                <Trash2 size={15} />
                                <span>Permanently Erase</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ALL WHISPERS */}
              {activeTab === 'all' && (
                <div className="admin-all-view">
                  {allWhispers.length === 0 ? (
                    <div className="admin-empty-state">
                      <p>No whispers match your search.</p>
                    </div>
                  ) : (
                    <div className="admin-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>ID & Status</th>
                            <th>Category / To</th>
                            <th>Whisper Excerpt</th>
                            <th>Stats</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allWhispers.map((echo) => (
                            <tr key={echo.id} className={echo.reported ? 'row-reported' : ''}>
                              <td>
                                <div className="admin-cell-id">
                                  <span className="font-mono text-xs text-amber-300">#{echo.id}</span>
                                  {echo.reported ? (
                                    <span className="admin-tag-hidden">Hidden (Reported)</span>
                                  ) : (
                                    <span className="admin-tag-active">Active</span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <div className="admin-cell-meta">
                                  <span className="admin-category-pill text-xs">{echo.category}</span>
                                  <span className="text-xs opacity-70 truncate max-w-[130px] block">{echo.name}</span>
                                </div>
                              </td>
                              <td>
                                <p className="admin-table-snippet" title={echo.message}>
                                  {echo.message}
                                </p>
                              </td>
                              <td>
                                <div className="admin-cell-stats text-xs opacity-75">
                                  <span>❤️ {echo.likes || 0}</span>
                                  <span>🔄 {echo.shares || 0}</span>
                                </div>
                              </td>
                              <td>
                                <div className="admin-cell-actions">
                                  {echo.reported && (
                                    <button
                                      type="button"
                                      onClick={() => handleRestoreEcho(echo.id)}
                                      disabled={actionInProgress === echo.id}
                                      className="admin-mini-btn restore"
                                      title="Restore to feed"
                                    >
                                      Restore
                                    </button>
                                  )}

                                  {confirmDeleteId === echo.id ? (
                                    <div className="admin-confirm-inline">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteEcho(echo.id)}
                                        className="admin-mini-btn confirm-red"
                                      >
                                        Delete!
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="admin-mini-btn cancel"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(echo.id)}
                                      className="admin-mini-btn delete"
                                      title="Permanently erase echo"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: REFLECTIONS */}
              {activeTab === 'comments' && (
                <div className="admin-comments-view">
                  {recentComments.length === 0 ? (
                    <div className="admin-empty-state">
                      <p>No reflections recorded yet or matching search.</p>
                    </div>
                  ) : (
                    <div className="admin-cards-list">
                      {recentComments.map((c) => (
                        <div key={c.id} className="admin-comment-card">
                          <div className="admin-comment-header">
                            <span className="font-mono text-xs text-amber-300">
                              On Whisper #{c.echoId} {c.echoName && `(${c.echoName})`}
                            </span>
                            <span className="admin-timestamp text-xs opacity-60">
                              {c.timestamp ? new Date(c.timestamp).toLocaleString() : ''}
                            </span>
                          </div>

                          {c.echoSnippet && (
                            <div className="admin-comment-echo-quote">
                              Whisper: "{c.echoSnippet.slice(0, 100)}{c.echoSnippet.length > 100 ? '...' : ''}"
                            </div>
                          )}

                          <div className="admin-comment-text">
                            "{c.text}"
                          </div>

                          <div className="admin-comment-actions">
                            {confirmDeleteId === c.id ? (
                              <div className="admin-confirm-group">
                                <span className="admin-confirm-prompt">Remove this reflection?</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(c.id)}
                                  className="admin-btn admin-btn-confirm-delete"
                                  disabled={actionInProgress === c.id}
                                >
                                  Yes, Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="admin-btn admin-btn-cancel"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(c.id)}
                                className="admin-btn admin-btn-delete mini"
                              >
                                <Trash2 size={13} />
                                <span>Delete Reflection</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
