import React, { useState } from 'react';
import { X, Smartphone } from 'lucide-react';
import confetti from 'canvas-confetti';

const UPI_ID = '9322794668-3@ybl';
const PAYEE_NAME = 'Arya More';

export default function BeerEasterEggModal({ isOpen, onClose }) {
  const [selectedAmount, setSelectedAmount] = useState(100);

  if (!isOpen) return null;

  const upiLink = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(PAYEE_NAME)}&cu=INR&am=${selectedAmount}&tn=${encodeURIComponent('Buy a beer for Arya More')}`;
  // High-contrast, clean black-on-white QR code that 100% of Indian UPI apps scan instantly
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(upiLink)}`;

  const handlePayViaApp = () => {
    try {
      confetti({
        particleCount: 75,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#ffd166', '#f4a261', '#e76f51', '#2a9d8f', '#ffffff']
      });
    } catch (err) {}

    // On mobile devices, this opens the UPI chooser (GPay / PhonePe / Paytm / BHIM)
    window.location.href = upiLink;
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

          {/* Amount Selection */}
          <div className="beer-amount-selector">
            <button
              type="button"
              onClick={() => setSelectedAmount(50)}
              className={`beer-amount-pill ${selectedAmount === 50 ? 'active' : ''}`}
            >
              🍺 ₹50
            </button>
            <button
              type="button"
              onClick={() => setSelectedAmount(100)}
              className={`beer-amount-pill ${selectedAmount === 100 ? 'active' : ''}`}
            >
              🍻 ₹100
            </button>
            <button
              type="button"
              onClick={() => setSelectedAmount(250)}
              className={`beer-amount-pill ${selectedAmount === 250 ? 'active' : ''}`}
            >
              🌟 ₹250
            </button>
          </div>

          {/* ALWAYS-VISIBLE UPI QR CODE (Phone number hidden from text) */}
          <div className="beer-qr-card">
            <div className="beer-qr-img-wrapper">
              <img 
                src={qrCodeUrl} 
                alt={`UPI QR Code for ₹${selectedAmount}`} 
                className="beer-qr-image"
                loading="eager"
              />
            </div>
            <p className="beer-qr-caption">
              Scan with <strong>GPay, PhonePe, Paytm</strong>, or any UPI app to pay <strong>₹{selectedAmount}</strong>
            </p>
          </div>

          {/* Mobile 1-Tap App Payment Button */}
          <button 
            type="button" 
            onClick={handlePayViaApp} 
            className="beer-cta-button"
          >
            <Smartphone size={17} />
            <span>Open in UPI App (GPay / PhonePe) 🍺</span>
          </button>
        </div>

        <p className="beer-card-footer-note">
          Made with curiosity &amp; countless lines of code.
        </p>
      </div>
    </div>
  );
}
