import React, { useState } from 'react';
import { 
  Flame, 
  Plus, 
  CloudRain, 
  Tv, 
  Menu, 
  X,
  Smartphone
} from 'lucide-react';

function Navbar({
  onSelectCategory,
  onOpenComposer,
  onOpenAbout,
  onOpenBeer,
  beerSadState = false,
  onOpenMixer,
  onOpenZenCinema,
  onOpenRitual,
  isAudioPlaying,
  sessionDuration,
  activeSouls = 24,
  isInstallable = true,
  onOpenInstall
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleBrandClick = () => {
    onSelectCategory?.('all');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="minimal-navbar-wrapper">
      <div className="minimal-navbar-row">
        <div className="minimal-navbar">
          {/* Brand: "Echoes" */}
          <button 
            type="button"
            className="minimal-brand" 
            onClick={handleBrandClick}
            title="Echoes Sanctuary — Return to Top"
            aria-label="Echoes Home"
          >
            <span className="brand-dot-pulse" />
            <span className="brand-text-single">Echoes</span>
          </button>

          {/* Right: Sanctuary Actions & Interactive Portals */}
          <div className="minimal-actions">
            {/* Zen Cinema Mode */}
            <button
              type="button"
              onClick={onOpenZenCinema}
              className="minimal-icon-btn cinema-hover nav-desktop-only"
              title="Enter Zen Cinema (Auto-Stream whispers)"
              aria-label="Zen Cinema"
            >
              <Tv size={17} />
            </button>

            {/* Sacred Hearth (Burn a Regret) */}
            <button
              type="button"
              onClick={onOpenRitual}
              className="minimal-icon-btn flame-hover nav-desktop-only"
              title="The Sacred Hearth (Burn a secret to ashes)"
              aria-label="Burn a Regret"
            >
              <Flame size={17} className="text-amber-400" />
            </button>

            {/* Real Rain Soundscape Lounge */}
            <button
              type="button"
              onClick={onOpenMixer}
              className={`minimal-icon-btn audio-hover ${isAudioPlaying ? 'active-audio' : ''}`}
              title={isAudioPlaying ? `Rain Active (${sessionDuration}) — Click to customize soundscape` : "Open Rain & Ambience Sanctuary"}
              aria-label="Soundscape Lounge"
            >
              <CloudRain size={17} className={isAudioPlaying ? "active-audio-icon text-sky-400" : ""} />
              {isAudioPlaying && <span className="audio-live-dot" />}
            </button>

            {/* Install PWA App (Auto-hidden when in standalone) */}
            {isInstallable && (
              <button
                type="button"
                onClick={onOpenInstall}
                className="minimal-icon-btn install-hover nav-desktop-only"
                title="Install Echoes Sanctuary App"
                aria-label="Install App"
              >
                <Smartphone size={17} className="text-amber-400" />
              </button>
            )}

            {/* New Echo Minimal CTA */}
            <button
              type="button"
              onClick={onOpenComposer}
              className="minimal-cta-btn"
              title="Whisper an Unspoken Thought"
              aria-label="Echo a thought"
            >
              <Plus size={16} />
              <span>Echo</span>
            </button>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              className="minimal-mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Beer Emoji Duplicate in Header (Outside of Nav Bar) */}
        {onOpenBeer && (
          <button
            type="button"
            onClick={onOpenBeer}
            className={`header-beer-btn ${beerSadState ? 'sad-wobble' : ''}`}
            title={beerSadState ? "Arya will drink water today... 💧" : "Buy me a beer? 🍺 (A little something for the curious ones)"}
            aria-label="Buy me a beer"
          >
            <span className="beer-emoji-icon">{beerSadState ? '💧' : '🍺'}</span>
          </button>
        )}
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="minimal-mobile-drawer">
          <div className="mobile-interactive-links">
            <button
              onClick={() => {
                onOpenZenCinema();
                setMobileMenuOpen(false);
              }}
              className="mobile-feature-row"
            >
              <Tv size={16} className="text-sky-400" />
              <span>Enter Zen Cinema (Auto-Stream)</span>
            </button>

            <button
              onClick={() => {
                onOpenRitual();
                setMobileMenuOpen(false);
              }}
              className="mobile-feature-row"
            >
              <Flame size={16} className="text-rose-400" />
              <span>The Sacred Hearth (Burn to Ash)</span>
            </button>

            <button
              onClick={() => {
                onOpenMixer();
                setMobileMenuOpen(false);
              }}
              className="mobile-feature-row"
            >
              <CloudRain size={16} className="text-cyan-400" />
              <span>Rain & Soundscape Mixer {isAudioPlaying ? `(${sessionDuration})` : ''}</span>
            </button>
          </div>

          <div className="mobile-drawer-bottom">
            {isInstallable && (
              <button
                type="button"
                onClick={() => {
                  onOpenInstall();
                  setMobileMenuOpen(false);
                }}
                className="mobile-drawer-link mobile-install-link"
              >
                <Smartphone size={15} className="text-amber-400" />
                <span>Install Echoes App</span>
              </button>
            )}

            {onOpenBeer && (
              <button
                type="button"
                onClick={() => {
                  onOpenBeer();
                  setMobileMenuOpen(false);
                }}
                className="mobile-drawer-link mobile-beer-link"
              >
                <span>🍺</span>
                <span>Meet the Creator (Arya More)</span>
              </button>
            )}

            <button
              onClick={() => {
                onOpenComposer();
                setMobileMenuOpen(false);
              }}
              className="minimal-cta-btn mobile-full-cta"
            >
              <Plus size={16} />
              <span>Echo an Unspoken Thought</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

export default React.memo(Navbar);
