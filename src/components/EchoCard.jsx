import React, { useState } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  Clock, 
  User, 
  Quote, 
  Copy, 
  Check, 
  Maximize2,
  Flag
} from 'lucide-react';
import { THEME_PALETTES } from '../data/initialEchoes';

function formatRelativeTime(timestamp) {
  if (!timestamp) return 'Just now';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function EchoCard({
  echo,
  onLike,
  onOpenComments,
  onOpenShare,
  onOpenReport,
  isBookmarked,
  onToggleBookmark,
  onToast
}) {
  const [copiedQuote, setCopiedQuote] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);

  const theme = THEME_PALETTES.find((t) => t.id === echo.themeId) || THEME_PALETTES[0];

  const handleHeartClick = () => {
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 600);
    onLike(echo.id);
  };

  const handleCopyQuote = () => {
    const textToCopy = `"${echo.message}" ${echo.name ? `— ${echo.name}` : ''} (#${echo.id} via Echoes of the Heart)`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedQuote(true);
    onToast('Quote copied to clipboard!');
    setTimeout(() => setCopiedQuote(false), 2000);
  };

  const getCategoryTitle = (cat) => {
    switch (cat) {
      case 'regret': return 'Regret Wall';
      case 'unsent': return 'Unsent Letters';
      case 'midnight-thoughts': return 'Midnight Thoughts';
      case 'healing-corner': return 'Healing Corner';
      case 'random-chaos': return 'Random Chaos';
      case 'last-words': return 'Last Words';
      case 'love-notes': return 'Love Notes';
      case 'themed': return 'Themed Reflection';
      default: return 'Echo';
    }
  };

  return (
    <>
      <article
        className="echo-card"
        id={echo.id}
        style={{
          '--theme-color': theme.color,
          '--theme-secondary': theme.secondary,
          '--theme-bg': theme.bg,
          '--theme-border': theme.border,
          '--theme-glow': theme.glow
        }}
      >
        {/* Subtle glowing ambient accent on top */}
        <div className="echo-card-top-glow" />

        {/* Card Header */}
        <div className="echo-card-header">
          <div className="header-left">
            <span className="echo-category-badge">
              {getCategoryTitle(echo.category)}
            </span>
            <span className="echo-id-pill">#{echo.id}</span>
          </div>

          <div className="header-right">
            <span className="echo-timestamp" title={new Date(echo.timestamp).toLocaleString()}>
              <Clock size={12} className="time-icon" />
              {formatRelativeTime(echo.timestamp)}
            </span>
            <button
              onClick={() => onToggleBookmark(echo.id)}
              className={`echo-bookmark-btn ${isBookmarked ? 'saved' : ''}`}
              title={isBookmarked ? "Remove from saved echoes" : "Save this echo"}
              aria-label="Bookmark echo"
            >
              <Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>

        {/* Recipient Line */}
        {echo.name && (
          <div className="echo-recipient-row">
            <User size={13} className="recipient-icon" />
            <span className="echo-recipient-text">{echo.name}</span>
          </div>
        )}

        {/* Card Body / Message */}
        <div className="echo-card-body">
          <Quote className="quote-mark" size={24} />
          <p className="echo-message-text">{echo.message}</p>
        </div>

        {/* Optional User Attached Image */}
        {echo.image && (
          <div className="echo-image-container" onClick={() => setImageModalOpen(true)}>
            <img 
              src={echo.image} 
              alt="Echo attachment" 
              className="echo-attached-img" 
              loading="lazy" 
              decoding="async" 
            />
            <div className="image-zoom-overlay">
              <Maximize2 size={16} />
              <span>Click to enlarge</span>
            </div>
          </div>
        )}

        {/* Card Actions Footer */}
        <div className="echo-card-footer">
          <div className="footer-left-actions">
            {/* Heart / Felt this */}
            <button
              onClick={handleHeartClick}
              className={`action-pill like-pill ${echo.liked ? 'felt' : ''} ${heartAnim ? 'heart-burst' : ''}`}
              title={echo.liked ? "You felt this" : "I felt this"}
            >
              <Heart size={16} fill={echo.liked ? 'currentColor' : 'none'} />
              <span className="action-counter">{echo.likes || 0}</span>
              <span className="action-label">Felt</span>
            </button>

            {/* Comments */}
            <button
              onClick={() => onOpenComments(echo)}
              className="action-pill comment-pill"
              title="Read or add reflections"
            >
              <MessageCircle size={16} />
              <span className="action-counter">{(echo.comments && echo.comments.length) || 0}</span>
              <span className="action-label">Replies</span>
            </button>
          </div>

          <div className="footer-right-actions">
            {/* Quick Copy Quote */}
            <button
              onClick={handleCopyQuote}
              className="action-icon-btn"
              title="Copy quote text"
            >
              {copiedQuote ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            </button>

            {/* Share */}
            <button
              onClick={() => onOpenShare(echo)}
              className="action-pill share-pill"
              title="Share this echo"
            >
              <Share2 size={16} />
              <span className="action-counter">{echo.shares || 0}</span>
            </button>

            {/* Report Content */}
            <button
              onClick={() => onOpenReport && onOpenReport(echo)}
              className="action-icon-btn report-flag-btn"
              title="Report inappropriate content or spam"
              aria-label="Report echo"
            >
              <Flag size={15} />
            </button>
          </div>
        </div>
      </article>

      {/* Image Zoom Lightbox Modal */}
      {imageModalOpen && (
        <div className="image-modal-backdrop" onClick={() => setImageModalOpen(false)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <img src={echo.image} alt="Enlarged attachment" className="image-modal-img" decoding="async" />
            <button className="image-modal-close" onClick={() => setImageModalOpen(false)}>
              &times;
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default React.memo(EchoCard);
