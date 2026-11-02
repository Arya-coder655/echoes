import React, { useState } from 'react';
import { 
  Sparkles, 
  Flame, 
  Hourglass, 
  Mail, 
  Bookmark, 
  Info, 
  Plus, 
  CloudRain, 
  Compass, 
  Tv, 
  Menu, 
  X,
  Moon,
  HeartPulse,
  Zap,
  Heart
} from 'lucide-react';

export default function Navbar({
  activeCategory,
  onSelectCategory,
  onOpenComposer,
  onOpenAbout,
  onOpenBeer,
  onOpenMixer,
  onOpenZenCinema,
  onOpenRitual,
  onOpenWell,
  bookmarkCount,
  isAudioPlaying,
  sessionDuration
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'all', label: 'All', icon: Sparkles },
    { id: 'regret', label: 'Regret', icon: Flame },
    { id: 'unsent', label: 'Unsent', icon: Mail },
    { id: 'midnight-thoughts', label: 'Midnight', icon: Moon },
    { id: 'healing-corner', label: 'Healing', icon: HeartPulse },
    { id: 'random-chaos', label: 'Chaos', icon: Zap },
    { id: 'last-words', label: 'Farewells', icon: Hourglass },
    { id: 'love-notes', label: 'Love', icon: Heart },
    { id: 'bookmarks', label: 'Saved', icon: Bookmark, badge: bookmarkCount }
  ];

  const handleNavClick = (id) => {
    onSelectCategory(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 380, behavior: 'smooth' });
  };

  return (
    <header className="minimal-navbar-wrapper">
      <div className="minimal-navbar">
        {/* Brand: "Echoes" only */}
        <div 
          className="minimal-brand" 
          onClick={() => {
            onSelectCategory('all');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          title="Echoes"
        >
          <span className="brand-dot-pulse" />
          <span className="brand-text-single">Echoes</span>
        </div>

        {/* Center: Minimal Category Links */}
        <nav className="minimal-desktop-nav">
          <div className="nav-capsule">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeCategory === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`minimal-nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon size={14} className="nav-icon-subtle" />
                  <span>{item.label}</span>
                  {item.badge > 0 && (
                    <span className="nav-count-badge">{item.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Right: Minimal Actions */}
        <div className="minimal-actions">
          {/* Zen Cinema Mode */}
          <button
            type="button"
            onClick={onOpenZenCinema}
            className="minimal-icon-btn nav-desktop-only"
            title="Enter Zen Cinema (Immersive Auto-Read Mode)"
            aria-label="Zen Cinema"
          >
            <Tv size={16} />
          </button>

          {/* Whispering Well */}
          <button
            type="button"
            onClick={onOpenWell}
            className="minimal-icon-btn nav-desktop-only"
            title="The Whispering Well (Drop a pebble)"
            aria-label="Whispering Well"
          >
            <Compass size={16} />
          </button>

          {/* Sacred Hearth (Burn a Regret) */}
          <button
            type="button"
            onClick={onOpenRitual}
            className="minimal-icon-btn flame-hover nav-desktop-only"
            title="The Sacred Hearth (Burn a secret to ashes)"
            aria-label="Burn a Regret"
          >
            <Flame size={16} className="text-amber-400" />
          </button>

          {/* Real Rain Soundscape Lounge */}
          <button
            type="button"
            onClick={onOpenMixer}
            className={`minimal-icon-btn ${isAudioPlaying ? 'active-audio' : ''}`}
            title={isAudioPlaying ? `Rain Active (${sessionDuration}) — Click to customize soundscape` : "Open Rain & Ambience Sanctuary"}
            aria-label="Soundscape Lounge"
          >
            <CloudRain size={16} className={isAudioPlaying ? "active-audio-icon text-sky-400" : ""} />
            {isAudioPlaying && <span className="audio-live-dot" />}
          </button>

          {/* About Modal */}
          <button
            type="button"
            onClick={onOpenAbout}
            className="minimal-icon-btn nav-desktop-only"
            title="About Echoes"
            aria-label="About Echoes"
          >
            <Info size={16} />
          </button>

          {/* New Echo Minimal CTA */}
          <button
            type="button"
            onClick={onOpenComposer}
            className="minimal-cta-btn"
          >
            <Plus size={15} />
            <span>Echo</span>
          </button>

          {/* Mobile Hamburger Menu */}
          <button
            className="minimal-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="minimal-mobile-drawer">
          <div className="mobile-nav-pills-grid">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeCategory === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`mobile-pill-btn ${isActive ? 'active' : ''}`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                  {item.badge > 0 && (
                    <span className="nav-count-badge">{item.badge}</span>
                  )}
                </button>
              );
            })}
          </div>

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
                onOpenWell();
                setMobileMenuOpen(false);
              }}
              className="mobile-feature-row"
            >
              <Compass size={16} className="text-indigo-400" />
              <span>The Whispering Well</span>
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
              <span>Rain & Soundscape Mixer {isAudioPlaying ? '(Playing)' : ''}</span>
            </button>
          </div>

          <div className="mobile-drawer-bottom">
            <button
              onClick={() => {
                onOpenAbout();
                setMobileMenuOpen(false);
              }}
              className="mobile-drawer-link"
            >
              <Info size={15} />
              <span>About & Sanctuary Safety</span>
            </button>

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
