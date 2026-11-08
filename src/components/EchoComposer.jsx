import React, { useState, useRef } from 'react';
import { 
  X, 
  Send, 
  Image as ImageIcon, 
  Sparkles, 
  Eye, 
  User, 
  AlertCircle 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { THEME_PALETTES, CATEGORIES } from '../data/initialEchoes';

export default function EchoComposer({ isOpen, onClose, onPublish, onToast }) {
  const [category, setCategory] = useState('regret');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [selectedThemeId, setSelectedThemeId] = useState('crimson-regret');
  const [imagePreview, setImagePreview] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(() => (typeof window !== 'undefined' ? window.innerWidth > 768 : true));

  const formRef = useRef(null);
  const textareaRef = useRef(null);

  if (!isOpen) return null;

  const currentTheme = THEME_PALETTES.find((t) => t.id === selectedThemeId) || THEME_PALETTES[0];

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setImagePreview(uploadEvent.target.result);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview('');
  };

  const handleSubmit = async (e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }

    if (isSubmitting) return;

    if (!message || !message.trim()) {
      const err = 'Please write an unspoken word or message.';
      setError(err);
      if (typeof onToast === 'function') onToast(err);
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      textareaRef.current?.focus();
      return;
    }

    if (message.trim().length < 5) {
      const err = 'Message should be at least 5 characters long.';
      setError(err);
      if (typeof onToast === 'function') onToast(err);
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      textareaRef.current?.focus();
      return;
    }

    if (message.trim().length > 2000) {
      const err = 'Message exceeds 2,000 characters.';
      setError(err);
      if (typeof onToast === 'function') onToast(err);
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const linkMatches = message.match(/(http:\/\/|https:\/\/|www\.)\S+/gi);
    if (linkMatches && linkMatches.length > 2) {
      const err = 'Echoes is an anonymous sanctuary for reflections, not for links or advertising.';
      setError(err);
      if (typeof onToast === 'function') onToast(err);
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setError('');
    setIsSubmitting(true);

    const newPost = {
      id: `ECHO-${Math.floor(10000 + Math.random() * 90000)}`,
      name: name.trim() ? (name.trim().startsWith('To:') ? name.trim() : `To: ${name.trim()}`) : 'To: The Universe (Anonymous)',
      category,
      message: message.trim(),
      image: imagePreview,
      likes: 1, // Author's silent flame
      liked: true,
      shares: 0,
      themeId: selectedThemeId,
      timestamp: Date.now(),
      comments: []
    };

    try {
      if (typeof onPublish === 'function') {
        await Promise.resolve(onPublish(newPost));
      }

      // Fire subtle celebratory particle effect
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
          colors: [currentTheme.color, '#ffffff', currentTheme.secondary]
        });
      } catch (err) {
        // safe fallback if confetti fails
      }

      if (typeof onToast === 'function') {
        onToast('Your echo has been released into the sanctuary.');
      }
      if (typeof onClose === 'function') {
        onClose();
      }
    } catch (err) {
      console.error('Error publishing echo:', err);
      const errMsg = 'Failed to release echo. Please try again.';
      setError(errMsg);
      if (typeof onToast === 'function') {
        onToast(errMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="composer-modal-backdrop" onClick={onClose}>
      <div 
        className="composer-modal-window" 
        onClick={(e) => e.stopPropagation()}
        style={{
          '--theme-color': currentTheme.color,
          '--theme-secondary': currentTheme.secondary,
          '--theme-bg': currentTheme.bg,
          '--theme-border': currentTheme.border,
          '--theme-glow': currentTheme.glow
        }}
      >
        {/* Modal Header */}
        <div className="composer-header">
          <div className="composer-header-left">
            <div className="composer-icon-badge">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="composer-title">Echo Your Heart</h2>
              <p className="composer-sub">Release your unspoken feelings anonymously.</p>
            </div>
          </div>
          <button className="composer-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Form & Preview Split Body */}
        <div className="composer-split-body">
          {/* Input Form Column */}
          <form ref={formRef} onSubmit={handleSubmit} noValidate className="composer-form">
            {error && (
              <div className="composer-error-banner">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Category Selector */}
            <div className="form-group">
              <label className="form-label">Category / Wall</label>
              <div className="category-select-buttons">
                {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`cat-btn ${category === cat.id ? 'active' : ''}`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient Target (Optional) */}
            <div className="form-group">
              <label className="form-label">
                Recipient <span className="label-hint">(Optional — e.g. "Maya", "My past self")</span>
              </label>
              <div className="input-with-icon">
                <User size={16} className="input-icon" />
                <input
                  type="text"
                  placeholder="Enter name or keep empty for Anonymous..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  className="composer-text-input"
                />
              </div>
            </div>

            {/* Unspoken Message Textarea */}
            <div className="form-group">
              <div className="label-with-count">
                <label className="form-label">Your Unspoken Words</label>
                <span className="char-count">{message.length}/600</span>
              </div>
              <textarea
                ref={textareaRef}
                placeholder="What did you never get the courage to say? What do you carry in your chest?..."
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (error) setError('');
                }}
                maxLength={600}
                className="composer-textarea"
              />
            </div>

            {/* Emotion Theme Palette Swatches */}
            <div className="form-group">
              <label className="form-label">Emotion Aura Palette</label>
              <div className="theme-swatch-list">
                {THEME_PALETTES.map((palette) => (
                  <button
                    key={palette.id}
                    type="button"
                    onClick={() => setSelectedThemeId(palette.id)}
                    className={`theme-swatch ${selectedThemeId === palette.id ? 'selected' : ''}`}
                    style={{
                      backgroundColor: palette.color,
                      boxShadow: selectedThemeId === palette.id ? `0 0 12px ${palette.color}` : 'none'
                    }}
                    title={palette.name}
                  >
                    {selectedThemeId === palette.id && <span className="swatch-check">✓</span>}
                  </button>
                ))}
              </div>
              <div className="active-theme-name">
                Selected Mood: <strong>{currentTheme.name}</strong>
              </div>
            </div>

            {/* Optional Image Upload */}
            <div className="form-group">
              <label className="form-label">
                Attach Memory Image <span className="label-hint">(Optional)</span>
              </label>
              {!imagePreview ? (
                <label className="image-upload-dropzone">
                  <ImageIcon size={22} />
                  <span>Click to choose an image (PNG, JPG)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden-file-input"
                  />
                </label>
              ) : (
                <div className="image-preview-wrapper">
                  <img src={imagePreview} alt="Attached Preview" className="preview-thumb" />
                  <button type="button" onClick={removeImage} className="remove-image-btn">
                    <X size={14} /> Remove Image
                  </button>
                </div>
              )}
            </div>

            {/* Submit Actions */}
            <div className="composer-actions-bar">
              <button
                type="button"
                className="mobile-preview-toggle-btn"
                onClick={() => setShowLivePreview(!showLivePreview)}
              >
                <Eye size={16} />
                <span>{showLivePreview ? 'Hide Preview' : 'Show Preview'}</span>
              </button>

              <div className="actions-right">
                <button type="button" onClick={onClose} className="cancel-btn">
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="publish-btn"
                  aria-label="Release Echo"
                >
                  <Send size={16} />
                  <span>{isSubmitting ? 'Releasing...' : 'Release Echo'}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Live Preview Column */}
          {showLivePreview && (
            <div className="composer-preview-column">
              <div className="preview-column-header">
                <Eye size={16} className="text-accent" />
                <span>Live Card Preview</span>
              </div>
              <div 
                className="preview-card-wrap"
                style={{
                  '--theme-color': currentTheme.color,
                  '--theme-secondary': currentTheme.secondary,
                  '--theme-bg': currentTheme.bg,
                  '--theme-border': currentTheme.border,
                  '--theme-glow': currentTheme.glow
                }}
              >
                <div className="echo-card preview-card">
                  <div className="echo-card-top-glow" />
                  <div className="echo-card-header">
                    <div className="header-left">
                      <span className="echo-category-badge">
                        {CATEGORIES.find((c) => c.id === category)?.label || 'Echo'}
                      </span>
                      <span className="echo-id-pill">#ECHO-PREVIEW</span>
                    </div>
                    <span className="echo-timestamp">Just now</span>
                  </div>

                  <div className="echo-recipient-row">
                    <User size={13} className="recipient-icon" />
                    <span className="echo-recipient-text">
                      {name.trim() ? (name.trim().startsWith('To:') ? name.trim() : `To: ${name.trim()}`) : 'To: The Universe (Anonymous)'}
                    </span>
                  </div>

                  <div className="echo-card-body">
                    <p className="echo-message-text preview-text">
                      {message || 'Your unspoken message will gently appear here as you type...'}
                    </p>
                  </div>

                  {imagePreview && (
                    <div className="echo-image-container">
                      <img src={imagePreview} alt="Preview attachment" className="echo-attached-img" />
                    </div>
                  )}

                  <div className="echo-card-footer">
                    <span className="text-xs text-muted">Protected under anonymity</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
