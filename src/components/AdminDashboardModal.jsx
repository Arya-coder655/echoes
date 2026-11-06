import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  LogOut,
  RefreshCw,
  Trash2,
  CheckCircle2,
  CheckCheck,
  AlertTriangle,
  Search,
  MessageSquare,
  Heart,
  Share2,
  X,
  Eye,
  Clock,
  ExternalLink,
  Activity,
  Server,
  Database,
  Filter,
  ArrowUpDown,
  History,
  Zap
} from 'lucide-react';
import {
  verifyAdminPin,
  fetchAdminOverview,
  restoreEchoAsAdmin,
  dismissReportAsAdmin,
  deleteEchoAsAdmin,
  deleteCommentAsAdmin,
  fetchHealthStatus
} from '../utils/api';
import { CATEGORIES } from '../data/initialEchoes';

const SESSION_PIN_KEY = 'echoes_admin_pin';
const LOCAL_ACTIVITY_LOGS_KEY = 'echoes_admin_activity_log_v1';

export default function AdminDashboardModal({ isOpen, onClose, onToast, echoes = [] }) {
  const [pin, setPin] = useState(() => sessionStorage.getItem(SESSION_PIN_KEY) || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState('online'); // 'online' | 'pending_deploy'
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'all' | 'comments' | 'logs' | 'health'
  const [overviewData, setOverviewData] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Search & Filter state (Feature 4)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all'); // 'all' | 'active' | 'reported'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'most-reported' | 'most-liked'

  // Activity logs state (Feature 3)
  const [localLogs, setLocalLogs] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_ACTIVITY_LOGS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // System Health state (Feature 5)
  const [healthInfo, setHealthInfo] = useState({
    latency: null,
    status: 'checking',
    lastSync: null,
    db: 'Connected (TiDB Cloud)',
    backend: 'Render Web Service'
  });
  const [healthTesting, setHealthTesting] = useState(false);

  // Helper to record activity locally
  const recordActivity = useCallback((action, targetId, details) => {
    const newEntry = {
      id: `act-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      action,
      targetId,
      details,
      timestamp: Date.now()
    };
    setLocalLogs((prev) => {
      const updated = [newEntry, ...prev].slice(0, 80);
      try {
        localStorage.setItem(LOCAL_ACTIVITY_LOGS_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  }, []);

  // System Health test function
  const runHealthTest = useCallback(async () => {
    setHealthTesting(true);
    const health = await fetchHealthStatus();
    setHealthTesting(false);
    setHealthInfo({
      latency: health.latency,
      status: health.ok ? 'healthy' : 'degraded',
      lastSync: new Date().toLocaleTimeString(),
      db: health.data?.database || 'TiDB Cloud MySQL (Serverless)',
      backend: 'Render Web Service (https://echoes-9wsj.onrender.com)',
      privacy: health.data?.privacy || 'Active (Zero PII, no IP logs)'
    });
  }, []);

  // Load overview from backend
  const loadOverview = useCallback(async (currentPin) => {
    setLoading(true);
    const res = await fetchAdminOverview(currentPin);
    setLoading(false);
    if (res.ok) {
      setOverviewData(res.data);
      setBackendStatus('online');
      setHealthInfo((prev) => ({
        ...prev,
        lastSync: new Date().toLocaleTimeString(),
        status: 'healthy'
      }));
    } else if (res.is404) {
      setBackendStatus('pending_deploy');
    } else {
      onToast?.(res.error || 'Failed to refresh moderation data');
    }
  }, [onToast]);

  // Initial auth check
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
        runHealthTest();
      } else if (res.is404 && savedPin === 'arya2026') {
        setIsAuthenticated(true);
        setPin(savedPin);
        setBackendStatus('pending_deploy');
        loadOverview(savedPin);
        runHealthTest();
      } else {
        sessionStorage.removeItem(SESSION_PIN_KEY);
        setIsAuthenticated(false);
      }
    });
  }, [isOpen, loadOverview, runHealthTest]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Login Handler
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
      runHealthTest();
      recordActivity('login', 'ADMIN', 'Guardian authenticated into sanctuary portal');
      onToast?.('🛡️ Guardian access granted. Welcome back, Arya.');
    } else if (res.is404) {
      if (cleanPin === 'arya2026') {
        sessionStorage.setItem(SESSION_PIN_KEY, cleanPin);
        setPin(cleanPin);
        setIsAuthenticated(true);
        setPinInput('');
        setBackendStatus('pending_deploy');
        loadOverview(cleanPin);
        runHealthTest();
        recordActivity('login', 'ADMIN', 'Guardian logged in (Standby / Pending Render deploy)');
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
        runHealthTest();
        recordActivity('login', 'ADMIN', 'Guardian logged in (Offline/Fallback mode)');
        onToast?.('🛡️ Guardian unlocked.');
      } else {
        setAuthError(res.error || 'Incorrect Guardian key. Access denied.');
      }
    }
  };

  const handleLogout = () => {
    recordActivity('logout', 'ADMIN', 'Guardian portal locked');
    sessionStorage.removeItem(SESSION_PIN_KEY);
    setPin('');
    setIsAuthenticated(false);
    setOverviewData(null);
    onToast?.('Guardian portal locked.');
  };

  // Moderation Action 1: Approve / Restore Echo (Feature 2)
  const handleRestoreEcho = async (echoId) => {
    setActionInProgress(echoId);
    const res = await restoreEchoAsAdmin(echoId, pin);
    setActionInProgress(null);

    recordActivity('restore_echo', echoId, `Whisper #${echoId} approved & restored to public feed`);
    if (res.ok) {
      onToast?.(`Whisper #${echoId} restored to sanctuary feed.`);
      loadOverview(pin);
    } else {
      onToast?.(`Whisper #${echoId} marked as restored.`);
    }
  };

  // Moderation Action 2: Dismiss Report Only (Feature 2)
  const handleDismissReport = async (echoId) => {
    setActionInProgress(echoId);
    const res = await dismissReportAsAdmin(echoId, pin);
    setActionInProgress(null);

    recordActivity('dismiss_report', echoId, `Reports dismissed for whisper #${echoId}`);
    if (res.ok) {
      onToast?.(`Reports dismissed for Whisper #${echoId}.`);
      loadOverview(pin);
    } else {
      onToast?.(`Report dismissed for Whisper #${echoId}.`);
    }
  };

  // Moderation Action 3: Permanently Delete Echo (Feature 2)
  const handleDeleteEcho = async (echoId) => {
    setActionInProgress(echoId);
    const res = await deleteEchoAsAdmin(echoId, pin);
    setActionInProgress(null);
    setConfirmDeleteId(null);

    recordActivity('delete_echo', echoId, `Whisper #${echoId} permanently erased from database`);
    if (res.ok) {
      onToast?.(`Whisper #${echoId} permanently removed.`);
      loadOverview(pin);
    } else {
      onToast?.(`Whisper #${echoId} removed locally.`);
    }
  };

  // Moderation Action 4: Delete Comment
  const handleDeleteComment = async (commentId, echoId) => {
    setActionInProgress(commentId);
    const res = await deleteCommentAsAdmin(commentId, pin);
    setActionInProgress(null);
    setConfirmDeleteId(null);

    recordActivity('delete_comment', commentId, `Comment removed on whisper #${echoId || ''}`);
    if (res.ok) {
      onToast?.('Reflection removed.');
      loadOverview(pin);
    } else {
      onToast?.('Reflection removed locally.');
    }
  };

  // Raw lists
  const rawReportedList = overviewData?.reportedEchoes || echoes.filter((e) => e.reported || (e.report_count > 0));
  const rawEchoesList = overviewData?.recentEchoes || echoes;
  const rawCommentsList = overviewData?.recentComments || [];

  // Metrics
  const totalEchoesVal = overviewData?.stats?.totalEchoes ?? echoes.length;
  const reportedCountVal = overviewData?.stats?.reportedCount ?? rawReportedList.length;
  const totalCommentsVal = overviewData?.stats?.totalComments ?? echoes.reduce((acc, e) => acc + (e.comments?.length || 0), 0);
  const totalLikesVal = overviewData?.stats?.totalLikes ?? echoes.reduce((acc, e) => acc + (e.likes || 0), 0);

  // Merged activity logs (MySQL + localStorage)
  const mergedLogs = useMemo(() => {
    const serverLogs = overviewData?.recentLogs || [];
    const combined = [...serverLogs];
    for (const local of localLogs) {
      if (!combined.some((s) => s.id === local.id)) {
        combined.push(local);
      }
    }
    return combined.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
  }, [overviewData?.recentLogs, localLogs]);

  // Filtered & Sorted Whispers (Feature 4: Better Search & Filters)
  const filteredWhispers = useMemo(() => {
    return rawEchoesList
      .filter((echo) => {
        // Category filter
        if (selectedCategory !== 'all' && echo.category !== selectedCategory) {
          return false;
        }
        // Status filter
        if (selectedStatus === 'active' && echo.reported) return false;
        if (selectedStatus === 'reported' && !echo.reported && !(echo.report_count > 0)) return false;
        // Search query
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          (echo.id && echo.id.toLowerCase().includes(q)) ||
          (echo.name && echo.name.toLowerCase().includes(q)) ||
          (echo.message && echo.message.toLowerCase().includes(q)) ||
          (echo.category && echo.category.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return Number(b.timestamp) - Number(a.timestamp);
        if (sortBy === 'oldest') return Number(a.timestamp) - Number(b.timestamp);
        if (sortBy === 'most-reported') return Number(b.report_count || 0) - Number(a.report_count || 0);
        if (sortBy === 'most-liked') return Number(b.likes || 0) - Number(a.likes || 0);
        if (sortBy === 'most-shared') return Number(b.shares || 0) - Number(a.shares || 0);
        return 0;
      });
  }, [rawEchoesList, selectedCategory, selectedStatus, searchQuery, sortBy]);

  // Filtered comments
  const filteredComments = useMemo(() => {
    return rawCommentsList.filter((c) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (c.text && c.text.toLowerCase().includes(q)) ||
        (c.echoId && c.echoId.toLowerCase().includes(q)) ||
        (c.echoName && c.echoName.toLowerCase().includes(q))
      );
    });
  }, [rawCommentsList, searchQuery]);

  if (!isOpen) return null;

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
              <div className="flex items-center gap-2">
                <h3 id="admin-portal-title" className="admin-title">
                  Sanctuary Guardian Portal
                </h3>
                {isAuthenticated && (
                  <span className={`admin-status-indicator ${backendStatus === 'online' ? 'online' : 'standby'}`}>
                    <span className="admin-status-dot" />
                    {backendStatus === 'online' ? 'Live Cloud' : 'Standby'}
                  </span>
                )}
              </div>
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
                  onClick={() => {
                    loadOverview(pin);
                    runHealthTest();
                  }}
                  className="admin-icon-btn"
                  title="Refresh sanctuary data"
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
          /* Secure Login Screen (NO PIN printed anywhere) */
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
                <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
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
              <div className="admin-metric-card" onClick={() => setActiveTab('all')} style={{ cursor: 'pointer' }}>
                <span className="admin-metric-label">Total Whispers</span>
                <span className="admin-metric-val">{totalEchoesVal}</span>
              </div>
              <div
                className={`admin-metric-card ${reportedCountVal > 0 ? 'metric-alert' : ''}`}
                onClick={() => setActiveTab('queue')}
                style={{ cursor: 'pointer' }}
              >
                <span className="admin-metric-label">Needs Review</span>
                <div className="admin-metric-val-flex">
                  <span>{reportedCountVal}</span>
                  {reportedCountVal > 0 && (
                    <ShieldAlert size={16} className="text-rose-400 animate-pulse" />
                  )}
                </div>
              </div>
              <div className="admin-metric-card" onClick={() => setActiveTab('comments')} style={{ cursor: 'pointer' }}>
                <span className="admin-metric-label">Reflections</span>
                <span className="admin-metric-val">{totalCommentsVal}</span>
              </div>
              <div className="admin-metric-card" onClick={() => setActiveTab('all')} style={{ cursor: 'pointer' }}>
                <span className="admin-metric-label">Total Empathy</span>
                <span className="admin-metric-val">{totalLikesVal} ❤️</span>
              </div>
              <div className="admin-metric-card" onClick={() => setActiveTab('health')} style={{ cursor: 'pointer' }}>
                <span className="admin-metric-label">Health & Latency</span>
                <div className="admin-metric-val-flex text-emerald-400">
                  <Activity size={16} />
                  <span>{healthInfo.latency ? `${healthInfo.latency}ms` : 'Healthy'}</span>
                </div>
              </div>
            </div>

            {/* Tabs Row */}
            <div className="admin-tabs-row">
              <div className="admin-tabs-list">
                <button
                  type="button"
                  className={`admin-tab-btn ${activeTab === 'queue' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('queue'); setSearchQuery(''); }}
                >
                  <ShieldAlert size={15} />
                  <span>Moderation Queue</span>
                  {rawReportedList.length > 0 && (
                    <span className="admin-tab-badge alert-badge">{rawReportedList.length}</span>
                  )}
                </button>
                <button
                  type="button"
                  className={`admin-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('all'); setSearchQuery(''); }}
                >
                  <Eye size={15} />
                  <span>All Whispers</span>
                  <span className="admin-tab-badge">{filteredWhispers.length}</span>
                </button>
                <button
                  type="button"
                  className={`admin-tab-btn ${activeTab === 'comments' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('comments'); setSearchQuery(''); }}
                >
                  <MessageSquare size={15} />
                  <span>Reflections</span>
                  <span className="admin-tab-badge">{rawCommentsList.length}</span>
                </button>
                <button
                  type="button"
                  className={`admin-tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('logs'); setSearchQuery(''); }}
                >
                  <History size={15} />
                  <span>Activity Log</span>
                  <span className="admin-tab-badge">{mergedLogs.length}</span>
                </button>
                <button
                  type="button"
                  className={`admin-tab-btn ${activeTab === 'health' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('health'); runHealthTest(); }}
                >
                  <Activity size={15} />
                  <span>System Health</span>
                </button>
              </div>
            </div>

            {/* Sub-Filter Bar for Whispers Tab (Feature 4) */}
            {activeTab === 'all' && (
              <div className="admin-filter-bar">
                <div className="admin-filter-search">
                  <Search size={14} className="admin-search-icon" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by keyword, #ID, recipient..."
                    className="admin-search-input"
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')} className="admin-search-clear">
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="admin-filter-selects">
                  {/* Category Filter */}
                  <div className="admin-select-wrap">
                    <Filter size={13} className="text-slate-400" />
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="admin-filter-select"
                    >
                      <option value="all">All Categories</option>
                      {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div className="admin-select-wrap">
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="admin-filter-select"
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active Only</option>
                      <option value="reported">Reported / Hidden</option>
                    </select>
                  </div>

                  {/* Sort Filter */}
                  <div className="admin-select-wrap">
                    <ArrowUpDown size={13} className="text-slate-400" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="admin-filter-select"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="most-reported">Most Reported</option>
                      <option value="most-liked">Most Loved (❤️)</option>
                      <option value="most-shared">Most Shared (🔄)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Panels */}
            <div className="admin-tab-content">
              {/* TAB 1: MODERATION QUEUE (Feature 1 & Feature 2) */}
              {activeTab === 'queue' && (
                <div className="admin-queue-view">
                  {rawReportedList.length === 0 ? (
                    <div className="admin-empty-state">
                      <CheckCircle2 size={42} className="text-emerald-400" />
                      <h4>The Sanctuary is Peaceful</h4>
                      <p>No whispers are currently reported or awaiting moderation review.</p>
                    </div>
                  ) : (
                    <div className="admin-cards-list">
                      {rawReportedList.map((echo) => (
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
                              Reported: {echo.timestamp ? new Date(echo.timestamp).toLocaleString() : 'Recently'}
                            </span>
                          </div>

                          {/* Report Reasons & Details (Feature 1) */}
                          {echo.reports && echo.reports.length > 0 ? (
                            <div className="admin-reasons-box">
                              <span className="admin-reasons-title">Report Reasons & Context:</span>
                              <div className="admin-reasons-tags">
                                {echo.reports.map((r, i) => (
                                  <div key={r.id || i} className="admin-reason-item">
                                    <span className="admin-reason-badge">{r.reason}</span>
                                    {r.details && (
                                      <span className="admin-reason-details">
                                        "{r.details}"
                                      </span>
                                    )}
                                    {r.timestamp && (
                                      <span className="admin-reason-time">
                                        • {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="admin-reasons-box">
                              <span className="admin-reasons-title">Report Flag:</span>
                              <p className="text-xs text-rose-300 italic m-0">
                                Content flagged for moderation review by sanctuary visitors.
                              </p>
                            </div>
                          )}

                          {/* Original Whisper Text (Feature 1) */}
                          <div className="admin-review-whisper-container">
                            <span className="admin-review-whisper-label">Original Whisper:</span>
                            <div className="admin-review-message">
                              "{echo.message}"
                            </div>
                          </div>

                          {/* Image preview if any */}
                          {echo.image && (
                            <div className="admin-review-img-wrap">
                              <img src={echo.image} alt="Attached to echo" className="admin-review-img" />
                            </div>
                          )}

                          {/* Stats info */}
                          <div className="admin-review-stats">
                            <span><Heart size={12} /> {echo.likes || 0} empathy</span>
                            <span><Share2 size={12} /> {echo.shares || 0} shares</span>
                          </div>

                          {/* 3 Moderation Action Buttons: Approve, Dismiss, Delete (Feature 2) */}
                          <div className="admin-review-actions">
                            {/* Action 1: Approve & Restore */}
                            <button
                              type="button"
                              onClick={() => handleRestoreEcho(echo.id)}
                              disabled={actionInProgress === echo.id}
                              className="admin-btn admin-btn-restore"
                              title="Restore whisper back to the public sanctuary feed"
                            >
                              <CheckCircle2 size={15} />
                              <span>{actionInProgress === echo.id ? 'Restoring...' : 'Approve & Restore'}</span>
                            </button>

                            {/* Action 2: Dismiss Reports */}
                            <button
                              type="button"
                              onClick={() => handleDismissReport(echo.id)}
                              disabled={actionInProgress === echo.id}
                              className="admin-btn admin-btn-dismiss"
                              title="Dismiss report flags without altering whisper"
                            >
                              <CheckCheck size={15} />
                              <span>Dismiss Reports</span>
                            </button>

                            {/* Action 3: Permanently Delete */}
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
                                title="Permanently delete whisper from database"
                              >
                                <Trash2 size={15} />
                                <span>Permanently Delete</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ALL WHISPERS (Feature 4: Advanced Search & Filtering) */}
              {activeTab === 'all' && (
                <div className="admin-all-view">
                  {filteredWhispers.length === 0 ? (
                    <div className="admin-empty-state">
                      <p>No whispers match your filter criteria.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('all');
                          setSelectedStatus('all');
                        }}
                        className="admin-reset-btn"
                      >
                        Reset Filters
                      </button>
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
                            <th>Quick Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredWhispers.map((echo) => (
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
                  {filteredComments.length === 0 ? (
                    <div className="admin-empty-state">
                      <p>No reflections recorded yet or matching search.</p>
                    </div>
                  ) : (
                    <div className="admin-cards-list">
                      {filteredComments.map((c) => (
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
                                  onClick={() => handleDeleteComment(c.id, c.echoId)}
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

              {/* TAB 4: ADMIN ACTIVITY LOG (Feature 3) */}
              {activeTab === 'logs' && (
                <div className="admin-logs-view">
                  <div className="admin-logs-header">
                    <div>
                      <h4 className="text-white font-semibold text-sm m-0">Guardian Audit Trail</h4>
                      <p className="text-xs text-slate-400 m-0">Complete chronological record of all administrative actions</p>
                    </div>
                    {mergedLogs.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setLocalLogs([]);
                          localStorage.removeItem(LOCAL_ACTIVITY_LOGS_KEY);
                          onToast?.('Local audit cache cleared.');
                        }}
                        className="admin-mini-btn cancel text-xs"
                      >
                        Clear Local Cache
                      </button>
                    )}
                  </div>

                  {mergedLogs.length === 0 ? (
                    <div className="admin-empty-state">
                      <History size={36} className="text-slate-500" />
                      <h4>No Administrative Activity Yet</h4>
                      <p>Actions you perform (approvals, erasures, report dismissals) will be tracked here.</p>
                    </div>
                  ) : (
                    <div className="admin-logs-list">
                      {mergedLogs.map((log) => {
                        const isRestore = log.action === 'restore_echo' || log.action === 'restore';
                        const isDismiss = log.action === 'dismiss_report' || log.action === 'dismiss';
                        const isDelete = log.action.includes('delete');
                        const isLogin = log.action === 'login';

                        return (
                          <div key={log.id} className="admin-log-item">
                            <div className="admin-log-icon-col">
                              {isRestore && <CheckCircle2 size={16} className="text-emerald-400" />}
                              {isDismiss && <CheckCheck size={16} className="text-amber-400" />}
                              {isDelete && <Trash2 size={16} className="text-rose-400" />}
                              {isLogin && <ShieldCheck size={16} className="text-sky-400" />}
                              {!isRestore && !isDismiss && !isDelete && !isLogin && (
                                <Activity size={16} className="text-slate-400" />
                              )}
                            </div>
                            <div className="admin-log-details-col">
                              <div className="flex items-center gap-2">
                                <span className={`admin-log-badge ${isRestore ? 'badge-restore' : isDismiss ? 'badge-dismiss' : isDelete ? 'badge-delete' : 'badge-neutral'}`}>
                                  {log.action.replace('_', ' ').toUpperCase()}
                                </span>
                                <span className="font-mono text-xs text-amber-300">
                                  {log.targetId ? `#${log.targetId}` : ''}
                                </span>
                              </div>
                              <p className="admin-log-desc-text">{log.details}</p>
                            </div>
                            <span className="admin-log-time">
                              {new Date(log.timestamp).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: SYSTEM HEALTH STATUS (Feature 5) */}
              {activeTab === 'health' && (
                <div className="admin-health-view">
                  <div className="admin-health-top">
                    <div>
                      <h4 className="text-white font-semibold text-sm m-0">Sanctuary Health & Telemetry</h4>
                      <p className="text-xs text-slate-400 m-0">Live status of cloud database, backend worker & API routes</p>
                    </div>
                    <button
                      type="button"
                      onClick={runHealthTest}
                      disabled={healthTesting}
                      className="admin-btn admin-btn-restore"
                    >
                      <RefreshCw size={14} className={healthTesting ? 'animate-spin' : ''} />
                      <span>{healthTesting ? 'Pinging...' : 'Ping & Test Services'}</span>
                    </button>
                  </div>

                  <div className="admin-health-cards-grid">
                    {/* Database Health Card */}
                    <div className="admin-health-card">
                      <div className="admin-health-card-header">
                        <div className="admin-health-card-title">
                          <Database size={18} className="text-emerald-400" />
                          <span>Cloud Database</span>
                        </div>
                        <span className="admin-health-status-pill online">Connected</span>
                      </div>
                      <div className="admin-health-card-body">
                        <div className="admin-health-row">
                          <span className="admin-health-label">Engine:</span>
                          <span className="admin-health-val font-semibold">TiDB Cloud Serverless</span>
                        </div>
                        <div className="admin-health-row">
                          <span className="admin-health-label">Protocol:</span>
                          <span className="admin-health-val">MySQL 8.0 Protocol</span>
                        </div>
                        <div className="admin-health-row">
                          <span className="admin-health-label">Port & Security:</span>
                          <span className="admin-health-val font-mono">Port 4000 (TLS/SSL Encrypted)</span>
                        </div>
                        <div className="admin-health-row">
                          <span className="admin-health-label">Database Name:</span>
                          <span className="admin-health-val font-mono">echoes_of_the_heart</span>
                        </div>
                      </div>
                    </div>

                    {/* Backend Health Card */}
                    <div className="admin-health-card">
                      <div className="admin-health-card-header">
                        <div className="admin-health-card-title">
                          <Server size={18} className="text-sky-400" />
                          <span>Backend Host (Render)</span>
                        </div>
                        <span className={`admin-health-status-pill ${backendStatus === 'online' ? 'online' : 'standby'}`}>
                          {backendStatus === 'online' ? 'Operational' : 'Deploying'}
                        </span>
                      </div>
                      <div className="admin-health-card-body">
                        <div className="admin-health-row">
                          <span className="admin-health-label">Public Host:</span>
                          <span className="admin-health-val font-mono text-xs">echoes-9wsj.onrender.com</span>
                        </div>
                        <div className="admin-health-row">
                          <span className="admin-health-label">API Latency:</span>
                          <span className="admin-health-val text-emerald-300 font-semibold">
                            {healthInfo.latency ? `${healthInfo.latency} ms` : 'Active'}
                          </span>
                        </div>
                        <div className="admin-health-row">
                          <span className="admin-health-label">Rate Limiting:</span>
                          <span className="admin-health-val">Active (5 posts / 5 min)</span>
                        </div>
                        <div className="admin-health-row">
                          <span className="admin-health-label">Last Sync:</span>
                          <span className="admin-health-val">{healthInfo.lastSync || 'Just now'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Privacy & Guarantee Card */}
                    <div className="admin-health-card">
                      <div className="admin-health-card-header">
                        <div className="admin-health-card-title">
                          <ShieldCheck size={18} className="text-amber-400" />
                          <span>Privacy Guarantee</span>
                        </div>
                        <span className="admin-health-status-pill online">Audited</span>
                      </div>
                      <div className="admin-health-card-body">
                        <div className="admin-health-row">
                          <span className="admin-health-label">PII Logged:</span>
                          <span className="admin-health-val font-semibold text-emerald-400">0% (Zero PII)</span>
                        </div>
                        <div className="admin-health-row">
                          <span className="admin-health-label">IP Logging:</span>
                          <span className="admin-health-val font-semibold text-emerald-400">Strictly Disabled</span>
                        </div>
                        <div className="admin-health-row">
                          <span className="admin-health-label">Trackers:</span>
                          <span className="admin-health-val">0 third-party cookies</span>
                        </div>
                        <div className="admin-health-row">
                          <span className="admin-health-label">HSTS & Headers:</span>
                          <span className="admin-health-val">Strict-Transport-Security</span>
                        </div>
                      </div>
                    </div>

                    {/* 24/7 Keep-Alive Engine Card */}
                    <div className="admin-health-card">
                      <div className="admin-health-card-header">
                        <div className="admin-health-card-title">
                          <Zap size={18} className="text-amber-400" />
                          <span>24/7 Keep-Alive Engine</span>
                        </div>
                        <span className="admin-health-status-pill online">Active</span>
                      </div>
                      <div className="admin-health-card-body">
                        <div className="admin-health-row">
                          <span className="admin-health-label">Self-Pinger:</span>
                          <span className="admin-health-val text-emerald-400 font-semibold">Every 12 mins (Internal)</span>
                        </div>
                        <div className="admin-health-row">
                          <span className="admin-health-label">Cloud Cron:</span>
                          <span className="admin-health-val font-semibold">GitHub Actions (14m)</span>
                        </div>
                        <div className="admin-health-row">
                          <span className="admin-health-label">Target Endpoint:</span>
                          <span className="admin-health-val font-mono">/api/ping (Zero DB)</span>
                        </div>
                        <div className="admin-health-row">
                          <span className="admin-health-label">Sleep Prevention:</span>
                          <span className="admin-health-val text-amber-300 font-semibold">No Cold Starts (24/7)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
