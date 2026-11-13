import React, { useState, useEffect, useMemo } from 'react';
import { 
  Feather, 
  Heart, 
  Share2, 
  Sparkles, 
  MessageCircle, 
  RefreshCw 
} from 'lucide-react';

const DAILY_QUOTES = [
  "“Some words are too heavy for tongues to speak, yet too loud for hearts to hold in silence.”",
  "“We leave the most important things unsaid, and spend lifetimes wishing we had whispered them.”",
  "“The saddest distance between two people is the bridge of words that was never crossed.”",
  "“To grieve what could have been is to honor the love that dared to dream.”",
  "“Forgive yourself for the silence that once felt like the only way to survive.”"
];

function Hero({ 
  echoes, 
  onOpenComposer, 
  onOpenMixer, 
  onOpenZenCinema, 
  onOpenRitual, 
  activeSouls = 24
}) {
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % DAILY_QUOTES.length);
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  const totalEchoes = echoes.length;
  const totalHearts = useMemo(
    () => echoes.reduce((acc, curr) => acc + (curr.likes || 0), 0),
    [echoes]
  );
  const totalShares = useMemo(
    () => echoes.reduce((acc, curr) => acc + (curr.shares || 0), 0),
    [echoes]
  );

  return (
    <section className="hero-section">
      <div className="hero-glow-blob" />
      <div className="hero-content">
        <div className="hero-badge">
          <Sparkles size={14} className="text-accent" />
          <span>Anonymous Emotional Haven</span>
          <span className="hero-badge-separator">•</span>
          <span className="hero-badge-souls">
            <span className="candle-flicker">🕯️</span>
            <span>{activeSouls} Active Souls</span>
          </span>
        </div>

        <h1 className="hero-title">
          Where Unspoken Words <br />
          <span className="hero-title-gradient">Finally Find Peace.</span>
        </h1>

        <p className="hero-description">
          Share your deepest regrets, unposted love letters, and final farewells completely anonymously.
        </p>

        {/* Rotating Emotional Whisper Quote */}
        <div className="hero-quote-card">
          <div className="quote-icon">
            <Feather size={20} />
          </div>
          <p className="quote-text">{DAILY_QUOTES[quoteIndex]}</p>
          <button 
            className="quote-refresh-btn"
            onClick={() => setQuoteIndex((prev) => (prev + 1) % DAILY_QUOTES.length)}
            title="Read another quote"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Stats Strip */}
        <div className="hero-stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrap stat-echo">
              <MessageCircle size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-number">{totalEchoes}</span>
              <span className="stat-label">Echoes Archived</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap stat-hearts">
              <Heart size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-number">{totalHearts}</span>
              <span className="stat-label">Hearts Touched</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap stat-shares">
              <Share2 size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-number">{totalShares}</span>
              <span className="stat-label">Resonances Shared</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default React.memo(Hero);
