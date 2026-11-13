import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Modern Minimal Pure Black Pull-to-Refresh Component
 * Features: Pure black (#000000) backdrop pill, prominent app logo with an encircling
 * circular progress SVG, clean white typography, and silky spring physics.
 */
export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const containerRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isDragging = useRef(false);
  const rafId = useRef(null);
  const THRESHOLD = 72; // pixels needed to trigger refresh
  const MAX_PULL = 110;

  const triggerRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPullDistance(THRESHOLD);

    try {
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      console.warn('Pull-to-refresh sync notice:', err);
    } finally {
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setIsRefreshing(false);
        setPullDistance(0);
      }, 600);
    }
  }, [onRefresh, THRESHOLD]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchMove = (e) => {
      if (!isDragging.current || isRefreshing) return;
      currentY.current = e.touches[0].clientY;
      const diff = currentY.current - startY.current;

      if (diff > 0 && window.scrollY <= 0) {
        if (e.cancelable && diff > 8) {
          e.preventDefault();
        }
        if (!rafId.current) {
          rafId.current = requestAnimationFrame(() => {
            const currentDiff = currentY.current - startY.current;
            if (currentDiff > 0) {
              const damped = Math.min(MAX_PULL, Math.pow(currentDiff, 0.85) * 1.8);
              setPullDistance(damped);
            }
            rafId.current = null;
          });
        }
      } else if (diff < 0) {
        // User is scrolling downward into content, not pulling to refresh!
        // Immediately disengage so native compositor scrolling takes over 100%
        isDragging.current = false;
        if (pullDistance !== 0) setPullDistance(0);
        window.removeEventListener('touchmove', onTouchMove);
      }
    };

    const onTouchEnd = () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);

      if (!isDragging.current || isRefreshing) return;
      isDragging.current = false;

      setPullDistance((prev) => {
        if (prev >= THRESHOLD) {
          triggerRefresh();
          return THRESHOLD;
        }
        return 0;
      });
    };

    const onTouchStart = (e) => {
      // Only engage if at the absolute top of the page with single finger
      if (window.scrollY <= 0 && !isRefreshing && e.touches.length === 1) {
        startY.current = e.touches[0].clientY;
        isDragging.current = true;
        // Dynamically bind move and end only during active top gesture
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd, { passive: true });
        window.addEventListener('touchcancel', onTouchEnd, { passive: true });
      }
    };

    // Passive touch start ensures zero delay on initiating scroll gestures
    container.addEventListener('touchstart', onTouchStart, { passive: true });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [isRefreshing, pullDistance, triggerRefresh]);

  // SVG circular progress calculation
  const progressRatio = Math.min(1, pullDistance / THRESHOLD);
  const circleRadius = 18;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - progressRatio * circumference;

  return (
    <div 
      ref={containerRef}
      className="echoes-pull-to-refresh-container"
    >
      {/* Floating Pure Black Pull Indicator Pill */}
      <div 
        className={`pull-indicator-pill ${pullDistance > 0 || isRefreshing ? 'is-visible' : ''} ${isRefreshing ? 'is-refreshing' : ''}`}
        style={{
          transform: `translate3d(-50%, ${Math.min(pullDistance, MAX_PULL)}px, 0)`,
          WebkitTransform: `translate3d(-50%, ${Math.min(pullDistance, MAX_PULL)}px, 0)`,
          opacity: pullDistance > 10 || isRefreshing ? 1 : 0
        }}
        aria-hidden={pullDistance === 0 && !isRefreshing}
      >
        <div className="pull-pill-inner">
          {/* Logo framed by SVG circle progress / spinner */}
          <div className="pull-logo-wrapper">
            <svg className="pull-circle-svg" viewBox="0 0 44 44">
              <circle 
                className="pull-circle-bg" 
                cx="22" 
                cy="22" 
                r={circleRadius} 
              />
              <circle 
                className={`pull-circle-bar ${isRefreshing ? 'is-spinning' : ''}`}
                cx="22" 
                cy="22" 
                r={circleRadius} 
                strokeDasharray={circumference}
                strokeDashoffset={isRefreshing ? circumference * 0.25 : strokeDashoffset}
              />
            </svg>

            <img 
              src={`${import.meta.env.BASE_URL}pwa-192x192.png`} 
              alt="Echoes" 
              className={`pull-app-logo ${isRefreshing ? 'is-pulse-spin' : ''}`}
              style={{
                transform: isRefreshing ? undefined : `rotate(${progressRatio * 360}deg)`,
                WebkitTransform: isRefreshing ? undefined : `rotate(${progressRatio * 360}deg)`
              }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `${import.meta.env.BASE_URL}brand-art.jpg`;
              }}
            />
          </div>

          {/* Clean White Typography */}
          <div className="pull-text-content">
            <span className="pull-status-label">
              {isSuccess 
                ? 'Sanctuary refreshed' 
                : isRefreshing 
                  ? 'Refreshing sanctuary...' 
                  : pullDistance >= THRESHOLD 
                    ? 'Release to refresh' 
                    : 'Pull to refresh'}
            </span>
          </div>
        </div>
      </div>

      {/* Child Content (Feed & Main Sanctuary) */}
      <div 
        className="pull-children-wrapper"
        style={{
          transform: pullDistance > 0 ? `translate3d(0, ${pullDistance * 0.45}px, 0)` : undefined,
          WebkitTransform: pullDistance > 0 ? `translate3d(0, ${pullDistance * 0.45}px, 0)` : undefined,
          transition: isDragging.current ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1)'
        }}
      >
        {children}
      </div>
    </div>
  );
}
