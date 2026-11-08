import React, { useState } from 'react';
import { X, Flame, Sparkles, RefreshCw, Feather } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function CatharsisRitualModal({ isOpen, onClose, onToast }) {
  const [secretText, setSecretText] = useState('');
  const [isBurning, setIsBurning] = useState(false);
  const [hasBurned, setHasBurned] = useState(false);

  if (!isOpen) return null;

  const handleBurn = (e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    if (isBurning || !secretText.trim()) return;

    setIsBurning(true);

    // Fire ember particle effect
    setTimeout(() => {
      try {
        confetti({
          particleCount: 80,
          angle: 90,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#fc2904', '#ff7a59', '#fbbf24', '#ffffff']
        });
      } catch (err) {}
    }, 400);

    setTimeout(() => {
      setIsBurning(false);
      setHasBurned(true);
      setSecretText('');
      onToast('Your burden was consumed by fire and returned to stardust.');
    }, 2200);
  };

  const handleReset = () => {
    setHasBurned(false);
    setSecretText('');
  };

  return (
    <div className="ritual-modal-backdrop" onClick={onClose}>
      <div className="ritual-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="ritual-header">
          <div className="ritual-title-wrap">
            <div className="ritual-flame-icon">
              <Flame size={20} className="text-accent" />
            </div>
            <div>
              <h3 className="ritual-title">The Sacred Hearth</h3>
              <span className="ritual-subtitle">Write, ignite, and release what you can no longer carry</span>
            </div>
          </div>
          <button className="ritual-close-btn" onClick={onClose} aria-label="Close ritual">
            <X size={20} />
          </button>
        </div>

        <div className="ritual-body">
          {!hasBurned ? (
            <form onSubmit={handleBurn} noValidate className="ritual-form">
              <p className="ritual-prompt">
                Some words are not meant to be read by human eyes. Write your deepest guilt, 
                unspoken heartbreak, or painful secret below. Once burned, it will be destroyed forever.
              </p>

              <div className={`parchment-container ${isBurning ? 'burning-embers' : ''}`}>
                <textarea
                  value={secretText}
                  onChange={(e) => setSecretText(e.target.value)}
                  placeholder="Confess to the flames... (e.g. 'I still haven't forgiven myself for leaving without saying goodbye.')"
                  className="parchment-textarea"
                  maxLength={500}
                  disabled={isBurning}
                />
                {isBurning && (
                  <div className="fire-overlay">
                    <div className="fire-particles" />
                    <span className="fire-text-dissolve">Dissolving into ashes...</span>
                  </div>
                )}
              </div>

              <div className="ritual-footer-bar">
                <span className="ritual-hint">
                  <Feather size={14} /> Never saved to any database. Completely ephemeral.
                </span>
                <button
                  type="button"
                  onClick={handleBurn}
                  disabled={isBurning || !secretText.trim()}
                  className="burn-ignite-btn"
                  aria-label="Ignite and burn reflection"
                >
                  <Flame size={16} />
                  <span>{isBurning ? 'Consuming by Fire...' : 'Ignite & Let Go Forever'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="ritual-ashes-state">
              <div className="ashes-icon-wrap">
                <Sparkles size={36} className="text-amber-400" />
              </div>
              <h3 className="ashes-title">It Has Turned to Ash.</h3>
              <p className="ashes-description">
                Your burden no longer exists in this world. The flames have released its weight into the universe.
                Take a long, deep breath. You are permitted to forgive yourself and move forward.
              </p>
              <div className="ashes-actions">
                <button onClick={handleReset} className="burn-another-btn">
                  <RefreshCw size={15} />
                  <span>Release Another Burden</span>
                </button>
                <button onClick={onClose} className="peace-btn">
                  Walk in Peace
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
