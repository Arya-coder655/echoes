import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import AmbientBackground from './components/AmbientBackground';
import Hero from './components/Hero';
import SearchFilterBar from './components/SearchFilterBar';
import EchoCard from './components/EchoCard';
import EchoComposer from './components/EchoComposer';
import CommentsDrawer from './components/CommentsDrawer';
import ShareModal from './components/ShareModal';
import AboutModal from './components/AboutModal';
import BeerEasterEggModal from './components/BeerEasterEggModal';
import SoundscapeMixerModal from './components/SoundscapeMixerModal';
import ZenCinemaModal from './components/ZenCinemaModal';
import CatharsisRitualModal from './components/CatharsisRitualModal';
import WhisperingWellModal from './components/WhisperingWellModal';
import Toast from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import ReportModal from './components/ReportModal';
import confetti from 'canvas-confetti';
import { INITIAL_ECHOES } from './data/initialEchoes';
import { soundscape } from './utils/audio';
import {
  fetchEchoesFromDb,
  createEchoInDb,
  toggleLikeInDb,
  recordShareInDb,
  addCommentInDb
} from './utils/api';
import { Sparkles, Heart, PlusCircle, ArrowUp, Flame, CloudRain, Tv, Info, ChevronDown } from 'lucide-react';

const STORAGE_KEY_POSTS = 'echoes_of_heart_posts_v2';
const STORAGE_KEY_BOOKMARKS = 'echoes_of_heart_bookmarks_v2';
const STORAGE_KEY_REPORTED = 'echoes_of_heart_reported_ids_v2';

