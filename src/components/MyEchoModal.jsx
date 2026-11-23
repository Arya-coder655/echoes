import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  Feather,
  Bookmark,
  MessageSquare,
  CornerDownRight,
  Bell,
  Key,
  ShieldCheck,
  Trash2,
  ExternalLink,
  Share2,
  Copy,
  Check,
  Download,
  AlertTriangle,
  User,
  Eye,
  EyeOff,
  Sparkles,
  Plus,
  Clock,
  MessageCircle,
  Heart
} from 'lucide-react';
import {
  getAnonymousIdentity,
  generateRecoveryKey,
  fetchMyEchoOverview,
  fetchMyEchoPosts,
  deleteMyEchoPost,
  fetchMyEchoBookmarks,
  removeMyEchoBookmark,
  fetchMyEchoComments,
  deleteMyEchoComment,
  fetchMyEchoReplies,
  fetchMyEchoNotifications,
  markMyEchoNotificationsRead,
  recoverAnonymousIdentity,
  resetAnonymousIdentity
} from '../utils/api';
import { CATEGORIES, THEME_PALETTES } from '../data/initialEchoes';

export default function MyEchoModal({
  isOpen,
  onClose,
  onOpenComposer,
  onOpenComments,
  onOpenShare,
  onSelectEcho,
  onToast
}) {
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'bookmarks' | 'reflections' | 'replies' | 'notifications'
  const [overview, setOverview] = useState({
    totalPosts: 0,
    totalBookmarks: 0,
    totalReflections: 0,
    unreadNotifications: 0
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Tab data states
  const [posts, setPosts] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [reflections, setReflections] = useState([]);
  const [replies, setReplies] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Delete confirmation modal state
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: 'post' | 'comment', id, title }
  const [isDeleting, setIsDeleting] = useState(false);

  // Identity recovery & key state
  const [identity, setIdentity] = useState(() => getAnonymousIdentity());
  const [copiedId, setCopiedId] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryError, setRecoveryError] = useState(null);

  // Lock background scroll with scrollbar layout-shift compensation
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (deleteConfirm) {
          setDeleteConfirm(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, deleteConfirm]);

  // Load summary overview & active tab data
  const loadOverview = useCallback(async () => {
    try {
      const res = await fetchMyEchoOverview();
      if (res && res.success) {
        setOverview({
          totalPosts: res.totalPosts || 0,
          totalBookmarks: res.totalBookmarks || 0,
          totalReflections: res.totalReflections || 0,
          unreadNotifications: res.unreadNotifications || 0
        });
      }
    } catch (err) {
      console.warn('Overview fetch error:', err);
    }
  }, []);

  const loadTabData = useCallback(async (tab) => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'posts') {
        const res = await fetchMyEchoPosts(1, 50);
        setPosts(res.items || []);
        setOverview((prev) => ({ ...prev, totalPosts: res.total || (res.items || []).length }));
      } else if (tab === 'bookmarks') {
        const res = await fetchMyEchoBookmarks();
        setBookmarks(res.items || []);
        setOverview((prev) => ({ ...prev, totalBookmarks: (res.items || []).length }));
      } else if (tab === 'reflections') {
        const res = await fetchMyEchoComments(1, 50);
        setReflections(res.items || []);
        setOverview((prev) => ({ ...prev, totalReflections: res.total || (res.items || []).length }));
      } else if (tab === 'replies') {
        const res = await fetchMyEchoReplies();
        setReplies(res.items || []);
      } else if (tab === 'notifications') {
        const res = await fetchMyEchoNotifications();
        setNotifications(res.items || []);
        setOverview((prev) => ({ ...prev, unreadNotifications: res.unreadCount || 0 }));
      }
    } catch (err) {
      console.error(`Error loading tab data for ${tab}:`, err);
      setError('Could not connect to the sanctuary database. Showing local offline state.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIdentity(getAnonymousIdentity());
      loadOverview();
      loadTabData(activeTab);
    }
  }, [isOpen, activeTab, loadOverview, loadTabData]);

  // Handle deleting an Echo
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      if (deleteConfirm.type === 'post') {
        const res = await deleteMyEchoPost(deleteConfirm.id);
        if (res.success) {
          setPosts((prev) => prev.filter((p) => p.id !== deleteConfirm.id));
          setOverview((prev) => ({ ...prev, totalPosts: Math.max(0, prev.totalPosts - 1) }));
          onToast?.('Your Echo has been permanently erased from the sanctuary.');
        } else {
          onToast?.(res.error || 'Failed to delete Echo');
        }
      } else if (deleteConfirm.type === 'comment') {
        const res = await deleteMyEchoComment(deleteConfirm.id);
        if (res.success) {
          setReflections((prev) => prev.filter((r) => r.id !== deleteConfirm.id));
          setOverview((prev) => ({ ...prev, totalReflections: Math.max(0, prev.totalReflections - 1) }));
          onToast?.('Your reflection was removed.');
        } else {
          onToast?.(res.error || 'Failed to remove reflection');
        }
      }
    } catch (err) {
      onToast?.('Deletion failed: ' + err.message);
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  // Handle removing a bookmark
  const handleRemoveBookmark = async (echoId) => {
    try {
      const res = await removeMyEchoBookmark(echoId);
      if (res.success) {
        setBookmarks((prev) => prev.filter((b) => b.id !== echoId));
        setOverview((prev) => ({ ...prev, totalBookmarks: Math.max(0, prev.totalBookmarks - 1) }));
        onToast?.('Bookmark removed.');
      }
    } catch (err) {
      onToast?.('Could not remove bookmark: ' + err.message);
    }
  };

  // Handle marking notifications as read
  const handleMarkAllNotificationsRead = async () => {
    try {
      await markMyEchoNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setOverview((prev) => ({ ...prev, unreadNotifications: 0 }));
      onToast?.('All notifications marked as read.');
    } catch (err) {
      console.warn('Mark read error:', err);
    }
  };

  // Copy Recovery Key
  const recoveryKeyString = useMemo(() => {
    if (!identity?.identityId || !identity?.identitySecret) return '';
    return generateRecoveryKey(identity.identityId, identitySecretFallback(identity));
  }, [identity]);

  function identitySecretFallback(idObj) {
    return idObj.identitySecret || '';
  }

  const handleCopyRecoveryKey = () => {
    if (!recoveryKeyString) return;
    navigator.clipboard.writeText(recoveryKeyString);
    setCopiedKey(true);
    onToast?.('Recovery key copied to clipboard! Keep this safe.');
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleCopyId = () => {
    const rawId = identity?.identityId || '';
    if (!rawId) return;
    navigator.clipboard.writeText(rawId);
    setCopiedId(true);
    onToast?.('Anonymous ID copied to clipboard');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleDownloadKey = () => {
    const key = generateRecoveryKey();
    if (!key) return;
    const blob = new Blob([
      `ECHOES SANCTUARY — ANONYMOUS RECOVERY KEY\n` +
      `==========================================\n` +
      `Identity ID: ${identity?.identityId || 'anonymous'}\n` +
      `Recovery Key: ${key}\n` +
      `Exported: ${new Date().toISOString()}\n\n` +
      `KEEP THIS FILE PRIVATE.\n` +
      `Pasting this recovery key into My Echo on any browser will restore\n` +
      `your published Echoes, reflections, and bookmarks without passwords or email.`
    ], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `echoes-recovery-key-${(identity?.identityId || 'soul').slice(5, 13)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    onToast?.('Recovery key downloaded as a backup text file');
  };

  // Restore Identity from key
  const handleRestoreIdentity = async (e) => {
    e.preventDefault();
    if (!recoveryInput.trim()) return;
    setIsRecovering(true);
    setRecoveryError(null);
    try {
      const res = await recoverAnonymousIdentity(recoveryInput.trim());
      if (res.success) {
        setIdentity(getAnonymousIdentity());
        setRecoveryInput('');
        onToast?.('Anonymous identity successfully restored! Reconnecting your sanctuary space...');
        loadOverview();
        loadTabData(activeTab);
      } else {
        setRecoveryError(res.error || 'Could not verify recovery credentials.');
      }
    } catch (err) {
      setRecoveryError(err.message || 'Restoration failed');
    } finally {
      setIsRecovering(false);
    }
  };

  // Reset / Start Fresh
  const handleResetIdentity = () => {
    if (window.confirm('Are you sure you want to start a fresh anonymous identity? You will lose access to your current posts unless you saved your recovery key.')) {
      resetAnonymousIdentity();
      setIdentity(getAnonymousIdentity());
      onToast?.('Generated a fresh anonymous identity.');
      loadOverview();
      loadTabData('posts');
    }
  };

  // Helper: Category label & icon
  const getCategoryMeta = (catId) => {
    return CATEGORIES.find((c) => c.id === catId) || { label: catId || 'Sanctuary', icon: 'Sparkles' };
  };

  // Helper: Theme palette
  const getThemeMeta = (themeId) => {
    return THEME_PALETTES.find((t) => t.id === themeId) || THEME_PALETTES[0];
  };

  // Helper: Format time ago
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';
    const seconds = Math.floor((Date.now() - Number(timestamp)) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div
      className="composer-modal-backdrop my-echo-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-echo-title"
    >
      <div
        className="composer-modal-window my-echo-window"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. FIXED HEADER */}
        <div className="my-echo-header">
          <div className="my-echo-header-left">
            <div className="my-echo-avatar-ring">
              <User size={20} className="text-amber-400" />
            </div>
            <div>
              <div className="my-echo-title-row">
                <h2 id="my-echo-title" className="my-echo-title">My Echo</h2>
                <button
                  type="button"
                  className="my-echo-pill-anon"
                  onClick={handleCopyId}
                  title="Click to copy anonymous ID"
                >
                  <ShieldCheck size={12} className="text-emerald-400" />
                  <span>#{identity?.identityId ? identity.identityId.slice(5, 13) : 'anon'}</span>
                  {copiedId ? <Check size={11} className="text-emerald-300" /> : <Copy size={11} className="copy-anon-icon" />}
                </button>
              </div>
              <p className="my-echo-subtitle">
                Your private anonymous space in the sanctuary &middot; Zero PII &middot; Stored locally
              </p>
            </div>
          </div>

          <div className="my-echo-header-actions">
            <button
              type="button"
              onClick={() => setActiveTab('notifications')}
              className={`my-echo-key-btn ${activeTab === 'notifications' ? 'active-key' : ''}`}
              title="Backup & Restore Anonymous Identity"
              aria-label="Backup Identity"
            >
              <Key size={14} />
              <span className="my-echo-btn-text">Backup Key</span>
            </button>

            <button
              type="button"
              className="composer-close-btn"
              onClick={onClose}
              aria-label="Close My Echo"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 2. SUMMARY METRICS STRIP */}
        <div className="my-echo-metrics-strip">
          <div
            className={`metric-item ${activeTab === 'posts' ? 'metric-active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            <div className="metric-header-row">
              <Feather size={14} className="metric-icon metric-icon-posts" />
              <span className="metric-val">{overview.totalPosts}</span>
            </div>
            <span className="metric-label">Published</span>
            <span className="metric-sublabel">Your spoken echoes</span>
          </div>
          <div
            className={`metric-item ${activeTab === 'bookmarks' ? 'metric-active' : ''}`}
            onClick={() => setActiveTab('bookmarks')}
          >
            <div className="metric-header-row">
              <Bookmark size={14} className="metric-icon metric-icon-bookmarks" />
              <span className="metric-val">{overview.totalBookmarks}</span>
            </div>
            <span className="metric-label">Saved</span>
            <span className="metric-sublabel">Bookmarked echoes</span>
          </div>
          <div
            className={`metric-item ${activeTab === 'reflections' ? 'metric-active' : ''}`}
            onClick={() => setActiveTab('reflections')}
          >
            <div className="metric-header-row">
              <MessageSquare size={14} className="metric-icon metric-icon-reflections" />
              <span className="metric-val">{overview.totalReflections}</span>
            </div>
            <span className="metric-label">Reflections</span>
            <span className="metric-sublabel">Your shared thoughts</span>
          </div>
          <div
            className={`metric-item ${activeTab === 'replies' || activeTab === 'notifications' ? 'metric-active' : ''}`}
            onClick={() => setActiveTab('replies')}
          >
            <div className="metric-header-row">
              <div className="metric-val-notif">
                <Bell size={14} className="metric-icon metric-icon-notifs" />
                <span className="metric-val">{overview.unreadNotifications}</span>
                {overview.unreadNotifications > 0 && <span className="metric-dot-pulse" />}
              </div>
            </div>
            <span className="metric-label">Replies & Notices</span>
            <span className="metric-sublabel">Soul responses</span>
          </div>
        </div>

        {/* 3. STICKY TAB NAVIGATION BAR */}
        <div className="my-echo-tabs-bar">
          <button
            type="button"
            className={`my-echo-tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            <Feather size={14} />
            <span>My Posts</span>
            {overview.totalPosts > 0 && <span className="tab-counter">{overview.totalPosts}</span>}
          </button>

          <button
            type="button"
            className={`my-echo-tab-btn ${activeTab === 'bookmarks' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookmarks')}
          >
            <Bookmark size={14} />
            <span>Saved Echoes</span>
            {overview.totalBookmarks > 0 && <span className="tab-counter">{overview.totalBookmarks}</span>}
          </button>

          <button
            type="button"
            className={`my-echo-tab-btn ${activeTab === 'reflections' ? 'active' : ''}`}
            onClick={() => setActiveTab('reflections')}
          >
            <MessageSquare size={14} />
            <span>My Reflections</span>
            {overview.totalReflections > 0 && <span className="tab-counter">{overview.totalReflections}</span>}
          </button>

          <button
            type="button"
            className={`my-echo-tab-btn ${activeTab === 'replies' ? 'active' : ''}`}
            onClick={() => setActiveTab('replies')}
          >
            <CornerDownRight size={14} />
            <span>Replies</span>
            {overview.unreadNotifications > 0 && (
              <span className="tab-counter-unread">{overview.unreadNotifications} new</span>
            )}
          </button>

          <button
            type="button"
            className={`my-echo-tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <Bell size={14} />
            <span>Notifications & Key</span>
          </button>
        </div>

        {/* 4. SCROLLABLE TAB CONTENT BODY */}
        <div className="my-echo-body">
          {error && (
            <div className="my-echo-notice-banner warning">
              <AlertTriangle size={15} />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="my-echo-skeleton-container">
              <div className="my-echo-skeleton-card" />
              <div className="my-echo-skeleton-card" />
              <div className="my-echo-skeleton-card" />
            </div>
          ) : (
            <>
              {/* TAB 1: MY POSTS */}
              {activeTab === 'posts' && (
                <div className="my-echo-tab-pane">
                  {posts.length === 0 ? (
                    <div className="my-echo-empty-state">
                      <div className="empty-icon-circle">
                        <Feather size={24} className="text-amber-400" />
                      </div>
                      <h3>You haven't released an Echo yet</h3>
                      <p>Your words are welcome here. Speak what weighs on your chest anonymously.</p>
                      <button
                        type="button"
                        className="minimal-cta-btn empty-action-btn"
                        onClick={() => {
                          onClose();
                          onOpenComposer?.();
                        }}
                      >
                        <Plus size={16} />
                        <span>Release an Echo</span>
                      </button>
                    </div>
                  ) : (
                    <div className="my-echo-cards-grid">
                      {posts.map((post) => {
                        const catMeta = getCategoryMeta(post.category);
                        const themeMeta = getThemeMeta(post.themeId);
                        const isUnderReview = post.status === 'under_review';

                        return (
                          <div
                            key={post.id}
                            className={`my-echo-card ${isUnderReview ? 'card-under-review' : ''}`}
                            style={{
                              borderLeft: `3px solid ${themeMeta.color}`
                            }}
                          >
                            <div className="my-card-header">
                              <div className="my-card-tags">
                                <span className="cat-pill-small">
                                  {catMeta.label}
                                </span>
                                <span className="recipient-tag">
                                  {post.name || 'To: The Universe'}
                                </span>
                              </div>
                              <div className="my-card-time-status">
                                {isUnderReview ? (
                                  <span className="status-badge-review">
                                    <AlertTriangle size={11} />
                                    <span>Under Review</span>
                                  </span>
                                ) : (
                                  <span className="status-badge-active">
                                    <span className="status-dot" />
                                    <span>Active</span>
                                  </span>
                                )}
                                <span className="timestamp-text">
                                  <Clock size={11} />
                                  <span>{formatTimeAgo(post.timestamp)}</span>
                                </span>
                              </div>
                            </div>

                            <p className="my-card-message">
                              {post.message}
                            </p>

                            {post.image && (
                              <div className="my-card-image-wrap">
                                <img src={post.image} alt="Memory attachment" loading="lazy" />
                              </div>
                            )}

                            <div className="my-card-footer">
                              <div className="my-card-stats">
                                <span className="stat-pill" title={`${post.likes} heartbeats`}>
                                  <Heart size={13} className="text-rose-400" />
                                  <span>{post.likes}</span>
                                </span>
                                <span className="stat-pill" title={`${post.comments?.length || 0} reflections`}>
                                  <MessageCircle size={13} className="text-cyan-400" />
                                  <span>{post.comments?.length || 0}</span>
                                </span>
                              </div>

                              <div className="my-card-actions">
                                <button
                                  type="button"
                                  className="card-action-btn"
                                  onClick={() => {
                                    onClose();
                                    onSelectEcho?.(post.id);
                                  }}
                                  title="View in feed"
                                >
                                  <ExternalLink size={13} />
                                  <span>View</span>
                                </button>

                                <button
                                  type="button"
                                  className="card-action-btn"
                                  onClick={() => {
                                    onClose();
                                    onOpenComments?.(post);
                                  }}
                                  title="Read reflections"
                                >
                                  <MessageSquare size={13} />
                                  <span>Reflect</span>
                                </button>

                                <button
                                  type="button"
                                  className="card-action-btn"
                                  onClick={() => {
                                    onOpenShare?.(post);
                                  }}
                                  title="Share Echo"
                                >
                                  <Share2 size={13} />
                                </button>

                                <button
                                  type="button"
                                  className="card-action-btn action-delete"
                                  onClick={() => setDeleteConfirm({ type: 'post', id: post.id, title: post.message.slice(0, 50) + '...' })}
                                  title="Erase your Echo permanently"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SAVED ECHOES (BOOKMARKS) */}
              {activeTab === 'bookmarks' && (
                <div className="my-echo-tab-pane">
                  {bookmarks.length === 0 ? (
                    <div className="my-echo-empty-state">
                      <div className="empty-icon-circle">
                        <Bookmark size={24} className="text-sky-400" />
                      </div>
                      <h3>No saved Echoes yet</h3>
                      <p>Echoes that touch your heart can be saved here. Click the bookmark ribbon on any card in the sanctuary.</p>
                      <button
                        type="button"
                        className="minimal-cta-btn empty-action-btn"
                        onClick={onClose}
                      >
                        <Sparkles size={16} />
                        <span>Explore Whispers</span>
                      </button>
                    </div>
                  ) : (
                    <div className="my-echo-cards-grid">
                      {bookmarks.map((bm) => {
                        const catMeta = getCategoryMeta(bm.category);
                        const themeMeta = getThemeMeta(bm.themeId);

                        return (
                          <div
                            key={bm.id}
                            className="my-echo-card"
                            style={{
                              borderLeft: `3px solid ${themeMeta.color}`
                            }}
                          >
                            <div className="my-card-header">
                              <div className="my-card-tags">
                                <span className="cat-pill-small">
                                  {catMeta.label}
                                </span>
                                <span className="recipient-tag">
                                  {bm.name || 'Anonymous'}
                                </span>
                              </div>
                              <span className="timestamp-text">
                                <Clock size={11} />
                                <span>Saved {formatTimeAgo(bm.savedAt || bm.timestamp)}</span>
                              </span>
                            </div>

                            <p className="my-card-message">
                              {bm.message}
                            </p>

                            <div className="my-card-footer">
                              <div className="my-card-stats">
                                <span className="stat-pill">
                                  <Heart size={13} className="text-rose-400" />
                                  <span>{bm.likes || 0}</span>
                                </span>
                              </div>

                              <div className="my-card-actions">
                                <button
                                  type="button"
                                  className="card-action-btn"
                                  onClick={() => {
                                    onClose();
                                    onSelectEcho?.(bm.id);
                                  }}
                                >
                                  <ExternalLink size={13} />
                                  <span>Open Echo</span>
                                </button>

                                <button
                                  type="button"
                                  className="card-action-btn action-delete"
                                  onClick={() => handleRemoveBookmark(bm.id)}
                                  title="Remove from saved"
                                >
                                  <Trash2 size={13} />
                                  <span>Remove</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: MY REFLECTIONS */}
              {activeTab === 'reflections' && (
                <div className="my-echo-tab-pane">
                  {reflections.length === 0 ? (
                    <div className="my-echo-empty-state">
                      <div className="empty-icon-circle">
                        <MessageSquare size={24} className="text-cyan-400" />
                      </div>
                      <h3>No reflections written yet</h3>
                      <p>Your reflections will find their place here. Offer comforting words to strangers across the walls.</p>
                      <button
                        type="button"
                        className="minimal-cta-btn empty-action-btn"
                        onClick={onClose}
                      >
                        <MessageSquare size={16} />
                        <span>Read Whispers</span>
                      </button>
                    </div>
                  ) : (
                    <div className="my-echo-cards-grid">
                      {reflections.map((ref) => (
                        <div key={ref.id} className="my-echo-card reflection-card">
                          <div className="reflection-context">
                            <CornerDownRight size={13} className="text-amber-400" />
                            <span>
                              Reflected on whisper to <strong>{ref.echoRecipient}</strong>: &ldquo;{ref.echoSnippet}...&rdquo;
                            </span>
                          </div>

                          <p className="my-card-message reflection-text">
                            &ldquo;{ref.text}&rdquo;
                          </p>

                          <div className="my-card-footer">
                            <span className="timestamp-text">
                              <Clock size={11} />
                              <span>{formatTimeAgo(ref.timestamp)}</span>
                            </span>

                            <div className="my-card-actions">
                              <button
                                type="button"
                                className="card-action-btn"
                                onClick={() => {
                                  onClose();
                                  onOpenComments?.({ id: ref.echoId, name: ref.echoRecipient });
                                }}
                              >
                                <ExternalLink size={13} />
                                <span>View Conversation</span>
                              </button>

                              <button
                                type="button"
                                className="card-action-btn action-delete"
                                onClick={() => setDeleteConfirm({ type: 'comment', id: ref.id, title: ref.text.slice(0, 50) + '...' })}
                                title="Delete this reflection"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: REPLIES */}
              {activeTab === 'replies' && (
                <div className="my-echo-tab-pane">
                  {replies.length === 0 ? (
                    <div className="my-echo-empty-state">
                      <div className="empty-icon-circle">
                        <CornerDownRight size={24} className="text-emerald-400" />
                      </div>
                      <h3>Your Echoes are quiet for now</h3>
                      <p>Replies will appear here when a stranger comments on your published whispers.</p>
                      <button
                        type="button"
                        className="minimal-cta-btn empty-action-btn"
                        onClick={() => {
                          onClose();
                          onOpenComposer?.();
                        }}
                      >
                        <Plus size={16} />
                        <span>Share an Unspoken Word</span>
                      </button>
                    </div>
                  ) : (
                    <div className="my-echo-cards-grid">
                      {replies.map((rep) => (
                        <div key={rep.id} className={`my-echo-card ${!rep.isRead ? 'card-unread' : ''}`}>
                          <div className="my-card-header">
                            <div className="reply-author-row">
                              {!rep.isRead && <span className="reply-unread-dot" title="New unread reply" />}
                              <span className="reply-author-label">Stranger replied:</span>
                            </div>
                            <span className="timestamp-text">
                              <Clock size={11} />
                              <span>{formatTimeAgo(rep.replyTime)}</span>
                            </span>
                          </div>

                          <p className="my-card-message reply-body-text">
                            &ldquo;{rep.replyText}&rdquo;
                          </p>

                          <div className="reply-original-context">
                            <span>In response to your whisper: <em>&ldquo;{rep.echoSnippet}...&rdquo;</em></span>
                          </div>

                          <div className="my-card-footer">
                            <div />
                            <button
                              type="button"
                              className="card-action-btn action-primary"
                              onClick={() => {
                                onClose();
                                onOpenComments?.({ id: rep.echoId, name: rep.echoRecipient });
                              }}
                            >
                              <MessageSquare size={13} />
                              <span>Open Conversation</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: NOTIFICATIONS & IDENTITY KEY */}
              {activeTab === 'notifications' && (
                <div className="my-echo-tab-pane">
                  {/* IDENTITY RECOVERY KEY CARD */}
                  <div className="my-echo-identity-card">
                    <div className="identity-card-header">
                      <div className="identity-shield-icon">
                        <ShieldCheck size={20} className="text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="identity-title">Your Anonymous Identity & Recovery Key</h4>
                        <p className="identity-desc">
                          You do not have an account or password. Your activity is secured by a private cryptographic token stored inside your browser.
                        </p>
                      </div>
                    </div>

                    <div className="identity-key-box">
                      <div className="key-display-row">
                        <div className="key-code-field">
                          <Key size={14} className="text-amber-400" />
                          <span className="key-value-text">
                            {showKey ? recoveryKeyString : '••••••••••••••••••••••••••••••••••••••••••••••••'}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="key-action-icon-btn"
                          onClick={() => setShowKey(!showKey)}
                          title={showKey ? 'Hide key' : 'Reveal key'}
                        >
                          {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                        <button
                          type="button"
                          className="key-action-icon-btn"
                          onClick={handleCopyRecoveryKey}
                          title="Copy recovery key"
                        >
                          {copiedKey ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                        </button>
                        <button
                          type="button"
                          className="key-action-icon-btn"
                          onClick={handleDownloadKey}
                          title="Download key backup file (.txt)"
                        >
                          <Download size={15} />
                        </button>
                      </div>

                      <p className="key-caution-text">
                        <strong>Important:</strong> If you clear browser cache or use another device, pasting this recovery key will restore your published Echoes and saved bookmarks. Never share this key publicly.
                      </p>
                    </div>

                    {/* RESTORE IDENTITY ACCORDION */}
                    <div className="identity-restore-section">
                      <h5 className="restore-title">Switch / Restore Identity on This Device</h5>
                      <form onSubmit={handleRestoreIdentity} className="restore-form">
                        <input
                          type="text"
                          className="restore-input"
                          placeholder="Paste ECHO-REC-... key here"
                          value={recoveryInput}
                          onChange={(e) => setRecoveryInput(e.target.value)}
                        />
                        <button
                          type="submit"
                          className="restore-btn"
                          disabled={isRecovering || !recoveryInput.trim()}
                        >
                          {isRecovering ? 'Restoring...' : 'Restore Identity'}
                        </button>
                      </form>
                      {recoveryError && (
                        <p className="restore-error-text">{recoveryError}</p>
                      )}
                    </div>

                    <div className="identity-footer-row">
                      <span className="identity-session-date">
                        Identity initialized: {new Date(identity?.createdAt || Date.now()).toLocaleDateString()}
                      </span>
                      <button
                        type="button"
                        className="reset-identity-link"
                        onClick={handleResetIdentity}
                      >
                        Start Fresh (Reset Identity)
                      </button>
                    </div>
                  </div>

                  {/* NOTIFICATIONS SECTION */}
                  <div className="notifications-container">
                    <div className="notif-header-row">
                      <h4>Recent Activity & Moderation Notices</h4>
                      {notifications.some((n) => !n.isRead) && (
                        <button
                          type="button"
                          className="mark-read-btn"
                          onClick={handleMarkAllNotificationsRead}
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    {notifications.length === 0 ? (
                      <div className="my-echo-empty-state compact">
                        <Bell size={20} className="text-slate-500" />
                        <p>No activity notices yet.</p>
                      </div>
                    ) : (
                      <div className="notif-list">
                        {notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`notif-item ${!notif.isRead ? 'notif-unread' : ''}`}
                            onClick={() => {
                              if (notif.echoId) {
                                onClose();
                                onSelectEcho?.(notif.echoId);
                              }
                            }}
                          >
                            <div className="notif-icon-col">
                              {notif.type === 'echo_reply' ? (
                                <MessageCircle size={15} className="text-cyan-400" />
                              ) : notif.type === 'comment_reply' ? (
                                <CornerDownRight size={15} className="text-amber-400" />
                              ) : notif.type === 'comment_reaction' ? (
                                <Heart size={15} className="text-rose-400" />
                              ) : notif.type === 'comment_warmth' ? (
                                <Sparkles size={15} className="text-amber-300" />
                              ) : (
                                <ShieldCheck size={15} className="text-emerald-400" />
                              )}
                            </div>
                            <div className="notif-content-col">
                              <p className="notif-text">
                                {notif.type === 'echo_reply'
                                  ? `Stranger reflected: "${notif.snippet}"`
                                  : notif.type === 'comment_reply'
                                  ? `Stranger replied: "${notif.snippet}"`
                                  : notif.type === 'comment_reaction'
                                  ? notif.snippet
                                  : notif.type === 'comment_warmth'
                                  ? `Stranger sent warmth: "${notif.snippet}"`
                                  : notif.snippet}
                              </p>
                              <span className="notif-time">{formatTimeAgo(notif.createdAt)}</span>
                            </div>
                            {!notif.isRead && <span className="notif-unread-dot" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* DELETE CONFIRMATION DIALOG MODAL */}
        {deleteConfirm && (
          <div className="my-echo-delete-dialog-backdrop" onClick={() => setDeleteConfirm(null)}>
            <div className="my-echo-delete-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="delete-dialog-icon">
                <AlertTriangle size={24} className="text-rose-400" />
              </div>
              <h4 className="delete-dialog-title">
                {deleteConfirm.type === 'post' ? 'Erase Your Echo?' : 'Delete Reflection?'}
              </h4>
              <p className="delete-dialog-desc">
                {deleteConfirm.type === 'post'
                  ? 'This whisper will be permanently removed from the public sanctuary walls. All reflections and heartbeats will dissolve forever.'
                  : 'This reflection will be permanently removed from the conversation.'}
              </p>
              <div className="delete-dialog-snippet">
                &ldquo;{deleteConfirm.title}&rdquo;
              </div>
              <div className="delete-dialog-actions">
                <button
                  type="button"
                  className="dialog-cancel-btn"
                  onClick={() => setDeleteConfirm(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="dialog-confirm-btn"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Erasing...' : 'Yes, Erase Permanently'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
