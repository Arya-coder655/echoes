import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Heart, 
  Sparkles, 
  Feather, 
  Users, 
  KeyRound, 
  Lock, 
  Unlock, 
  Crown, 
  Award, 
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function AboutModal({ isOpen, onClose }) {
  const [isRevealed, setIsRevealed] = useState(() => {
    return typeof window !== 'undefined' && localStorage.getItem('echoes_architect_revealed') === 'true';
  });
  const [guess, setGuess] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [shake, setShake] = useState(false);

  if (!isOpen) return null;

  const handleSolveRiddle = (e) => {
    e.preventDefault();
    const cleanGuess = guess.toLowerCase().trim();
    const validAnswers = [
      'arya',
      'arya more',
      'aryamore',
      'echo',
      'echoes',
      'architect',
      'developer',
      'creator',
      'founder'
    ];

    if (validAnswers.includes(cleanGuess)) {
      setIsRevealed(true);
      setErrorMsg('');
      localStorage.setItem('echoes_architect_revealed', 'true');
      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#fc2904', '#ffd700', '#6366f1', '#a855f7', '#34d399', '#ffffff']
        });
      } catch (err) {
        // safe fallback
      }
    } else {
      setErrorMsg('The sanctuary whispers: "Not quite... seek the hint below."');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  const handleResetRiddle = () => {
    setIsRevealed(false);
    setGuess('');
    setErrorMsg('');
    setShowHint(false);
    localStorage.removeItem('echoes_architect_revealed');
  };

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

          {/* ✦ EASTER EGG: THE ARCHITECT'S RIDDLE & REVEAL ✦ */}
          {!isRevealed ? (
            <div className="architect-riddle-container">
              <div className="architect-riddle-header">
                <div className="architect-riddle-title-row">
                  <KeyRound size={18} className="architect-riddle-icon" />
                  <h4 className="architect-riddle-title">The Inscription of the Architect</h4>
                </div>
                <span className="architect-riddle-badge">
                  <Lock size={12} /> Easter Egg Hunt
                </span>
              </div>

              <blockquote className="architect-riddle-poem">
                "I carved this sanctuary from midnight code to shelter unsaid goodbyes.<br />
                Four letters in the silence, where no heavy secret dies.<br />
                Speak the name of the architect who gave Echoes its heartbeat."
              </blockquote>

              <form onSubmit={handleSolveRiddle} className="architect-form-row">
                <input
                  type="text"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder="Enter the architect's name..."
                  className={`architect-input ${shake ? 'shake' : ''}`}
                  autoComplete="off"
                />
                <button type="submit" className="architect-unlock-btn">
                  <Unlock size={14} />
                  <span>Unveil</span>
                </button>
              </form>

              {errorMsg && <p className="architect-error-text">{errorMsg}</p>}

              <button 
                type="button" 
                onClick={() => setShowHint(!showHint)}
                className="architect-hint-toggle"
              >
                <HelpCircle size={13} />
                <span>{showHint ? "Hide clue" : "Need a clue?"}</span>
              </button>

              {showHint && (
                <div className="architect-hint-box">
                  ✨ <strong>Clue from the stars:</strong> The founder's first name begins with <strong>A</strong> and ends with <strong>A</strong> (4 letters). Or simply enter the developer's name: <em>Arya More</em>.
                </div>
              )}
            </div>
          ) : (
            <div className="architect-reveal-card">
              <div className="architect-badge-row">
                <span className="architect-status-tag">
                  <Crown size={13} /> Sanctuary Founder & Architect
                </span>
                <button 
                  type="button" 
                  onClick={handleResetRiddle} 
                  className="architect-relock-btn" 
                  title="Lock Easter egg again"
                >
                  <RotateCcw size={13} /> Relock
                </button>
              </div>

              <div className="architect-profile">
                <div className="architect-avatar">
                  AM
                  <Crown size={15} className="architect-crown-icon" />
                </div>
                <div className="architect-names">
                  <h3>Arya More</h3>
                  <p>Founder & Lead Developer of Echoes</p>
                </div>
              </div>

              <p className="architect-quote-text">
                "I built this sanctuary with quiet devotion so no soul has to carry 
                the crushing weight of unspoken words alone. May every heart that 
                wanders here find solace, release, and peace."
              </p>

              <div className="architect-tags-cloud">
                <span className="architect-pill">💻 Full-Stack Architecture</span>
                <span className="architect-pill">🐬 TiDB Cloud MySQL</span>
                <span className="architect-pill">⚛️ React & Node Express</span>
                <span className="architect-pill">🔒 Zero-PII Anonymous Privacy</span>
              </div>

              <div className="architect-trophy-row">
                <span className="architect-trophy-text">
                  <Award size={15} /> <strong>Achievement:</strong> Sanctuary Detective
                </span>
                <span>You unlocked the founder's secret!</span>
              </div>
            </div>
          )}
        </div>

        <div className="about-modal-footer">
          <button onClick={onClose} className="about-understand-btn">
            Enter with an Open Heart
          </button>
        </div>
      </div>
    </div>
  );
}
