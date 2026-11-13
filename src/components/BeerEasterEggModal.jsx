import React, { useState } from 'react';
import { X, Smartphone } from 'lucide-react';
import confetti from 'canvas-confetti';

const UPI_ID = '9322794668-3@ybl';
const PAYEE_NAME = 'Arya More';

export default function BeerEasterEggModal({ isOpen, onClose }) {
  const [selectedAmount, setSelectedAmount] = useState(150);
  const [hasPaid, setHasPaid] = useState(false);
  const [isSadDismissing, setIsSadDismissing] = useState(false);

  if (!isOpen) return null;

  const upiLink = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(PAYEE_NAME)}&cu=INR&am=${selectedAmount}&tn=${encodeURIComponent('Buy a beer for Arya More')}`;
  // High-contrast, clean black-on-white QR code that 100% of Indian UPI apps scan instantly
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(upiLink)}`;

  const handlePayViaApp = () => {
    setHasPaid(true);
    try {
      confetti({
        particleCount: 75,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#ffd166', '#f4a261', '#e76f51', '#2a9d8f', '#ffffff']
      });
    } catch {
      // safe fallback
    }

    // On mobile devices, this opens the UPI chooser (GPay / PhonePe / Paytm / BHIM)
    window.location.href = upiLink;
  };

  const handleDirectClose = () => {
    if (onClose) {
      onClose(hasPaid);
    }
  };

  const handleMaybeNextTime = () => {
    if (hasPaid) {
      handleDirectClose();
      return;
    }
    // Minimal sad micro-animation on the card before closing
    setIsSadDismissing(true);
    setTimeout(() => {
      setIsSadDismissing(false);
      if (onClose) {
        onClose(false);
      }
    }, 450);
  };

  return (
    <div className="beer-modal-backdrop" onClick={handleDirectClose}>
      <div 
        className={`beer-modal-card ${isSadDismissing ? 'beer-card-sad-exit' : ''}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="beer-modal-close-btn" 
          onClick={handleDirectClose} 
          aria-label="Close"
          title="Close"
        >
          <X size={18} />
        </button>

        <div className="beer-card-badge">
          {isSadDismissing ? '🥺 NO BEER TODAY?' : 'OH, YOU FOUND ME!'}
        </div>

        <h2 className="beer-card-heading">
          {isSadDismissing ? "It's okay, maybe next time!" : "Hey, I'm Arya More."}
        </h2>
        <p className="beer-card-roles">
          {isSadDismissing ? 'Founder · Water Drinker Today 💧' : 'Founder · Creator · Developer'}
        </p>

        <div className="beer-card-divider" />

        <div className="beer-card-section">
          <h3 className="beer-section-title">
            <span className="beer-section-emoji">{isSadDismissing ? '🥺💧' : '🍻'}</span> 
            <span>{isSadDismissing ? 'Arya sheds a silent tear' : 'Buy me a beer?'}</span>
          </h3>
          <p className="beer-section-desc">
            {isSadDismissing 
              ? 'Thank you for exploring this corner of the internet anyway!' 
              : 'If you enjoyed this little corner of the internet, consider buying me a beer. Your support keeps me creating cool things.'}
          </p>

          {/* Amount Selection */}
          <div className="beer-amount-selector">
            <button
              type="button"
              onClick={() => setSelectedAmount(90)}
              className={`beer-amount-pill ${selectedAmount === 90 ? 'active' : ''}`}
            >
              🍺 ₹90
            </button>
            <button
              type="button"
              onClick={() => setSelectedAmount(150)}
              className={`beer-amount-pill ${selectedAmount === 150 ? 'active' : ''}`}
            >
              🍻 ₹150
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

          {/* Minimal "Maybe next time" button */}
          <button 
            type="button" 
            onClick={handleMaybeNextTime}
            className="beer-maybe-later-btn"
          >
            <span>Maybe next time 🥺</span>
          </button>
        </div>

        <p className="beer-card-footer-note">
          Made with curiosity &amp; countless lines of code.
        </p>
      </div>
    </div>
  );
}
