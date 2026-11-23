import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  Send,
  MessageCircle,
  Heart,
  User,
  CornerDownRight,
  Smile,
  Image as ImageIcon,
  Share2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Flag,
  Flame,
  ArrowLeft,
  Loader2,
  MoreHorizontal,
  Trash2
} from 'lucide-react';
import EmojiGifPicker from './EmojiGifPicker';
import CommentShareModal from './CommentShareModal';
import CommentReportModal from './CommentReportModal';
import {
  addCommentInDb,
  toggleCommentReactionInDb,
  deleteCommentInDb,
  reportCommentInDb,
  fetchCommentsForEcho,
  getAnonymousIdentity
} from '../utils/api';

export const EMOTIONAL_REACTIONS = [
  { id: 'heart', emoji: '❤️', label: 'Heart', desc: 'This touched me' },
  { id: 'hug', emoji: '🫂', label: 'Hug', desc: 'Sending comfort' },
  { id: 'moved', emoji: '🥺', label: 'Moved', desc: 'I felt this' },
  { id: 'hope', emoji: '✨', label: 'Hope', desc: 'I wish you healing' },
  { id: 'peace', emoji: '🤍', label: 'Peace', desc: 'Sending warmth' },
  { id: 'powerful', emoji: '🔥', label: 'Powerful', desc: 'These words matter' },
  { id: 'gratitude', emoji: '🙏', label: 'Gratitude', desc: 'Thank you for sharing' }
];

const QUICK_WARMTH_PILLS = [
  { text: "You're not alone.", emoji: '🫂' },
  { text: 'Sending you a warm hug.', emoji: '✨' },
  { text: 'I hope tomorrow feels lighter.', emoji: '🤍' },
  { text: 'Your words matter to someone.', emoji: '🔥' },
  { text: 'Someone hears you right now.', emoji: '🕯️' }
];

const CRISIS_KEYWORDS = [
  'kill myself', 'suicide', 'end my life', 'want to die',
  'hurt myself', 'self harm', 'hang myself', 'no reason to live'
];

