import React from 'react';

/**
 * Modern Minimal Pure Black Circle Loader
 * Features: Pure black (#000000) backdrop, prominent app logo centered inside
 * an orbiting SVG circular loading ring, and pristine white typography.
 */
export default function CircleLoader({ 
  message = "Opening sanctuary portal...", 
  subtext = "A quiet moment of reflection",
  isFullScreen = true 
}) {
  return (
    <div 
      className={`echoes-circle-loader-backdrop ${isFullScreen ? 'is-fullscreen' : 'is-inline'}`}
      role="status" 
      aria-label={message}
    >
      <div className="circle-loader-ambient-glow" />

      <div className="circle-loader-card">
        {/* Dual Ring Circular Loader Framing the App Logo */}
        <div className="circle-loader-graphic-wrap">
          <svg className="circle-loader-svg" viewBox="0 0 100 100">
            {/* Background static track */}
            <circle 
              className="circle-track-bg" 
              cx="50" 
              cy="50" 
              r="44" 
            />
            {/* Spinning glowing gradient ring */}
            <circle 
              className="circle-track-spinner" 
              cx="50" 
              cy="50" 
              r="44" 
            />
          </svg>

          {/* Prominent App Logo Centered Inside the Circle */}
          <div className="circle-loader-logo-inner">
            <img 
              src={`${import.meta.env.BASE_URL}pwa-192x192.png`} 
              alt="Echoes Logo" 
              className="circle-loader-logo-img"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `${import.meta.env.BASE_URL}brand-art.jpg`;
              }}
            />
          </div>
        </div>

        {/* Clean, Modern White Typography */}
        <div className="circle-loader-text-wrap">
          <h4 className="circle-loader-title">Echoes Sanctuary</h4>
          <p className="circle-loader-message">{message}</p>
          {subtext && <span className="circle-loader-subtext">{subtext}</span>}
        </div>
      </div>
    </div>
  );
}
