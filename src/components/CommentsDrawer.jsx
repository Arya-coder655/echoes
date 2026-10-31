import React, { useState } from 'react';
import { X, Send, MessageCircle, Heart, User } from 'lucide-react';

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

export default function CommentsDrawer({ isOpen, echo, onClose, onAddComment }) {
  const [commentText, setCommentText] = useState('');

  if (!isOpen || !echo) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    onAddComment(echo.id, commentText.trim());
    setCommentText('');
  };

  const comments = echo.comments || [];

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
              <span className="no-comments-sub">Be the first to leave a gentle, comforting word.</span>
            </div>
          ) : (
            comments.map((comm) => (
              <div key={comm.id || comm.time} className="comment-bubble">
                <div className="comment-top">
                  <div className="comment-author">
                    <div className="avatar-placeholder">
                      <User size={12} />
                    </div>
                    <span>Kind Soul</span>
                  </div>
                  <span className="comment-time">{formatTime(comm.time)}</span>
                </div>
                <p className="comment-body">{comm.text}</p>
              </div>
            ))
          )}
        </div>

        {/* Comment Input Footer */}
        <form onSubmit={handleSubmit} className="drawer-input-form">
          <div className="drawer-input-wrapper">
            <input
              type="text"
              placeholder="Leave a supportive word or reflection..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="drawer-comment-input"
              maxLength={280}
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="drawer-send-btn"
              title="Send reply"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="drawer-hint-text">
            Reflections are anonymous. Be compassionate and mindful.
          </div>
        </form>
      </div>
    </div>
  );
}
