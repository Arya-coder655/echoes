import React, { useEffect, useState } from 'react';

/**
 * Modern Minimal Pure Black Splash Screen
 * Features: Pure black (#000000) background, prominent app logo with cosmic breathing pulse,
 * white typography, and silky smooth fade-out transition.
 */
export default function SplashScreen({ isReady = true, onFinish, minDuration = 1200 }) {
  const [mounted, setMounted] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Ensure the splash screen stays visible for at least minDuration for premium brand feel
    const startTime = Date.now();

    const checkAndDismiss = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minDuration - elapsed);

      setTimeout(() => {
        setIsFading(true);
        setTimeout(() => {
          setMounted(false);
          onFinish?.();
        }, 500); // 500ms fade-out transition
      }, remaining);
    };

    if (isReady) {
      checkAndDismiss();
    }
  }, [isReady, minDuration, onFinish]);

  if (!mounted) return null;

  return (
    <div 
      className={`echoes-splash-screen ${isFading ? 'is-fading' : ''}`}
      role="status"
      aria-label="Welcome to Echoes Sanctuary"
    >
      <div className="splash-ambient-glow" />
      
      <div className="splash-content-container">
        {/* Prominent App Logo with Orbital Ring and Breathing Pulse */}
        <div className="splash-logo-wrapper">
          <div className="splash-orbital-ring" />
          <div className="splash-logo-frame">
            <img 
              src={`${import.meta.env.BASE_URL}pwa-192x192.png`} 
              alt="Echoes Logo" 
              className="splash-logo-img"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `${import.meta.env.BASE_URL}brand-art.jpg`;
              }}
            />
          </div>
        </div>

        {/* Clean, Modern White Typography */}
        <div className="splash-typography-block">
          <h1 className="splash-title">ECHOES</h1>
          <p className="splash-tagline">Where unspoken words finally find peace.</p>
        </div>

        {/* Minimal Progress Indicator */}
        <div className="splash-status-indicator">
          <div className="splash-pulse-dot" />
          <span className="splash-status-text">Entering sanctuary</span>
        </div>
      </div>
    </div>
  );
}