export default function App() {
  const [reportedIds, setReportedIds] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_REPORTED);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed reading reported echoes', e);
    }
    return [];
  });

  // Initialize state with local storage fallback
  const [echoes, setEchoes] = useState(() => {
    try {
      let currentReported = [];
      try {
        const raw = localStorage.getItem(STORAGE_KEY_REPORTED);
        if (raw) currentReported = JSON.parse(raw);
      } catch {}
      const saved = localStorage.getItem(STORAGE_KEY_POSTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((e) => !currentReported.includes(e.id));
        }
      }
    } catch (e) {
      console.error('Failed reading local storage', e);
    }
    return INITIAL_ECHOES;
  });

  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BOOKMARKS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed reading bookmarks', e);
    }
    return [];
  });

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Modals & Drawers state
  const [composerOpen, setComposerOpen] = useState(false);
  const [commentsEcho, setCommentsEcho] = useState(null);
  const [shareEcho, setShareEcho] = useState(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [beerModalOpen, setBeerModalOpen] = useState(false);
  const [beerSadState, setBeerSadState] = useState(false);
  const [beerSadToast, setBeerSadToast] = useState(false);
  const [mixerOpen, setMixerOpen] = useState(false);
  const [zenCinemaOpen, setZenCinemaOpen] = useState(false);
  const [ritualOpen, setRitualOpen] = useState(false);
  const [wellOpen, setWellOpen] = useState(false);
  const [reportEchoTarget, setReportEchoTarget] = useState(null);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [footerDropdowns, setFooterDropdowns] = useState({
    experiences: false,
    walls: false,
    about: false
  });

  const toggleFooterDropdown = (key) => {
    setFooterDropdowns((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Fetch real echoes from MySQL database on mount & sync in real-time
  useEffect(() => {
    let isMounted = true;
    async function loadDatabaseEchoes() {
      const result = await fetchEchoesFromDb();
      if (!isMounted) return;
      if (result.data && Array.isArray(result.data)) {
        let currentReported = [];
        try {
          const raw = localStorage.getItem(STORAGE_KEY_REPORTED);
          if (raw) currentReported = JSON.parse(raw);
        } catch {}
        const cleanData = result.data.filter((e) => !currentReported.includes(e.id));
        setEchoes(cleanData);
        setIsDbConnected(true);
      } else {
        setIsDbConnected(false);
      }
    }

    loadDatabaseEchoes();

    // Auto-sync new posts from MySQL every 15 seconds
    const interval = setInterval(loadDatabaseEchoes, 15000);

    // Refresh instantly when user switches back to the tab
    const handleFocus = () => loadDatabaseEchoes();
    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Real rain & soundscape state
  const [isAudioPlaying, setIsAudioPlaying] = useState(soundscape.isPlaying);
  const [sessionDuration, setSessionDuration] = useState('0 min');

  // Subscribe to audio engine
  useEffect(() => {
    const unsub = soundscape.subscribe((eng) => {
      setIsAudioPlaying(eng.isPlaying);
      setSessionDuration(eng.getSessionDurationFormatted());
    });

    const timer = setInterval(() => {
      setSessionDuration(soundscape.getSessionDurationFormatted());
    }, 15000);

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, []);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(echoes));
    } catch (e) {
      console.error('Failed saving to local storage', e);
    }
  }, [echoes]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(bookmarks));
    } catch (e) {
      console.error('Failed saving bookmarks', e);
    }
  }, [bookmarks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_REPORTED, JSON.stringify(reportedIds));
    } catch (e) {
      console.error('Failed saving reported echoes', e);
    }
  }, [reportedIds]);

  // Deep link handling (e.g. #ECHO-10829)
  useEffect(() => {
    if (window.location.hash) {
      const hashId = window.location.hash.replace('#', '');
      const matched = echoes.find((e) => e.id.toLowerCase() === hashId.toLowerCase());
      if (matched) {
        setTimeout(() => {
          const el = document.getElementById(matched.id);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('highlight-target');
            setTimeout(() => el.classList.remove('highlight-target'), 3000);
          }
        }, 500);
      }
    }
  }, [echoes]);

  const showToast = (msg) => {
    setToastMessage(msg);
  };

  const handleLike = async (id) => {
    const target = echoes.find((e) => e.id === id);
    const currentlyLiked = target ? target.liked : false;

    setEchoes((prev) =>
      prev.map((echo) => {
        if (echo.id === id) {
          const liked = !echo.liked;
          const likes = liked ? (echo.likes || 0) + 1 : Math.max(0, (echo.likes || 0) - 1);
          return { ...echo, liked, likes };
        }
        return echo;
      })
    );

    // Sync to persistent SQLite database
    const res = await toggleLikeInDb(id, currentlyLiked);
    if (res && typeof res.likes === 'number') {
      setEchoes((prev) =>
        prev.map((e) => (e.id === id ? { ...e, likes: res.likes } : e))
      );
    }
  };

  const handleShareSuccess = async (id) => {
    setEchoes((prev) =>
      prev.map((echo) => {
        if (echo.id === id) {
          return { ...echo, shares: (echo.shares || 0) + 1 };
        }
        return echo;
      })
    );
    await recordShareInDb(id);
  };

  const handleToggleBookmark = (id) => {
    if (bookmarks.includes(id)) {
      setBookmarks((prev) => prev.filter((bId) => bId !== id));
      showToast('Removed from saved echoes.');
    } else {
      setBookmarks((prev) => [...prev, id]);
      showToast('Saved to your private collection.');
    }
  };

  const handleAddComment = async (id, text) => {
    const res = await addCommentInDb(id, text);
    const newComment = (res && res.data) || {
      id: `comm-${Date.now()}`,
      text,
      time: Date.now()
    };

    setEchoes((prev) =>
      prev.map((echo) => {
        if (echo.id === id) {
          const updatedComments = [newComment, ...(echo.comments || [])];
          return { ...echo, comments: updatedComments };
        }
        return echo;
      })
    );

    if (commentsEcho && commentsEcho.id === id) {
      setCommentsEcho((prev) => ({
        ...prev,
        comments: [newComment, ...(prev.comments || [])]
      }));
    }

    showToast('Your reflection has been anonymously shared and saved.');
  };

  const handlePublishEcho = async (newEcho) => {
    // Save to persistent database
    const res = await createEchoInDb(newEcho);
    const echoToSave = (res && res.data) || newEcho;

    setEchoes((prev) => [echoToSave, ...prev]);
    if (activeCategory !== 'all' && activeCategory !== echoToSave.category) {
      setActiveCategory('all');
    }
    window.scrollTo({ top: 350, behavior: 'smooth' });

    if (res && res.error) {
      showToast(res.error);
    } else {
      showToast('Your whisper has been saved in the sanctuary database.');
    }
  };

  const handleReportSubmitted = (echoId) => {
    setReportedIds((prev) => {
      const next = prev.includes(echoId) ? prev : [...prev, echoId];
      try {
        localStorage.setItem(STORAGE_KEY_REPORTED, JSON.stringify(next));
      } catch {}
      return next;
    });
    setEchoes((prev) => prev.filter((e) => e.id !== echoId));
    showToast('Echo submitted for review and removed from your feed.');
  };

  const handleCloseBeerModal = (didPay) => {
    setBeerModalOpen(false);

    if (didPay) {
      showToast('Cheers! Arya raises a glass to your kindness! 🍻');
      return;
    }

    // User checked Easter egg and closed without paying -> Minimal Sad Animation!
    try {
      confetti({
        particleCount: 22,
        angle: 270, // downwards like falling tears / rain
        spread: 35,
        origin: { y: 0.25, x: 0.5 },
        colors: ['#38bdf8', '#60a5fa', '#93c5fd', '#cbd5e1'],
        gravity: 1.6,
        scalar: 0.7,
        ticks: 120,
        shapes: ['circle']
      });
    } catch {
      // safe fallback
    }

    setBeerSadState(true);
    setBeerSadToast(true);

    setTimeout(() => {
      setBeerSadToast(false);
    }, 3800);

    setTimeout(() => {
      setBeerSadState(false);
    }, 6000);
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { 
      all: 0, 
      regret: 0, 
      unsent: 0, 
      'midnight-thoughts': 0, 
      'healing-corner': 0, 
      'random-chaos': 0, 
      'last-words': 0, 
      'love-notes': 0, 
      themed: 0 
    };
    const visible = echoes.filter((e) => !reportedIds.includes(e.id));
    counts.all = visible.length;
    visible.forEach((e) => {
      if (counts[e.category] !== undefined) {
        counts[e.category]++;
      }
    });
    return counts;
  }, [echoes, reportedIds]);

  // Filter & Sort logic
  const filteredEchoes = useMemo(() => {
    let list = echoes.filter((e) => !reportedIds.includes(e.id));

    if (activeCategory === 'bookmarks') {
      list = list.filter((e) => bookmarks.includes(e.id));
    } else if (activeCategory !== 'all') {
      list = list.filter((e) => e.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((e) => {
        return (
          e.message.toLowerCase().includes(q) ||
          (e.name && e.name.toLowerCase().includes(q)) ||
          e.id.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q)
        );
      });
    }

    list.sort((a, b) => {
      if (sortBy === 'newest') return (b.timestamp || 0) - (a.timestamp || 0);
      if (sortBy === 'most-felt') return (b.likes || 0) - (a.likes || 0);
      if (sortBy === 'most-shared') return (b.shares || 0) - (a.shares || 0);
      if (sortBy === 'most-discussed') {
        const aCount = a.comments ? a.comments.length : 0;
        const bCount = b.comments ? b.comments.length : 0;
        return bCount - aCount;
      }
      return 0;
    });

    return list;
  }, [echoes, bookmarks, activeCategory, searchQuery, sortBy, reportedIds]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-root">
      {/* Background Animated Particles */}
      <AmbientBackground />

      {/* Floating Minimal Navbar */}
      <Navbar
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        onOpenComposer={() => setComposerOpen(true)}
        onOpenAbout={() => setAboutOpen(true)}
        onOpenBeer={() => setBeerModalOpen(true)}
        onOpenMixer={() => setMixerOpen(true)}
        onOpenZenCinema={() => setZenCinemaOpen(true)}
        onOpenRitual={() => setRitualOpen(true)}
        onOpenWell={() => setWellOpen(true)}
        bookmarkCount={bookmarks.length}
        isAudioPlaying={isAudioPlaying}
        sessionDuration={sessionDuration}
      />

      <main className="main-content-wrapper">
        {/* Poetic Hero Section with Experience Cards */}
        <Hero
          echoes={echoes}
          onOpenComposer={() => setComposerOpen(true)}
          onOpenMixer={() => setMixerOpen(true)}
          onOpenZenCinema={() => setZenCinemaOpen(true)}
          onOpenRitual={() => setRitualOpen(true)}
          onOpenWell={() => setWellOpen(true)}
        />

        {/* Search, Filter Tabs & Sort Controls */}
        <section className="feed-controls-section">
          <SearchFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
            sortBy={sortBy}
            onSortChange={setSortBy}
            categoryCounts={categoryCounts}
          />
        </section>

        {/* Section Header Indicator */}
        <div className="section-feed-header">
          <div className="feed-header-left">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h2 className="feed-title">
                {activeCategory === 'all' && 'The Universal Feed'}
                {activeCategory === 'regret' && 'The Regret Wall'}
                {activeCategory === 'unsent' && 'Unsent Letters'}
                {activeCategory === 'midnight-thoughts' && 'Midnight Thoughts'}
                {activeCategory === 'healing-corner' && 'Healing Corner'}
                {activeCategory === 'random-chaos' && 'Random Chaos'}
                {activeCategory === 'last-words' && 'The Last Words Archive'}
                {activeCategory === 'love-notes' && 'Love Notes'}
                {activeCategory === 'themed' && 'Themed Reflections'}
                {activeCategory === 'bookmarks' && 'Your Saved Echoes'}
              </h2>
              <div className="db-status-badge" title="Live community stories">
                <span className={`db-status-dot ${isDbConnected ? '' : 'offline'}`} />
                <span>{isDbConnected ? 'Stories time...' : 'Saved Echoes'}</span>
              </div>
            </div>
            <span className="feed-subtitle">
              {filteredEchoes.length} {filteredEchoes.length === 1 ? 'echo' : 'echoes'} found
              {searchQuery && ` for "${searchQuery}"`}
            </span>
          </div>

          <button
            onClick={() => setComposerOpen(true)}
            className="quick-compose-trigger"
          >
            <PlusCircle size={16} />
            <span>Leave an Echo</span>
          </button>
        </div>

        {/* Echo Cards Grid / Stream */}
        <section className="echoes-feed-stream">
          {filteredEchoes.length > 0 ? (
            <div className="echoes-grid">
              {filteredEchoes.map((echo) => (
                <EchoCard
                  key={echo.id}
                  echo={echo}
                  onLike={handleLike}
                  onOpenComments={(targetEcho) => setCommentsEcho(targetEcho)}
                  onOpenShare={(targetEcho) => setShareEcho(targetEcho)}
                  onOpenReport={(targetEcho) => setReportEchoTarget(targetEcho)}
                  isBookmarked={bookmarks.includes(echo.id)}
                  onToggleBookmark={handleToggleBookmark}
                  onToast={showToast}
                />
              ))}
            </div>
          ) : (
            <div className="empty-feed-card">
              <div className="empty-icon-wrap">
                <Sparkles size={36} className="text-accent" />
              </div>
              <h3 className="empty-title">
                {activeCategory === 'bookmarks'
                  ? 'No saved echoes yet'
                  : 'Silence reigns in this corner'}
              </h3>
              <p className="empty-description">
                {activeCategory === 'bookmarks'
                  ? 'Tap the bookmark icon on any echo to keep it close to your heart.'
                  : searchQuery
                  ? `No echoes matched "${searchQuery}". Try a different keyword or name.`
                  : 'Be the very first soul to break the silence in this wall.'}
              </p>
              <button
                onClick={() => {
                  if (activeCategory === 'bookmarks') {
                    setActiveCategory('all');
                  } else {
                    setComposerOpen(true);
                  }
                }}
                className="empty-action-btn"
              >
                {activeCategory === 'bookmarks' ? 'Explore Universal Feed' : 'Share an Unspoken Message'}
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Floating Bottom Quick Action on Mobile */}
      <div className="mobile-bottom-bar">
        <button
          onClick={() => setActiveCategory('all')}
          className={`mobile-tab-btn ${activeCategory === 'all' ? 'active' : ''}`}
        >
          <Sparkles size={18} />
          <span>Feed</span>
        </button>
        <button
          onClick={() => setZenCinemaOpen(true)}
          className="mobile-tab-btn"
        >
          <Tv size={18} />
          <span>Cinema</span>
        </button>
        <button
          onClick={() => setComposerOpen(true)}
          className="mobile-center-compose-btn"
          aria-label="New Echo"
        >
          <PlusCircle size={24} />
        </button>
        <button
          onClick={() => setMixerOpen(true)}
          className="mobile-tab-btn"
        >
          <CloudRain size={18} />
          <span>Rain</span>
        </button>
        <button
          onClick={() => setRitualOpen(true)}
          className="mobile-tab-btn"
        >
          <Flame size={18} />
          <span>Burn</span>
        </button>
      </div>

      {/* Footer */}
      <footer className="main-footer">
        <div className="footer-content-wrap">
          <div className="footer-top-row">
            <div className="footer-brand">
              <div className="footer-logo">
                <Heart size={20} className="text-accent" />
                <span className="footer-title">Echoes</span>
              </div>
              <p className="footer-quote">
                “Every unspoken word carries a story waiting to be heard. Turn your quietest ache into a bridge of connection.”
              </p>
              {/* About Us Button in Footer */}
              <button 
                type="button"
                onClick={() => setAboutOpen(true)}
                className="footer-about-btn"
                title="Learn about Echoes & the Anonymous Sanctuary"
              >
                <Info size={15} />
                <span>About Us</span>
              </button>
            </div>

            {/* Sanctuary Experiences Accordion */}
            <div className={`footer-links-group accordion-group ${footerDropdowns.experiences ? 'is-open' : ''}`}>
              <button
                type="button"
                className="footer-accordion-header"
                onClick={() => toggleFooterDropdown('experiences')}
                aria-expanded={footerDropdowns.experiences}
              >
                <h4 className="footer-heading">Sanctuary Experiences</h4>
                <ChevronDown size={17} className="footer-accordion-icon" />
              </button>
              <ul className={`footer-links-list ${footerDropdowns.experiences ? 'mobile-open' : ''}`}>
                <li><button type="button" onClick={() => setMixerOpen(true)}>Rain & Soundscape Mixer</button></li>
                <li><button type="button" onClick={() => setZenCinemaOpen(true)}>Zen Cinema (Auto-Stream)</button></li>
                <li><button type="button" onClick={() => setRitualOpen(true)}>The Sacred Hearth (Burn to Ash)</button></li>
                <li><button type="button" onClick={() => setWellOpen(true)}>The Whispering Well</button></li>
              </ul>
            </div>

            {/* Sanctuary Walls Accordion */}
            <div className={`footer-links-group accordion-group ${footerDropdowns.walls ? 'is-open' : ''}`}>
              <button
                type="button"
                className="footer-accordion-header"
                onClick={() => toggleFooterDropdown('walls')}
                aria-expanded={footerDropdowns.walls}
              >
                <h4 className="footer-heading">Sanctuary Walls</h4>
                <ChevronDown size={17} className="footer-accordion-icon" />
              </button>
              <ul className={`footer-links-list ${footerDropdowns.walls ? 'mobile-open' : ''}`}>
                <li><button type="button" onClick={() => { setActiveCategory('regret'); window.scrollTo({ top: 400, behavior: 'smooth' }); }}>Regret Wall</button></li>
                <li><button type="button" onClick={() => { setActiveCategory('unsent'); window.scrollTo({ top: 400, behavior: 'smooth' }); }}>Unsent Letters</button></li>
                <li><button type="button" onClick={() => { setActiveCategory('midnight-thoughts'); window.scrollTo({ top: 400, behavior: 'smooth' }); }}>Midnight Thoughts</button></li>
                <li><button type="button" onClick={() => { setActiveCategory('healing-corner'); window.scrollTo({ top: 400, behavior: 'smooth' }); }}>Healing Corner</button></li>
                <li><button type="button" onClick={() => { setActiveCategory('random-chaos'); window.scrollTo({ top: 400, behavior: 'smooth' }); }}>Random Chaos</button></li>
                <li><button type="button" onClick={() => { setActiveCategory('last-words'); window.scrollTo({ top: 400, behavior: 'smooth' }); }}>Last Words Archive</button></li>
                <li><button type="button" onClick={() => { setActiveCategory('love-notes'); window.scrollTo({ top: 400, behavior: 'smooth' }); }}>Love Notes</button></li>
              </ul>
            </div>

            {/* About Us Accordion */}
            <div className={`footer-links-group accordion-group ${footerDropdowns.about ? 'is-open' : ''}`}>
              <button
                type="button"
                className="footer-accordion-header"
                onClick={() => toggleFooterDropdown('about')}
                aria-expanded={footerDropdowns.about}
              >
                <h4 className="footer-heading">About Us</h4>
                <ChevronDown size={17} className="footer-accordion-icon" />
              </button>
              <ul className={`footer-links-list ${footerDropdowns.about ? 'mobile-open' : ''}`}>
                <li><button type="button" onClick={() => setAboutOpen(true)}>About Echoes</button></li>
                <li><button type="button" onClick={() => setAboutOpen(true)}>Why This Space Exists</button></li>
                <li><button type="button" onClick={() => setAboutOpen(true)}>100% Anonymous Promise</button></li>
                <li><button type="button" onClick={() => setAboutOpen(true)}>Sanctuary Principles</button></li>
              </ul>
            </div>
          </div>

          {/* Beer Easter Egg Trigger */}
          <div className="beer-trigger-section">
            <button
              type="button"
              onClick={() => setBeerModalOpen(true)}
              className={`beer-icon-circle-btn ${beerSadState ? 'sad-wobble' : ''}`}
              title={beerSadState ? "Arya will drink water today... 💧" : "A little something for the curious ones."}
              aria-label="Easter egg"
            >
              <span className="beer-emoji">{beerSadState ? '🥺' : '🍺'}</span>
            </button>
            <p className="beer-trigger-caption">
              {beerSadState ? "Arya is drinking water today... 💧" : "A little something for the curious ones."}
            </p>
          </div>

          <div className="footer-divider" />

          <div className="footer-bottom-row">
            <p className="footer-copy">
              &copy; {new Date().getFullYear()} Echoes • Resting in the rain for {sessionDuration}
            </p>
            <div className="footer-bottom-actions">
              <button 
                type="button"
                onClick={() => setAboutOpen(true)}
                className="footer-about-pill-btn"
                aria-label="About Us"
              >
                <Info size={14} />
                <span>About Us</span>
              </button>
              <button onClick={scrollToTop} className="back-to-top-btn" aria-label="Back to top">
                <ArrowUp size={16} />
                <span>Back to Top</span>
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <EchoComposer
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        onPublish={handlePublishEcho}
        onToast={showToast}
      />

      <CommentsDrawer
        isOpen={Boolean(commentsEcho)}
        echo={commentsEcho}
        onClose={() => setCommentsEcho(null)}
        onAddComment={handleAddComment}
      />

      <ShareModal
        isOpen={Boolean(shareEcho)}
        echo={shareEcho}
        onClose={() => setShareEcho(null)}
        onShareSuccess={handleShareSuccess}
        onToast={showToast}
      />

      <AboutModal
        isOpen={aboutOpen}
        onClose={() => setAboutOpen(false)}
        onOpenBeer={() => setBeerModalOpen(true)}
      />

      {/* Beer Easter Egg Modal */}
      <BeerEasterEggModal
        isOpen={beerModalOpen}
        onClose={handleCloseBeerModal}
      />

      {/* Real Rain Soundscape Lounge */}
      <SoundscapeMixerModal
        isOpen={mixerOpen}
        onClose={() => setMixerOpen(false)}
      />

      {/* Zen Cinema Full-screen Auto-Stream */}
      <ErrorBoundary
        key={zenCinemaOpen ? 'zen-open' : 'zen-closed'}
        fallback={() => {
          setZenCinemaOpen(false);
          return null;
        }}
      >
        <ZenCinemaModal
          isOpen={zenCinemaOpen}
          echoes={echoes}
          onClose={() => setZenCinemaOpen(false)}
          onToast={showToast}
        />
      </ErrorBoundary>

      {/* Sacred Hearth (Catharsis Burn Ritual) */}
      <CatharsisRitualModal
        isOpen={ritualOpen}
        onClose={() => setRitualOpen(false)}
        onToast={showToast}
      />

      {/* The Whispering Well (Message in a Bottle) */}
      <WhisperingWellModal
        isOpen={wellOpen}
        echoes={echoes}
        onClose={() => setWellOpen(false)}
        onToast={showToast}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={Boolean(reportEchoTarget)}
        echo={reportEchoTarget}
        onClose={() => setReportEchoTarget(null)}
        onToast={showToast}
        onReportSubmitted={handleReportSubmitted}
      />

      {/* Minimal Sad Reaction Toast */}
      {beerSadToast && (
        <aside className="beer-sad-toast" role="status" aria-live="polite">
          <span className="beer-sad-toast-emoji">🥺💧</span>
          <div className="beer-sad-toast-body">
            <span className="beer-sad-toast-title">No beer today...</span>
            <span className="beer-sad-toast-sub">Arya will drink water instead. Thanks for visiting though!</span>
          </div>
        </aside>
      )}

      <Toast
        message={toastMessage}
        onDismiss={() => setToastMessage('')}
      />
    </div>
  );
}
