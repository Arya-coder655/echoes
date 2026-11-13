import React, { useState } from 'react';
import { X, Flame, Sparkles, RefreshCw, Feather } from 'lucide-react';
import confetti from 'canvas-confetti';
import ThanosAshBurn from './ThanosAshBurn';

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

    // Initial spark burst
    setTimeout(() => {
      try {
        confetti({
          particleCount: 50,
          angle: 90,
          spread: 70,
          origin: { y: 0.65 },
          colors: ['#fc2904', '#ff7a59', '#fbbf24', '#ffffff']
        });
      } catch (err) {}
    }, 300);
  };

  const handleAshComplete = () => {
    setIsBurning(false);
    setHasBurned(true);
    setSecretText('');
    if (typeof onToast === 'function') {
      onToast('Your burden was consumed by fire and dissolved into stardust.');
    }
  };

  const handleKeyDown = (e) => {
    // Enter key (without Shift) triggers the ignite action
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBurn();
    }
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
                unspoken heartbreak, or painful secret below. Once burned, it will disintegrate into dust forever.
              </p>

              <div className={`parchment-container ${isBurning ? 'burning-embers thanos-disintegrating' : ''}`}>
                <textarea
                  value={secretText}
                  onChange={(e) => setSecretText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Confess to the flames... (e.g. 'I still haven't forgiven myself for leaving without saying goodbye.') Press Enter to let go forever."
                  className={`parchment-textarea ${isBurning ? 'thanos-text-dissolve' : ''}`}
                  maxLength={500}
                  disabled={isBurning}
                />

                {/* Thanos Snap Ash Burn Disintegration Overlay */}
                <ThanosAshBurn 
                  isBurning={isBurning} 
                  onComplete={handleAshComplete} 
                  duration={2400} 
                />

                {isBurning && (
                  <div className="fire-overlay">
                    <span className="fire-text-dissolve">Disintegrating into ash...</span>
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
                  className={`burn-ignite-btn ${isBurning ? 'is-burning' : ''}`}
                  aria-label="Ignite and let go forever"
                >
                  <Flame size={16} />
                  <span>{isBurning ? 'Disintegrating to Ash...' : 'Ignite & Let Go Forever'}</span>
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
