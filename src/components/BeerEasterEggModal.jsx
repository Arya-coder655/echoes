import React, { useState } from 'react';
import { X, Heart, ExternalLink } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function BeerEasterEggModal({ isOpen, onClose }) {
  const [cheersMessage, setCheersMessage] = useState(false);

  if (!isOpen) return null;

  const handleBuyBeer = () => {
    try {
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ffd166', '#f4a261', '#e76f51', '#2a9d8f', '#ffffff']
      });
    } catch (err) {
      // safe fallback
    }

    setCheersMessage(true);
    setTimeout(() => setCheersMessage(false), 4000);
  };

  return (
    <div className="beer-modal-backdrop" onClick={onClose}>
      <div className="beer-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="beer-modal-close-btn" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="beer-card-badge">OH, YOU FOUND ME!</div>

        <h2 className="beer-card-heading">Hey, I'm Arya More.</h2>
        <p className="beer-card-roles">Founder · Creator · Developer</p>

        <div className="beer-card-divider" />

        <div className="beer-card-section">
          <h3 className="beer-section-title">
            <span className="beer-section-emoji">🍻</span> Buy me a beer?
          </h3>
          <p className="beer-section-desc">
            If you enjoyed this little corner of the internet, consider buying me a beer. 
            Your support keeps me creating cool things.
          </p>

          <button 
            type="button" 
            onClick={handleBuyBeer} 
            className="beer-cta-button"
          >
            Buy me a beer 🍺
          </button>

          {cheersMessage && (
            <div className="beer-cheers-toast">
              <span>🍻 Cheers! Thank you so much for the love and support!</span>
            </div>
          )}
        </div>

        <p className="beer-card-footer-note">
          Made with curiosity &amp; countless lines of code.
        </p>
      </div>
    </div>
  );
}
