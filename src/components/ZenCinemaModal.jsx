import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  Flame, 
  Volume2, 
  VolumeX, 
  User 
} from 'lucide-react';
import { soundscape } from '../utils/audio';
import { THEME_PALETTES } from '../data/initialEchoes';

export default function ZenCinemaModal({ isOpen, echoes, onClose, onToast }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [candlesLit, setCandlesLit] = useState(() => {
    try {
      return parseInt(localStorage.getItem('zen_candles_lit') || '1428', 10);
    } catch (e) {
      return 1428;
    }
  });
  const [userLitCandle, setUserLitCandle] = useState(false);
  const [isAudioActive, setIsAudioActive] = useState(() => {
    try {
      return soundscape.isPlaying;
    } catch (e) {
      return false;
    }
  });

  const canvasRef = useRef(null);
  const autoPlayTimerRef = useRef(null);
  const touchStartX = useRef(0);

  // Sync with Soundscape Engine
  useEffect(() => {
    const unsub = soundscape.subscribe((eng) => {
      setIsAudioActive(eng.isPlaying);
    });
    return () => unsub();
  }, []);

  const handleToggleSound = () => {
    try {
      soundscape.toggle();
      setIsAudioActive(soundscape.isPlaying);
    } catch (e) {
      console.warn('Sound toggle error:', e);
    }
  };

  const handleNext = () => {
    if (!echoes || echoes.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % echoes.length);
  };

  const handlePrev = () => {
    if (!echoes || echoes.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + echoes.length) % echoes.length);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      try {
        if (e.key === 'Escape') {
          onClose();
        } else if (e.key === 'ArrowRight') {
          handleNext();
        } else if (e.key === 'ArrowLeft') {
          handlePrev();
        } else if (e.key === ' ') {
          e.preventDefault();
          setIsAutoPlaying((prev) => !prev);
        }
      } catch (err) {
        console.warn('Zen keyboard handler error:', err);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, echoes?.length]);

  // Rain on window glass canvas simulation
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Droplets
    const drops = [];
    const count = 45;
    for (let i = 0; i < count; i++) {
      drops.push({
        x: Math.random() * width,
        y: Math.random() * height,
        length: Math.random() * 20 + 10,
        speed: Math.random() * 4 + 2,
        opacity: Math.random() * 0.4 + 0.1,
        width: Math.random() * 1.5 + 0.5
      });
    }

    let lastRainTime = performance.now();

    const renderRain = (now) => {
      try {
        if (!ctx) return;
        const dt = Math.min(50, now - lastRainTime) / 16.67;
        lastRainTime = now;

        ctx.clearRect(0, 0, width, height);

        drops.forEach((d) => {
          d.y += d.speed * dt;
          if (d.y > height) {
            d.y = -20;
            d.x = Math.random() * width;
          }

          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x, d.y + d.length);
          ctx.strokeStyle = `rgba(200, 220, 255, ${d.opacity})`;
          ctx.lineWidth = d.width;
          ctx.lineCap = 'round';
          ctx.stroke();
        });

        animId = requestAnimationFrame(renderRain);
      } catch (err) {
        console.warn('Rain animation stopped:', err);
      }
    };

    animId = requestAnimationFrame(renderRain);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isOpen]);

  // Auto-advance loop
  useEffect(() => {
    if (!isOpen || !isAutoPlaying || !echoes || echoes.length === 0) return;

    autoPlayTimerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % echoes.length);
    }, 14000); // 14 seconds per echo

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [isOpen, isAutoPlaying, echoes?.length]);

  if (!isOpen || !echoes || echoes.length === 0) return null;

  const safeIndex = (currentIndex >= 0 && currentIndex < echoes.length) ? currentIndex : 0;
  const currentEcho = echoes[safeIndex] || echoes[0];
  if (!currentEcho) return null;

  const defaultTheme = {
    color: '#fc2904',
    secondary: '#ff4b2b',
    border: 'rgba(252, 41, 4, 0.35)',
    glow: 'rgba(252, 41, 4, 0.25)'
  };
  const theme = (currentEcho?.themeId && THEME_PALETTES.find((t) => t.id === currentEcho.themeId)) 
    || THEME_PALETTES[0] 
    || defaultTheme;

  const handleLightCandle = () => {
    if (!userLitCandle) {
      const nextCount = candlesLit + 1;
      setCandlesLit(nextCount);
      setUserLitCandle(true);
      try {
        localStorage.setItem('zen_candles_lit', nextCount.toString());
      } catch (e) {}
      if (onToast) onToast('You lit a candle for this soul 🕯️');
    }
  };

  const handleTouchStart = (e) => {
    if (e.touches && e.touches.length > 0) {
      touchStartX.current = e.touches[0].clientX;
    }
  };
  const handleTouchEnd = (e) => {
    if (e.changedTouches && e.changedTouches.length > 0) {
      const diff = touchStartX.current - e.changedTouches[0].clientX;
      if (diff > 45) handleNext();
      else if (diff < -45) handlePrev();
    }
  };

  return (
    <div 
      className="zen-cinema-fullscreen" 
      onTouchStart={handleTouchStart} 
      onTouchEnd={handleTouchEnd}
      style={{
        '--theme-glow': theme?.glow || 'rgba(252, 41, 4, 0.25)',
        '--theme-color': theme?.color || '#fc2904'
      }}
    >
      {/* Rain canvas overlay */}
      <canvas ref={canvasRef} className="zen-rain-canvas" />

      {/* Background ambient lighting vignette */}
      <div 
        className="zen-ambient-glow"
        style={{
          '--glow-color': theme?.glow || 'rgba(252, 41, 4, 0.25)'
        }}
      />

      {/* Top Bar */}
      <div className="zen-top-bar">
        <div className="zen-cinema-brand">
          <span className="zen-dot" />
          <span className="zen-title">Zen Cinema • Midnight Stream</span>
        </div>

        <div className="zen-top-actions">
          <button 
            type="button"
            onClick={handleToggleSound}
            className={`zen-icon-btn ${isAudioActive ? 'active' : ''}`}
            title={isAudioActive ? "Mute Rain Ambience" : "Play Rain Ambience"}
            aria-label="Toggle Rain Ambience"
          >
            {isAudioActive ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          <button 
            type="button"
            onClick={() => setIsAutoPlaying((prev) => !prev)}
            className={`zen-icon-btn ${isAutoPlaying ? 'active' : ''}`}
            title={isAutoPlaying ? "Pause Auto-drift" : "Resume Auto-drift"}
            aria-label={isAutoPlaying ? "Pause Auto-drift" : "Resume Auto-drift"}
          >
            {isAutoPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>

          <button 
            type="button"
            onClick={onClose} 
            className="zen-close-btn" 
            title="Exit Zen Cinema (or press Esc)"
            aria-label="Exit Cinema"
          >
            <X size={18} />
            <span>Exit</span>
          </button>
        </div>
      </div>

      {/* Center Cinematic Stage */}
      <div className="zen-cinema-stage">
        <button 
          type="button"
          className="zen-nav-btn prev" 
          onClick={handlePrev} 
          aria-label="Previous echo"
        >
          <ChevronLeft size={36} />
        </button>

        <div className="zen-echo-container">
          <div className="zen-meta-row">
            <span 
              className="zen-category-pill" 
              style={{ 
                color: theme?.color || '#fc2904', 
                borderColor: theme?.border || 'rgba(252, 41, 4, 0.35)' 
              }}
            >
              {(currentEcho.category || 'Echo').toUpperCase()}
            </span>
            <span className="zen-index-counter">
              {safeIndex + 1} of {echoes.length}
            </span>
          </div>

          {currentEcho.name && (
            <div className="zen-recipient-name">
              <User size={16} style={{ color: theme?.color || '#fc2904' }} />
              <span>{currentEcho.name}</span>
            </div>
          )}

          <blockquote className="zen-quote-text">
            “{currentEcho.message || ''}”
          </blockquote>

          {currentEcho.image && (
            <div className="zen-image-preview">
              <img src={currentEcho.image} alt="Echo attachment" />
            </div>
          )}

          <div className="zen-actions-strip">
            <button 
              type="button"
              onClick={handleLightCandle} 
              className={`zen-candle-btn ${userLitCandle ? 'lit' : ''}`}
              title="Light a vigil candle for this soul"
            >
              <Flame size={18} className="flame-flicker-icon" />
              <span>{userLitCandle ? 'Candle Burning' : 'Light a Candle for this Soul'}</span>
              <span className="candle-count-badge">{candlesLit}</span>
            </button>
          </div>
        </div>

        <button 
          type="button"
          className="zen-nav-btn next" 
          onClick={handleNext} 
          aria-label="Next echo"
        >
          <ChevronRight size={36} />
        </button>
      </div>

      {/* Bottom Floating Timeline */}
      <div className="zen-bottom-bar">
        <span className="zen-hint">
          {isAutoPlaying ? "Auto-drifting every 14 seconds with real rain... relax and immerse (Press Esc to exit)." : "Paused. Use arrows or swipe to browse (Press Esc to exit)."}
        </span>
      </div>
    </div>
  );
}
