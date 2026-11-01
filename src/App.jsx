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
import SoundscapeMixerModal from './components/SoundscapeMixerModal';
import ZenCinemaModal from './components/ZenCinemaModal';
import CatharsisRitualModal from './components/CatharsisRitualModal';
import WhisperingWellModal from './components/WhisperingWellModal';
import Toast from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import ReportModal from './components/ReportModal';
import { INITIAL_ECHOES } from './data/initialEchoes';
import { soundscape } from './utils/audio';
import {
  fetchEchoesFromDb,
  createEchoInDb,
  toggleLikeInDb,
  recordShareInDb,
  addCommentInDb
} from './utils/api';
import { Sparkles, Heart, PlusCircle, ArrowUp, Flame, CloudRain, Tv, Info } from 'lucide-react';

const STORAGE_KEY_POSTS = 'echoes_of_heart_posts_v2';
const STORAGE_KEY_BOOKMARKS = 'echoes_of_heart_bookmarks_v2';

export default function App() {
  // Initialize state with local storage fallback
  const [echoes, setEchoes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_POSTS);
      if (saved) return JSON.parse(saved);
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
  const [mixerOpen, setMixerOpen] = useState(false);
  const [zenCinemaOpen, setZenCinemaOpen] = useState(false);
  const [ritualOpen, setRitualOpen] = useState(false);
  const [wellOpen, setWellOpen] = useState(false);
  const [reportEchoTarget, setReportEchoTarget] = useState(null);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Fetch real echoes from MySQL database on mount & sync in real-time
  useEffect(() => {
    let isMounted = true;
    async function loadDatabaseEchoes() {
      const result = await fetchEchoesFromDb();
      if (!isMounted) return;
      if (result.data && Array.isArray(result.data)) {
        setEchoes(result.data);
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

  // Secret Easter Egg: typing "arya" opens the Architect reveal
  useEffect(() => {
    let keyBuffer = '';
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;
      keyBuffer += (e.key || '').toLowerCase();
      if (keyBuffer.length > 10) keyBuffer = keyBuffer.slice(-10);
      
      if (keyBuffer.endsWith('arya')) {
        keyBuffer = '';
        localStorage.setItem('echoes_architect_revealed', 'true');
        setAboutOpen(true);
        showToast('✦ Easter Egg Unveiled: Sanctuary Architect Arya More!');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    setEchoes((prev) => prev.filter((e) => e.id !== echoId));
    showToast('Echo submitted for review and hidden from your feed.');
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: echoes.length, regret: 0, 'last-words': 0, unsent: 0, themed: 0 };
    echoes.forEach((e) => {
      if (counts[e.category] !== undefined) {
        counts[e.category]++;
      }
    });
    return counts;
  }, [echoes]);

  // Filter & Sort logic
  const filteredEchoes = useMemo(() => {
    let list = [...echoes];

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
  }, [echoes, bookmarks, activeCategory, searchQuery, sortBy]);

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
                {activeCategory === 'last-words' && 'The Last Words Archive'}
                {activeCategory === 'unsent' && 'Unsent Letters & Confessions'}
                {activeCategory === 'themed' && 'Themed Reflections'}
                {activeCategory === 'bookmarks' && 'Your Saved Echoes'}
              </h2>
              <div className="db-status-badge" title="Database synchronization status">
                <span className={`db-status-dot ${isDbConnected ? '' : 'offline'}`} />
                <span>{isDbConnected ? 'MySQL DB Synchronized' : 'Offline Cache'}</span>
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

            <div className="footer-links-group">
              <h4 className="footer-heading">Sanctuary Experiences</h4>
              <ul className="footer-links-list">
                <li><button type="button" onClick={() => setMixerOpen(true)}>Rain & Soundscape Mixer</button></li>
                <li><button type="button" onClick={() => setZenCinemaOpen(true)}>Zen Cinema (Auto-Stream)</button></li>
                <li><button type="button" onClick={() => setRitualOpen(true)}>The Sacred Hearth (Burn to Ash)</button></li>
                <li><button type="button" onClick={() => setWellOpen(true)}>The Whispering Well</button></li>
              </ul>
            </div>

            <div className="footer-links-group">
              <h4 className="footer-heading">Sanctuary Walls</h4>
              <ul className="footer-links-list">
                <li><button type="button" onClick={() => { setActiveCategory('regret'); window.scrollTo({ top: 400, behavior: 'smooth' }); }}>Regret Wall</button></li>
                <li><button type="button" onClick={() => { setActiveCategory('last-words'); window.scrollTo({ top: 400, behavior: 'smooth' }); }}>Last Words Archive</button></li>
                <li><button type="button" onClick={() => { setActiveCategory('unsent'); window.scrollTo({ top: 400, behavior: 'smooth' }); }}>Unsent Letters</button></li>
                <li><button type="button" onClick={() => { setActiveCategory('themed'); window.scrollTo({ top: 400, behavior: 'smooth' }); }}>Themed Posts</button></li>
              </ul>
            </div>

            <div className="footer-links-group">
              <h4 className="footer-heading">About Us</h4>
              <ul className="footer-links-list">
                <li><button type="button" onClick={() => setAboutOpen(true)}>About Echoes</button></li>
                <li><button type="button" onClick={() => setAboutOpen(true)}>Why This Space Exists</button></li>
                <li><button type="button" onClick={() => setAboutOpen(true)}>100% Anonymous Promise</button></li>
                <li><button type="button" onClick={() => setAboutOpen(true)}>Sanctuary Principles</button></li>
                <li><button type="button" onClick={() => setAboutOpen(true)} className="footer-easter-egg-link">✦ The Architect's Riddle 🗝️</button></li>
              </ul>
            </div>
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

      <Toast
        message={toastMessage}
        onDismiss={() => setToastMessage('')}
      />
    </div>
  );
}