function formatTime(timestamp) {
  if (!timestamp) return 'Recently';
  const diffSec = Math.floor((Date.now() - Number(timestamp)) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  return `${diffDays}d ago`;
}

/**
 * Organizes comments into tree hierarchy with collapse states and depth tracking.
 */
function buildCommentTree(comments) {
  if (!comments || !Array.isArray(comments)) return [];

  const map = new Map();
  const roots = [];

  const normalized = comments.map((c) => ({
    ...c,
    id: String(c.id || c.time),
    parentId: c.parentId || c.parent_id || null,
    reactionsCount: Number(c.reactionsCount || c.likes || 0),
    reactionBreakdown: c.reactionBreakdown || {},
    userReaction: c.userReaction || null,
    isWarmth: Boolean(c.isWarmth),
    isDeleted: Boolean(c.isDeleted || c.is_deleted),
    isOwn: Boolean(c.isOwn),
    authorId: c.authorId || c.author_id || null,
    gifUrl: c.gifUrl || c.gif_url || null,
    replies: []
  }));

  normalized.forEach((c) => map.set(c.id, c));

  normalized.forEach((c) => {
    if (c.parentId && map.has(String(c.parentId))) {
      map.get(String(c.parentId)).replies.push(c);
    } else {
      roots.push(c);
    }
  });

  return roots;
}

export default function CommentsDrawer({ isOpen, echo, onClose, onAddComment, onToast, onCommentDeleted }) {
  const [commentsList, setCommentsList] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); // { id, text, author }
  const [attachedGif, setAttachedGif] = useState(null);
  const [sortBy, setSortBy] = useState('relevance'); // 'relevance' | 'newest' | 'oldest' | 'loved'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState('emoji');
  const [activeReactionMenuId, setActiveReactionMenuId] = useState(null);
  const [activeOptionsMenuId, setActiveOptionsMenuId] = useState(null);
  const [confirmDeleteComment, setConfirmDeleteComment] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [collapsedThreads, setCollapsedThreads] = useState(new Set());
  const [focusedThreadRootId, setFocusedThreadRootId] = useState(null);
  const [shareModalComment, setShareModalComment] = useState(null);
  const [reportModalComment, setReportModalComment] = useState(null);
  const [highlightedCommentId, setHighlightedCommentId] = useState(null);
  const [burstCommentId, setBurstCommentId] = useState(null);

  const [authoredCommentIds, setAuthoredCommentIds] = useState(() => {
    try {
      const raw = localStorage.getItem('echoes_my_authored_comments');
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  const markCommentAuthored = (id) => {
    setAuthoredCommentIds((prev) => {
      const next = new Set(prev);
      next.add(String(id));
      try {
        localStorage.setItem('echoes_my_authored_comments', JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  const inputRef = useRef(null);
  const drawerListRef = useRef(null);
  const longPressTimerRef = useRef(null);

  // Re-fetch comments with server authentication and sorting
  const refreshComments = useCallback(async () => {
    if (!echo?.id) return;
    try {
      const res = await fetchCommentsForEcho(echo.id, sortBy);
      if (res && res.data) {
        setCommentsList(res.data);
      }
    } catch (err) {
      console.warn('Could not refresh reflections:', err);
    }
  }, [echo?.id, sortBy]);

  useEffect(() => {
    if (isOpen && echo?.id) {
      refreshComments();
    }
  }, [isOpen, echo?.id, sortBy, refreshComments]);

  // Sync initial comments from props
  useEffect(() => {
    if (echo?.comments) {
      setCommentsList(echo.comments);
    }
  }, [echo]);

  // Deep Link Handling: Check URL for target comment
  useEffect(() => {
    if (!isOpen || !echo) return;

    if (typeof window !== 'undefined' && window.location.hash) {
      const match = window.location.hash.match(/comment=([^&]+)/);
      if (match && match[1]) {
        const targetId = decodeURIComponent(match[1]);
        setHighlightedCommentId(targetId);

        // Auto-expand all threads so target comment is visible
        setCollapsedThreads(new Set());

        setTimeout(() => {
          const el = document.getElementById(`comment-${targetId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);

        // Clear highlight pulse after 4s
        const t = setTimeout(() => setHighlightedCommentId(null), 4000);
        return () => clearTimeout(t);
      }
    }
  }, [isOpen, echo]);

  // Check for crisis phrases
  const detectedCrisis = useMemo(() => {
    const lower = commentText.toLowerCase();
    return CRISIS_KEYWORDS.some((kw) => lower.includes(kw));
  }, [commentText]);

  // Comment Tree
  const commentTree = useMemo(() => {
    return buildCommentTree(commentsList);
  }, [commentsList]);

  // Focused thread tree
  const displayedTree = useMemo(() => {
    if (focusedThreadRootId) {
      return commentTree.filter((c) => c.id === focusedThreadRootId);
    }
    return commentTree;
  }, [commentTree, focusedThreadRootId]);

  if (!isOpen || !echo) return null;

  // Toggle thread expand / collapse
  const toggleThreadCollapse = (commentId) => {
    setCollapsedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  // Reply Initiation
  const handleStartReply = (targetComment) => {
    setReplyingTo({
      id: String(targetComment.id || targetComment.time),
      text: targetComment.text || '',
      author: 'Stranger'
    });

    // Make sure thread is expanded
    setCollapsedThreads((prev) => {
      const next = new Set(prev);
      next.delete(targetComment.id);
      return next;
    });

    setTimeout(() => {
      inputRef.current?.focus();
    }, 80);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  // One-click heart toggle or specific emotion reaction
  const handleReaction = async (commentId, reactionType = 'heart') => {
    setActiveReactionMenuId(null);
    setBurstCommentId(commentId);
    setTimeout(() => setBurstCommentId(null), 800);

    // Optimistic UI update
    setCommentsList((prev) =>
      prev.map((c) => {
        if (String(c.id || c.time) === String(commentId)) {
          const currentRx = c.userReaction;
          const isSame = currentRx === reactionType;
          const nextRx = isSame ? null : reactionType;
          const diff = isSame ? -1 : currentRx ? 0 : 1;
          const curCount = Number(c.reactionsCount || c.likes || 0);

          const breakdown = { ...(c.reactionBreakdown || {}) };
          if (currentRx && breakdown[currentRx]) {
            breakdown[currentRx] = Math.max(0, breakdown[currentRx] - 1);
          }
          if (nextRx) {
            breakdown[nextRx] = (breakdown[nextRx] || 0) + 1;
          }

          return {
            ...c,
            userReaction: nextRx,
            reactionsCount: Math.max(0, curCount + diff),
            reactionBreakdown: breakdown
          };
        }
        return c;
      })
    );

    try {
      const res = await toggleCommentReactionInDb(commentId, reactionType);
      if (res?.success && res.data) {
        setCommentsList((prev) =>
          prev.map((c) => {
            if (String(c.id || c.time) === String(commentId)) {
              return {
                ...c,
                userReaction: res.data.userReaction,
                reactionsCount: res.data.reactionsCount,
                reactionBreakdown: res.data.breakdown
              };
            }
            return c;
          })
        );
      }
    } catch {
      // rollback handled gracefully
    }
  };

  // Delete a reflection owned by current user
  const executeDeleteComment = async (commentToDelete) => {
    if (!commentToDelete || !commentToDelete.id) return;
    setIsDeleting(true);

    const targetId = String(commentToDelete.id || commentToDelete.time);
    const hasChildReplies = commentsList.some((c) => String(c.parentId || c.parent_id) === targetId);

    // Optimistic update
    if (hasChildReplies) {
      setCommentsList((prev) =>
        prev.map((c) => {
          if (String(c.id || c.time) === targetId) {
            return {
              ...c,
              text: '[This reflection was deleted by its author.]',
              isDeleted: true,
              isOwn: false,
              authorId: null,
              gifUrl: null,
              reactionsCount: 0,
              reactionBreakdown: {},
              userReaction: null
            };
          }
          return c;
        })
      );
    } else {
      setCommentsList((prev) => prev.filter((c) => String(c.id || c.time) !== targetId));
    }

    try {
      const res = await deleteCommentInDb(commentToDelete.id);
      if (!res.success) {
        if (res.status === 403) {
          onToast?.('Forbidden: You can only delete reflections you personally created.');
        } else {
          onToast?.(res.error || 'Failed to delete reflection.');
        }
        refreshComments();
      } else {
        onToast?.('Your reflection has been released.');
        if (onCommentDeleted) onCommentDeleted(echo.id, commentToDelete.id);
      }
    } catch (err) {
      console.error('Delete reflection error:', err);
      refreshComments();
    } finally {
      setIsDeleting(false);
      setConfirmDeleteComment(null);
    }
  };

  // Mobile long-press detection for own reflections
  const handleTouchStart = (item, isOwn) => {
    if (!isOwn || item.isDeleted) return;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setConfirmDeleteComment(item);
    }, 550);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Desktop right-click context menu for own reflections
  const handleContextMenu = (e, item, isOwn) => {
    if (isOwn && !item.isDeleted) {
      e.preventDefault();
      setConfirmDeleteComment(item);
    }
  };

  // Send a Quick Warmth
  const handleSendQuickWarmth = async (pill) => {
    setIsSubmitting(true);
    const warmthText = `${pill.emoji} ${pill.text}`;
    try {
      const parentId = replyingTo ? replyingTo.id : null;
      const res = await addCommentInDb(echo.id, warmthText, parentId, null, true);
      const newComment = (res && res.data) || {
        id: `comm-${Date.now()}`,
        echo_id: echo.id,
        text: warmthText,
        time: Date.now(),
        parentId,
        isWarmth: true,
        reactionsCount: 0,
        isOwn: true
      };
      markCommentAuthored(newComment.id);

      setCommentsList((prev) => [...prev, newComment]);
      if (onAddComment) onAddComment(echo.id, warmthText, parentId, null, true);
      setReplyingTo(null);
      onToast?.('Your gentle warmth has been released to this stranger. ✨');
    } catch (err) {
      console.error('Failed sending warmth:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Emoji insertion at cursor
  const handleInsertEmoji = (emojiChar) => {
    const input = inputRef.current;
    if (!input) {
      setCommentText((prev) => prev + emojiChar);
      return;
    }
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const nextText = commentText.slice(0, start) + emojiChar + commentText.slice(end);
    setCommentText(nextText);
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + emojiChar.length, start + emojiChar.length);
    }, 40);
  };

  // Attach GIF
  const handleSelectGif = (gifUrl) => {
    setAttachedGif(gifUrl);
    setPickerOpen(false);
    onToast?.('Visual emotion attached.');
  };

  // Submit comment
  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmed = commentText.trim();
    if ((!trimmed && !attachedGif) || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const parentId = replyingTo ? replyingTo.id : null;
      const res = await addCommentInDb(echo.id, trimmed, parentId, attachedGif, false);
      const newComment = (res && res.data) || {
        id: `comm-${Date.now()}`,
        echo_id: echo.id,
        text: trimmed,
        time: Date.now(),
        parentId,
        gifUrl: attachedGif,
        reactionsCount: 0,
        isOwn: true
      };
      markCommentAuthored(newComment.id);

      setCommentsList((prev) => [...prev, newComment]);
      if (onAddComment) onAddComment(echo.id, trimmed, parentId, attachedGif, false);

      setCommentText('');
      setAttachedGif(null);
      setReplyingTo(null);
      setPickerOpen(false);

      // Auto-scroll to newly posted comment
      setTimeout(() => {
        if (drawerListRef.current) {
          drawerListRef.current.scrollTop = drawerListRef.current.scrollHeight;
        }
      }, 100);
    } catch (err) {
      console.error('Failed submitting comment:', err);
      onToast?.('Failed to share reflection. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Report handler
  const handleReportCommentSubmit = async (commentId, echoId, reason, details) => {
    await reportCommentInDb(commentId, echoId, reason, details);
  };

  // Recursive Comment Node Renderer
  const renderCommentItem = (item, depth = 0) => {
    const isReply = depth > 0;
    const hasReplies = item.replies && item.replies.length > 0;
    const isCollapsed = collapsedThreads.has(item.id);
    const isHighlighted = highlightedCommentId === item.id;
    const isBursting = burstCommentId === item.id;

    // Visual depth caps at 3 to prevent mobile clipping while preserving parent hierarchy
    const visualDepth = Math.min(depth, 3);

    // Active reaction icon
    const activeReactionDef = EMOTIONAL_REACTIONS.find((r) => r.id === item.userReaction);

    const currentAnonId = getAnonymousIdentity()?.identityId;
    const isOwn = !item.isDeleted && (
      Boolean(item.isOwn) ||
      (currentAnonId && (item.authorId === currentAnonId || item.author_id === currentAnonId)) ||
      authoredCommentIds.has(String(item.id))
    );

    return (
      <div
        id={`comment-${item.id}`}
        key={item.id}
        className={`comment-node ${isReply ? 'comment-reply-node' : 'comment-root-node'} depth-${visualDepth} ${
          isHighlighted ? 'comment-shared-highlight' : ''
        }`}
      >
        {item.isDeleted ? (
          <div className="comment-bubble comment-bubble-deleted">
            <div className="comment-author muted-author">
              <span className="comment-author-name">Stranger</span>
              <span className="comment-author-sep">&middot;</span>
              <span className="comment-time">{formatTime(item.time || item.timestamp)}</span>
            </div>
            <p className="comment-deleted-text">[This reflection was deleted by its author.]</p>
          </div>
        ) : (
          <div
            className={`comment-bubble ${isReply ? 'comment-bubble-reply' : ''} ${
              item.isWarmth ? 'comment-bubble-warmth' : ''
            } ${isOwn ? 'comment-bubble-own' : ''}`}
            onContextMenu={(e) => handleContextMenu(e, item, isOwn)}
            onTouchStart={() => handleTouchStart(item, isOwn)}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchEnd}
          >
            {/* Top Row: Author, Time & Options */}
            <div className="comment-top">
              <div className="comment-author">
                {isReply && <span className="reply-indicator-arrow">↳</span>}
                <div className="avatar-placeholder">
                  <User size={12} />
                </div>
                <span className="comment-author-name">Stranger</span>
                {isOwn && <span className="own-reflection-badge">You</span>}
                {item.isWarmth && <span className="warmth-badge">✨ Gentle Warmth</span>}
                <span className="comment-author-sep">&middot;</span>
                <span className="comment-time">{formatTime(item.time || item.timestamp)}</span>
              </div>

              {/* Quick Actions Menu (Share, Report, Options for Own) */}
              <div className="comment-top-actions">
                <button
                  type="button"
                  className="comment-top-icon-btn"
                  onClick={() => setShareModalComment(item)}
                  title="Share this reflection"
                  aria-label="Share this reflection"
                >
                  <Share2 size={13} />
                </button>
                <button
                  type="button"
                  className="comment-top-icon-btn report-btn"
                  onClick={() => setReportModalComment(item)}
                  title="Report reflection to guardians"
                  aria-label="Report reflection"
                >
                  <Flag size={12} />
                </button>

                {/* Own Reflection Options (Three dots) */}
                {isOwn && (
                  <div className="comment-options-wrapper">
                    <button
                      type="button"
                      className="comment-top-icon-btn comment-options-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveOptionsMenuId(activeOptionsMenuId === item.id ? null : item.id);
                      }}
                      title="Reflection options"
                      aria-label="Reflection options"
                    >
                      <MoreHorizontal size={13} />
                    </button>
                    {activeOptionsMenuId === item.id && (
                      <div
                        className="comment-options-dropdown"
                        onMouseLeave={() => setActiveOptionsMenuId(null)}
                      >
                        <button
                          type="button"
                          className="comment-options-item delete-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveOptionsMenuId(null);
                            setConfirmDeleteComment(item);
                          }}
                        >
                          <Trash2 size={13} />
                          <span>Delete reflection</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Comment Body */}
            {item.text && <p className="comment-body">{item.text}</p>}

            {/* Attached GIF preview */}
            {item.gifUrl && (
              <div className="comment-attached-gif-view">
                <img src={item.gifUrl} alt="Reflection GIF" loading="lazy" className="comment-gif-img" />
              </div>
            )}

            {/* Actions Bar: Reaction Pill, Reply, Focus (Candle removed) */}
            <div className="comment-actions-bar">
              {/* Heart / Emotion Reaction Pill */}
              <div className="reaction-wrapper">
                <button
                  type="button"
                  className={`comment-reaction-btn ${item.userReaction ? 'reacted' : ''} ${
                    isBursting ? 'heart-burst-animate' : ''
                  }`}
                  onClick={() => handleReaction(item.id, item.userReaction ? item.userReaction : 'heart')}
                  onMouseEnter={() => setActiveReactionMenuId(item.id)}
                  title="Appreciate this reflection"
                  aria-label="React to reflection"
                >
                  <span className="reaction-btn-icon">
                    {activeReactionDef ? activeReactionDef.emoji : <Heart size={13} />}
                  </span>
                  <span className="reaction-count-text">
                    {item.reactionsCount > 0 ? item.reactionsCount : 'Heart'}
                  </span>
                </button>

                {/* Hover / Click Emotional Reaction Selector */}
                {activeReactionMenuId === item.id && (
                  <div
                    className="emotional-reaction-popover"
                    onMouseLeave={() => setActiveReactionMenuId(null)}
                  >
                    {EMOTIONAL_REACTIONS.map((rx) => (
                      <button
                        key={rx.id}
                        type="button"
                        className={`emotion-select-pill ${item.userReaction === rx.id ? 'active' : ''}`}
                        onClick={() => handleReaction(item.id, rx.id)}
                        title={`${rx.label} — "${rx.desc}"`}
                      >
                        <span className="emotion-emoji">{rx.emoji}</span>
                        <span className="emotion-tooltip">{rx.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reply Button */}
              <button
                type="button"
                className="comment-reply-action-btn"
                onClick={() => handleStartReply(item)}
                title="Reply to this stranger"
                aria-label="Reply to stranger"
              >
                <CornerDownRight size={12} />
                <span>Reply</span>
              </button>

              {/* Focus Thread View (for root comments with replies) */}
              {!isReply && hasReplies && (
                <button
                  type="button"
                  className="comment-focus-thread-btn"
                  onClick={() => setFocusedThreadRootId(focusedThreadRootId === item.id ? null : item.id)}
                  title="Focus conversation thread"
                >
                  <Sparkles size={11} />
                  <span>Focus</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Thread Collapse / Expand Control */}
        {hasReplies && (
          <div className="thread-collapse-bar">
            <button
              type="button"
              className="thread-toggle-btn"
              onClick={() => toggleThreadCollapse(item.id)}
            >
              {isCollapsed ? (
                <>
                  <ChevronDown size={13} />
                  <span>
                    Show {item.replies.length} {item.replies.length === 1 ? 'reply' : 'replies'}
                  </span>
                </>
              ) : (
                <>
                  <ChevronUp size={13} />
                  <span>
                    Hide {item.replies.length} {item.replies.length === 1 ? 'reply' : 'replies'}
                  </span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Nested Child Replies */}
        {hasReplies && !isCollapsed && (
          <div className="comment-replies-container">
            {item.replies.map((child) => renderCommentItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose}>
        <div className="drawer-panel advanced-comment-drawer" onClick={(e) => e.stopPropagation()}>
          {/* Drawer Header */}
          <div className="drawer-header">
            <div className="drawer-header-info">
              {focusedThreadRootId ? (
                <button
                  type="button"
                  className="drawer-back-btn"
                  onClick={() => setFocusedThreadRootId(null)}
                  title="Return to full conversation"
                >
                  <ArrowLeft size={16} />
                  <span>All Reflections</span>
                </button>
              ) : (
                <>
                  <MessageCircle size={20} className="text-accent" />
                  <h3 className="drawer-title">Stranger Reflections</h3>
                  <span className="drawer-counter">{commentsList.length}</span>
                </>
              )}
            </div>

            {/* Sorting controls */}
            {!focusedThreadRootId && (
              <div className="drawer-sorting-controls">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="drawer-sort-select"
                  aria-label="Sort reflections"
                >
                  <option value="relevance">✨ Most Relevant</option>
                  <option value="newest">🕒 Newest First</option>
                  <option value="oldest">📜 Oldest First</option>
                  <option value="loved">❤️ Most Loved</option>
                </select>
              </div>
            )}

            <button className="drawer-close-btn" onClick={onClose} aria-label="Close reflections">
              <X size={20} />
            </button>
          </div>

          {/* Echo Mini Context Card */}
          <div className="drawer-echo-summary">
            <div className="summary-recipient">{echo.name || 'Anonymous'}</div>
            <p className="summary-message">"{echo.message}"</p>
          </div>

          {/* Quick Warmth Bar */}
          <div className="quick-warmth-strip">
            <span className="warmth-strip-label">
              <Flame size={12} className="text-amber-400" />
              <span>Send Warmth:</span>
            </span>
            <div className="warmth-pills-row">
              {QUICK_WARMTH_PILLS.map((pill, i) => (
                <button
                  key={i}
                  type="button"
                  className="warmth-pill-btn"
                  onClick={() => handleSendQuickWarmth(pill)}
                  disabled={isSubmitting}
                  title={`Send: "${pill.text}"`}
                >
                  <span className="warmth-pill-emoji">{pill.emoji}</span>
                  <span className="warmth-pill-text">{pill.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Comments Scrollable List */}
          <div ref={drawerListRef} className="drawer-comments-list">
            {commentsList.length === 0 ? (
              <div className="no-comments-state">
                <Heart size={32} className="empty-heart-icon" />
                <p className="no-comments-text">No reflections shared yet.</p>
                <span className="no-comments-sub">
                  Be the first stranger to leave a gentle, comforting word.
                </span>
              </div>
            ) : (
              <div className="comments-tree-wrapper">
                {displayedTree.map((rootComment) => renderCommentItem(rootComment, 0))}
              </div>
            )}
          </div>

          {/* Crisis Gentle Guidance Banner */}
          {detectedCrisis && (
            <div className="drawer-crisis-support-banner">
              <Sparkles size={16} className="text-amber-400 flex-shrink-0" />
              <div className="crisis-banner-text">
                <strong>You are not alone.</strong> If you or someone you know is in deep distress,
                compassionate help is available 24/7:{' '}
                <span className="crisis-helplines">988 (US/CA) &bull; 112 (EU) &bull; 9152987821 (AASRA)</span>.
              </div>
            </div>
          )}

          {/* Comment Input Footer */}
          <form onSubmit={handleSubmit} noValidate className="drawer-input-form advanced-composer">
            {/* Active Reply Context Banner */}
            {replyingTo && (
              <div className="drawer-reply-banner">
                <div className="reply-banner-content">
                  <CornerDownRight size={13} className="reply-banner-icon" />
                  <span className="reply-banner-text">
                    Replying to <strong>Stranger</strong>: &ldquo;
                    {replyingTo.text.slice(0, 36)}
                    {replyingTo.text.length > 36 ? '…' : ''}
                    &rdquo;
                  </span>
                </div>
                <button
                  type="button"
                  className="reply-banner-cancel-btn"
                  onClick={handleCancelReply}
                  aria-label="Cancel reply"
                  title="Cancel reply"
                >
                  <X size={13} />
                </button>
              </div>
            )}

            {/* Attached GIF Preview in Composer */}
            {attachedGif && (
              <div className="composer-gif-attachment-preview">
                <img src={attachedGif} alt="Attached reaction GIF" className="composer-preview-img" />
                <button
                  type="button"
                  className="remove-attached-gif-btn"
                  onClick={() => setAttachedGif(null)}
                  title="Remove GIF"
                  aria-label="Remove GIF"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Composer Input Row */}
            <div className="drawer-input-wrapper composer-main-box">
              <textarea
                ref={inputRef}
                placeholder={
                  replyingTo
                    ? 'Reply to Stranger anonymously...'
                    : 'Leave a comforting reflection or supportive word...'
                }
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                className="drawer-comment-textarea"
                maxLength={500}
                rows={2}
              />

              {/* Composer Toolbar: Emoji, GIF, Counter, Send */}
              <div className="composer-toolbar-row">
                <div className="composer-tools-left">
                  {/* Emoji Picker Toggle */}
                  <button
                    type="button"
                    className={`composer-tool-btn ${pickerOpen && pickerTab === 'emoji' ? 'active' : ''}`}
                    onClick={() => {
                      if (pickerOpen && pickerTab === 'emoji') {
                        setPickerOpen(false);
                      } else {
                        setPickerTab('emoji');
                        setPickerOpen(true);
                      }
                    }}
                    title="Insert emotion emoji"
                    aria-label="Open emoji picker"
                  >
                    <Smile size={18} />
                  </button>

                  {/* GIF Picker Toggle */}
                  <button
                    type="button"
                    className={`composer-tool-btn ${pickerOpen && pickerTab === 'gif' ? 'active' : ''}`}
                    onClick={() => {
                      if (pickerOpen && pickerTab === 'gif') {
                        setPickerOpen(false);
                      } else {
                        setPickerTab('gif');
                        setPickerOpen(true);
                      }
                    }}
                    title="Attach emotional GIF"
                    aria-label="Open GIF picker"
                  >
                    <ImageIcon size={18} />
                  </button>

                  <span className="composer-char-count">{commentText.length}/500</span>
                </div>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={(!commentText.trim() && !attachedGif) || isSubmitting}
                  className="drawer-send-btn"
                  title={replyingTo ? 'Send reply to stranger' : 'Send reflection'}
                  aria-label={replyingTo ? 'Send reply to stranger' : 'Send reflection'}
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>

            {/* Embedded Emoji & GIF Picker Container */}
            {pickerOpen && (
              <EmojiGifPicker
                isOpen={pickerOpen}
                activeTab={pickerTab}
                onClose={() => setPickerOpen(false)}
                onSelectEmoji={handleInsertEmoji}
                onSelectGif={handleSelectGif}
              />
            )}

            <div className="drawer-hint-text">
              All interactions are completely anonymous between strangers. Enter to send, Shift+Enter for newline.
            </div>
          </form>
        </div>
      </div>

      {/* Share Reflection Modal */}
      {Boolean(shareModalComment) && (
        <CommentShareModal
          isOpen={Boolean(shareModalComment)}
          comment={shareModalComment}
          echo={echo}
          onClose={() => setShareModalComment(null)}
          onToast={onToast}
        />
      )}

      {/* Report Reflection Modal */}
      {Boolean(reportModalComment) && (
        <CommentReportModal
          isOpen={Boolean(reportModalComment)}
          comment={reportModalComment}
          echo={echo}
          onClose={() => setReportModalComment(null)}
          onSubmitReport={handleReportCommentSubmit}
          onToast={onToast}
        />
      )}

      {/* Delete Reflection Confirmation Modal */}
      {Boolean(confirmDeleteComment) && (
        <div
          className="comment-delete-modal-overlay"
          onClick={() => !isDeleting && setConfirmDeleteComment(null)}
        >
          <div className="comment-delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="comment-delete-modal-icon">
              <Trash2 size={24} />
            </div>
            <h4 className="comment-delete-modal-title">Delete this reflection?</h4>
            <p className="comment-delete-modal-desc">
              This reflection will be removed. This action cannot be undone.
            </p>
            <div className="comment-delete-modal-actions">
              <button
                type="button"
                className="comment-delete-btn-cancel"
                onClick={() => setConfirmDeleteComment(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="comment-delete-btn-confirm"
                onClick={() => executeDeleteComment(confirmDeleteComment)}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 size={15} className="animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
