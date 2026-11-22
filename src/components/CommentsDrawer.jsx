import React, { useState, useRef, useMemo } from 'react';
import { X, Send, MessageCircle, Heart, User, CornerDownRight } from 'lucide-react';

function formatTime(timestamp) {
  if (!timestamp) return 'Recently';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  return `${diffDays}d ago`;
}

/**
 * Organizes a flat list of comments into a hierarchical tree based on parentId.
 * Supports arbitrary nested conversations: root comments -> replies -> replies-to-replies.
 */
function buildCommentTree(comments) {
  if (!comments || !Array.isArray(comments)) return [];

  const map = new Map();
  const roots = [];

  // Normalize comments with an empty replies array
  const normalized = comments.map((c) => ({
    ...c,
    id: String(c.id || c.time),
    parentId: c.parentId || c.parent_id || null,
    replies: []
  }));

  // Index all comments by ID
  normalized.forEach((c) => map.set(c.id, c));

  // Assemble parent-child tree
  normalized.forEach((c) => {
    if (c.parentId && map.has(String(c.parentId))) {
      map.get(String(c.parentId)).replies.push(c);
    } else {
      roots.push(c);
    }
  });

  return roots;
}

export default function CommentsDrawer({ isOpen, echo, onClose, onAddComment }) {
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); // { id, text, author: 'Stranger' }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);

  const comments = echo?.comments || [];
  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);

  if (!isOpen || !echo) return null;

  const handleStartReply = (targetComment) => {
    setReplyingTo({
      id: String(targetComment.id || targetComment.time),
      text: targetComment.text || '',
      author: 'Stranger'
    });
    // Auto-focus input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 60);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleSubmit = async (e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    const trimmed = commentText.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const parentId = replyingTo ? replyingTo.id : null;
      await onAddComment(echo.id, trimmed, parentId);
      setCommentText('');
      setReplyingTo(null);
    } catch (err) {
      console.error('Failed submitting reflection/reply:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Recursive renderer for nested replies
  const renderCommentItem = (item, depth = 0) => {
    const isReply = depth > 0;

    return (
      <div
        key={item.id}
        className={`comment-node ${isReply ? 'comment-reply-node' : 'comment-root-node'}`}
      >
        <div className={`comment-bubble ${isReply ? 'comment-bubble-reply' : ''}`}>
          <div className="comment-top">
            <div className="comment-author">
              {isReply && <span className="reply-indicator-arrow">↳</span>}
              <div className="avatar-placeholder">
                <User size={12} />
              </div>
              <span className="comment-author-name">Stranger</span>
              <span className="comment-author-sep">&middot;</span>
              <span className="comment-time">{formatTime(item.time || item.timestamp)}</span>
            </div>
          </div>

          <p className="comment-body">{item.text}</p>

          <div className="comment-actions-bar">
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
          </div>
        </div>

        {/* Nested replies underneath */}
        {item.replies && item.replies.length > 0 && (
          <div className="comment-replies-container">
            {item.replies.map((child) => renderCommentItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-header-info">
            <MessageCircle size={20} className="text-accent" />
            <h3 className="drawer-title">Community Reflections</h3>
            <span className="drawer-counter">{comments.length}</span>
          </div>
          <button className="drawer-close-btn" onClick={onClose} aria-label="Close reflections">
            <X size={20} />
          </button>
        </div>

        {/* Echo Mini Context Card */}
        <div className="drawer-echo-summary">
          <div className="summary-recipient">{echo.name || 'Anonymous'}</div>
          <p className="summary-message">"{echo.message}"</p>
        </div>

        {/* Comments Scrollable List */}
        <div className="drawer-comments-list">
          {comments.length === 0 ? (
            <div className="no-comments-state">
              <Heart size={32} className="empty-heart-icon" />
              <p className="no-comments-text">No reflections shared yet.</p>
              <span className="no-comments-sub">Be the first stranger to leave a gentle, comforting word.</span>
            </div>
          ) : (
            <div className="comments-tree-wrapper">
              {commentTree.map((rootComment) => renderCommentItem(rootComment, 0))}
            </div>
          )}
        </div>

        {/* Comment Input Footer */}
        <form onSubmit={handleSubmit} noValidate className="drawer-input-form">
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

          <div className="drawer-input-wrapper">
            <input
              ref={inputRef}
              type="text"
              placeholder={replyingTo ? "Reply to Stranger anonymously..." : "Leave a supportive word or reflection..."}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="drawer-comment-input"
              maxLength={280}
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!commentText.trim() || isSubmitting}
              className="drawer-send-btn"
              title={replyingTo ? "Send reply to stranger" : "Send reflection"}
              aria-label={replyingTo ? "Send reply to stranger" : "Send reflection"}
            >
              <Send size={16} />
            </button>
          </div>
          <div className="drawer-hint-text">
            All conversations are anonymous between strangers. Be compassionate and gentle.
          </div>
        </form>
      </div>
    </div>
  );
}
