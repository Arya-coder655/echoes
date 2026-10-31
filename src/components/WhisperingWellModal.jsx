import React, { useState } from 'react';
import { X, Sparkles, Compass, Heart, RefreshCw, Quote } from 'lucide-react';
import { THEME_PALETTES } from '../data/initialEchoes';

export default function WhisperingWellModal({ isOpen, echoes, onClose, onToast }) {
  const [rippling, setRippling] = useState(false);
  const [drawnEcho, setDrawnEcho] = useState(null);
  const [loveSent, setLoveSent] = useState(false);

  if (!isOpen || echoes.length === 0) return null;

  const handleDropPebble = () => {
    setRippling(true);
    setLoveSent(false);

    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * echoes.length);
      setDrawnEcho(echoes[randomIndex]);
      setRippling(false);
    }, 1100);
  };

  const handleSendLove = () => {
    if (!loveSent) {
      setLoveSent(true);
      onToast('You sent silent warmth to this soul 💫');
    }
  };

  const theme = drawnEcho 
    ? THEME_PALETTES.find((t) => t.id === drawnEcho.themeId) || THEME_PALETTES[0] 
    : THEME_PALETTES[0];

  return (
    <div className="well-modal-backdrop" onClick={onClose}>
      <div className="well-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="well-header">
          <div className="well-title-wrap">
            <div className="well-icon-badge">
              <Compass size={20} className="text-sky-400" />
            </div>
            <div>
              <h3 className="well-title">The Whispering Well</h3>
              <span className="well-subtitle">Drop a pebble to draw a serendipitous thought from the universe</span>
            </div>
          </div>
          <button className="well-close-btn" onClick={onClose} aria-label="Close well">
            <X size={20} />
          </button>
        </div>

        <div className="well-body">
          {!drawnEcho && !rippling && (
            <div className="well-idle-state">
              <div className="well-circle-visual" onClick={handleDropPebble}>
                <div className="ripple-circle r1" />
                <div className="ripple-circle r2" />
                <div className="ripple-circle r3" />
                <span className="drop-pebble-text">Drop a Pebble</span>
              </div>
              <p className="well-explanation">
                Somewhere in the universe, an unspoken word is waiting to meet you. 
                Tap the well to cast your ripple into the archive.
              </p>
            </div>
          )}

          {rippling && (
            <div className="well-rippling-state">
              <div className="water-ripples-anim">
                <div className="ripple-wave wave1" />
                <div className="ripple-wave wave2" />
                <div className="ripple-wave wave3" />
              </div>
              <p className="rippling-text">Listening to the depths of time...</p>
            </div>
          )}

          {drawnEcho && !rippling && (
            <div className="well-result-state">
              <div 
                className="well-echo-card"
                style={{
                  '--theme-color': theme.color,
                  '--theme-border': theme.border,
                  '--theme-bg': theme.bg
                }}
              >
                <div className="well-echo-header">
                  <span className="well-echo-badge">{(drawnEcho?.category || 'Echo').toUpperCase()}</span>
                  <span className="well-echo-id">#{drawnEcho.id}</span>
                </div>

                {drawnEcho.name && (
                  <div className="well-echo-recipient">{drawnEcho.name}</div>
                )}

                <div className="well-echo-message">
                  <Quote size={20} className="text-muted mb-1" />
                  <p>“{drawnEcho.message}”</p>
                </div>

                <div className="well-echo-footer">
                  <button 
                    onClick={handleSendLove}
                    className={`well-love-btn ${loveSent ? 'sent' : ''}`}
                  >
                    <Heart size={16} fill={loveSent ? 'currentColor' : 'none'} />
                    <span>{loveSent ? 'Warmth Sent to Soul' : 'Send Silent Warmth'}</span>
                  </button>

                  <button 
                    onClick={handleDropPebble}
                    className="well-again-btn"
                    title="Drop another pebble"
                  >
                    <RefreshCw size={15} />
                    <span>Drop Another</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
