import React, { useState, useCallback } from 'react';
import { X, Flame, Sparkles, RefreshCw, Feather } from 'lucide-react';
import ThanosAshBurn from './ThanosAshBurn';

export default function CatharsisRitualModal({ isOpen, onClose, onToast }) {
  const [secretText, setSecretText] = useState('');
  const [isBurning, setIsBurning] = useState(false);
  const [hasBurned, setHasBurned] = useState(false);

  const handleAshComplete = useCallback(() => {
    setIsBurning(false);
    setHasBurned(true);
    setSecretText('');
    if (typeof onToast === 'function') {
      onToast('Your burden was consumed by fire and dissolved into stardust.');
    }
  }, [onToast]);

  if (!isOpen) return null;

  const handleBurn = (e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    if (isBurning || !secretText.trim()) return;

    // Trigger whole-card Thanos Snap disintegration
    setIsBurning(true);
  };


  const handleKeyDown = (e) => {
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
    <div className="ritual-modal-backdrop" onClick={isBurning ? undefined : onClose}>
      <div 
        className="ritual-modal-panel" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Particle & Ash Physics Engine Overlay */}
        <ThanosAshBurn 
          isBurning={isBurning} 
          onComplete={handleAshComplete} 
          duration={2800} 
          isFullCard={true}
        />

        {!hasBurned ? (
          <div className="ritual-card-inner">
            {/* Header */}
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
              <button 
                className="ritual-close-btn" 
                onClick={onClose} 
                aria-label="Close ritual"
                disabled={isBurning}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="ritual-body">
              <form onSubmit={handleBurn} noValidate className="ritual-form">
                <p className="ritual-prompt">
                  Some words are not meant to be read by human eyes. Write your deepest guilt, 
                  unspoken heartbreak, or painful secret below. Once burned, it will disintegrate into dust forever.
                </p>

                <div className="parchment-container">
                  <textarea
                    value={secretText}
                    onChange={(e) => setSecretText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Confess to the flames... (e.g. 'I still haven't forgiven myself for leaving without saying goodbye.') Press Enter to let go forever."
                    className="parchment-textarea"
                    maxLength={500}
                    disabled={isBurning}
                  />
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
                    aria-label="Burn Letter"
                    title="Burn Letter (Let Go Forever)"
                  >
                    <Flame size={16} />
                    <span>{isBurning ? 'Disintegrating to Ash...' : 'Burn Letter'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
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
  );
}
