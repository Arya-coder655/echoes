import React, { useState, useRef, useCallback } from 'react';
import { 
  X, 
  Send, 
  Image as ImageIcon, 
  Sparkles, 
  Eye, 
  User, 
  AlertCircle,
  Flame,
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { THEME_PALETTES, CATEGORIES } from '../data/initialEchoes';
import ThanosAshBurn from './ThanosAshBurn';

export default function EchoComposer({ isOpen, onClose, onPublish, onToast }) {
  const [category, setCategory] = useState('regret');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [selectedThemeId, setSelectedThemeId] = useState('crimson-regret');
  const [imagePreview, setImagePreview] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBurningAsh, setIsBurningAsh] = useState(false);
  const [isBurnSuccess, setIsBurnSuccess] = useState(false);
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

  // Sacred Hearth Feature: Burn message to ash & dust instead of posting
  const handleBurnToAsh = (e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }

    if (isSubmitting || isBurningAsh) return;

    if (!message || !message.trim()) {
      const err = 'Please write what you wish to release to the flames first.';
      setError(err);
      if (typeof onToast === 'function') onToast(err);
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      textareaRef.current?.focus();
      return;
    }

    setError('');
    setIsBurningAsh(true);

    // Initial embers burst
    setTimeout(() => {
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.65 },
          colors: ['#fc2904', '#ff7a59', '#fbbf24', '#ffffff']
        });
      } catch (err) {}
    }, 300);
  };

  const handleAshBurnComplete = useCallback(() => {
    setIsBurningAsh(false);
    setIsBurnSuccess(true);
    setMessage('');
    setName('');
    setImagePreview('');
    if (typeof onToast === 'function') {
      onToast('Consumed by sacred fire. Your message turned to ash without ever being posted.');
    }
  }, [onToast]);

  const handleSubmit = async (e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }

    if (isSubmitting || isBurningAsh) return;

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
        <div className="composer-header">
          <div className="composer-title-wrap">
            <Sparkles size={20} className="text-accent" />
            <div>
              <h3 className="composer-title">Echo Your Heart</h3>
              <span className="composer-subtitle">Release an unspoken word or burn it to ash in the sacred hearth</span>
            </div>
          </div>
          <button className="composer-close-btn" onClick={onClose} aria-label="Close composer">
            <X size={20} />
          </button>
        </div>

        <div className="composer-layout">
          {/* Main Form Column or Cathartic Ash Success Screen */}
          {isBurnSuccess ? (
            <div className="composer-burned-success-card">
              <div className="ashes-icon-wrap">
                <Sparkles size={36} className="text-amber-400" />
              </div>
              <h3 className="ashes-title">Consumed by Sacred Fire</h3>
              <p className="ashes-description">
                Your words have disintegrated into ash and stardust. They were never posted, saved, or shared with anyone.
                Take a long, deep breath—your burden has completely dissolved into peace.
              </p>
              <div className="ashes-actions">
                <button 
                  type="button" 
                  onClick={() => setIsBurnSuccess(false)} 
                  className="burn-another-btn"
                >
                  <RefreshCw size={15} />
                  <span>Write Another Reflection</span>
                </button>
                <button 
                  type="button" 
                  onClick={onClose} 
                  className="peace-btn"
                >
                  Walk in Peace
                </button>
              </div>
            </div>
          ) : (
            <form ref={formRef} onSubmit={handleSubmit} noValidate className="composer-form">
              {error && (
                <div className="composer-error-banner">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* Category Selector */}
              <div className="form-group">
                <label className="form-label">Choose Sanctuary Wall</label>
                <div className="category-select-buttons">
                  {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`cat-btn ${category === cat.id ? 'active' : ''}`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient Name (Optional) */}
              <div className="form-group">
                <label className="form-label">
                  To Whom? <span className="label-hint">(Optional — e.g. Maya, Dad, Younger Me, The Universe)</span>
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
                    disabled={isBurningAsh}
                  />
                </div>
              </div>

              {/* Unspoken Message Textarea with Thanos Ash Burn Overlay */}
              <div className="form-group">
                <div className="label-with-count">
                  <label className="form-label">Your Unspoken Words</label>
                  <span className="char-count">{message.length}/600</span>
                </div>
                
                <div className={`composer-textarea-container ${isBurningAsh ? 'thanos-disintegrating' : ''}`}>
                  <textarea
                    ref={textareaRef}
                    placeholder="What did you never get the courage to say? What do you carry in your chest?..."
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      if (error) setError('');
                    }}
                    maxLength={600}
                    className={`composer-textarea ${isBurningAsh ? 'thanos-text-dissolve' : ''}`}
                    disabled={isSubmitting || isBurningAsh}
                  />

                  {/* Thanos Snap Ash Burn Disintegration Overlay */}
                  <ThanosAshBurn 
                    isBurning={isBurningAsh} 
                    onComplete={handleAshBurnComplete} 
                    duration={2400} 
                  />
                </div>

                <div className="composer-ritual-hint">
                  <Flame size={13} className="text-amber-500" />
                  <span>Don't want to post? You can ignite & let your words dissolve into ash forever.</span>
                </div>
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
                      disabled={isBurningAsh}
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
                      disabled={isBurningAsh}
                    />
                  </label>
                ) : (
                  <div className="image-preview-wrapper">
                    <img src={imagePreview} alt="Attached Preview" className="preview-thumb" />
                    <button type="button" onClick={removeImage} className="remove-image-btn" disabled={isBurningAsh}>
                      <X size={14} /> Remove Image
                    </button>
                  </div>
                )}
              </div>

              {/* Submit & Burn Actions */}
              <div className="composer-actions-bar">
                <button
                  type="button"
                  className="mobile-preview-toggle-btn"
                  onClick={() => setShowLivePreview(!showLivePreview)}
                  disabled={isBurningAsh}
                >
                  <Eye size={16} />
                  <span>{showLivePreview ? 'Hide Preview' : 'Show Preview'}</span>
                </button>

                <div className="actions-right">
                  <button type="button" onClick={onClose} className="cancel-btn" disabled={isBurningAsh}>
                    Discard
                  </button>

                  {/* Sacred Hearth Feature: Burn to Ash Instead of Posting */}
                  <button
                    type="button"
                    onClick={handleBurnToAsh}
                    disabled={isSubmitting || isBurningAsh || !message.trim()}
                    className={`composer-burn-btn ${isBurningAsh ? 'is-burning' : ''}`}
                    title="Burn this message to ash and dust without publishing it anywhere"
                    aria-label="Burn to ash instead of posting"
                  >
                    <Flame size={16} />
                    <span>{isBurningAsh ? 'Disintegrating to Ash...' : 'Burn to Ash (Don\'t Post)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting || isBurningAsh}
                    className="publish-btn"
                    aria-label="Release Echo"
                  >
                    <Send size={16} />
                    <span>{isSubmitting ? 'Releasing...' : 'Release Echo'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Live Preview Column */}
          {showLivePreview && !isBurnSuccess && (
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
