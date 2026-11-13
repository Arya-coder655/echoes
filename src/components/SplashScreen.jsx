import React, { useEffect, useState, useRef } from 'react';

/**
 * Modern Minimal Pure Black Splash Screen
 * Features: Pure black (#000000) background, prominent app logo with cosmic breathing pulse,
 * white typography, and silky smooth fade-out transition.
 */
export default function SplashScreen({ isReady = true, onFinish, minDuration = 1200 }) {
  const [mounted, setMounted] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const mountTimeRef = useRef(Date.now());
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    if (!isReady) return;

    const elapsed = Date.now() - mountTimeRef.current;
    const remaining = Math.max(0, minDuration - elapsed);

    let unmountTimer;
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
      unmountTimer = setTimeout(() => {
        setMounted(false);
        onFinishRef.current?.();
      }, 500); // 500ms fade-out transition
    }, remaining);

    return () => {
      clearTimeout(fadeTimer);
      if (unmountTimer) clearTimeout(unmountTimer);
    };
  }, [isReady, minDuration]);

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
