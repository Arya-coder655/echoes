import React from 'react';
import { X, ShieldCheck, Heart, Sparkles, Feather, Users } from 'lucide-react';

export default function AboutModal({ isOpen, onClose, onOpenBeer }) {
  if (!isOpen) return null;

  return (
    <div className="about-modal-backdrop" onClick={onClose}>
      <div className="about-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="about-modal-header">
          <div className="about-title-row">
            <div className="about-icon-circle">
              <Heart size={20} className="text-accent" />
            </div>
            <div>
              <h2 className="about-title">The Sanctuary of Echoes</h2>
              <span className="about-subtitle">Why this space exists</span>
            </div>
          </div>
          <button className="about-close-btn" onClick={onClose} aria-label="Close about">
            <X size={20} />
          </button>
        </div>

        <div className="about-body-content">
          <p className="about-lead">
            Every day, millions of people carry heavy words they never got to say—unspoken apologies, 
            heartfelt confessions, last goodbyes to loved ones who departed too soon, and quiet dreams left behind.
          </p>

          <p className="about-paragraph">
            <strong>Echoes of the Heart</strong> was created as an anonymous sanctuary where these unspoken 
            words can finally find expression, witness, and release. By speaking your truth into this tranquil space, 
            you let go of the weight you have been carrying alone.
          </p>

          <div className="about-pillars-grid">
            <div className="about-pillar-card">
              <ShieldCheck size={24} className="pillar-icon text-emerald-400" />
              <h4 className="pillar-title">100% Anonymous</h4>
              <p className="pillar-desc">
                No profiles, no email logins, no identity tracking. Your privacy and vulnerability are sacred.
              </p>
            </div>

            <div className="about-pillar-card">
              <Feather size={24} className="pillar-icon text-amber-400" />
              <h4 className="pillar-title">Cathartic Release</h4>
              <p className="pillar-desc">
                Whether on the Regret Wall or Last Words Archive, typing it out brings clarity and inner peace.
              </p>
            </div>

            <div className="about-pillar-card">
              <Users size={24} className="pillar-icon text-indigo-400" />
              <h4 className="pillar-title">Shared Humanity</h4>
              <p className="pillar-desc">
                When you read what others carry, you realize you have never been alone in your sorrow or love.
              </p>
            </div>
          </div>

          <div className="about-guidelines-box">
            <h4 className="guidelines-title">
              <Sparkles size={16} /> Sanctuary Principles
            </h4>
            <ul className="guidelines-list">
              <li>Speak with raw honesty and respect for human emotion.</li>
              <li>Avoid disclosing private phone numbers, physical addresses, or malicious harassment.</li>
              <li>When leaving reflections or comments, offer kindness, empathy, and listening ears.</li>
            </ul>
          </div>
        </div>

        <div className="about-modal-footer">
          {onOpenBeer && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenBeer();
              }}
              className="about-beer-pill-btn"
              title="A little something for the curious ones 🍺"
            >
              <span>🍺</span>
              <span>Meet the Creator</span>
            </button>
          )}
          <button onClick={onClose} className="about-understand-btn">
            Enter with an Open Heart
          </button>
        </div>
      </div>
    </div>
  );
}
