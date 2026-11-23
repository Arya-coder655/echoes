import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Smile, Image as ImageIcon, Search, X, Loader2, Sparkles } from 'lucide-react';
import { searchGifs } from '../utils/api';

const EMOJI_CATEGORIES = [
  {
    id: 'emotions',
    name: 'Emotions',
    icon: '🥺',
    emojis: [
      { char: '🥺', name: 'pleading moved' },
      { char: '🥹', name: 'holding tears touched' },
      { char: '😌', name: 'relieved peace' },
      { char: '😔', name: 'pensive sad' },
      { char: '😢', name: 'crying tear' },
      { char: '😭', name: 'loud crying sobbing' },
      { char: '🫂', name: 'hug comfort together' },
      { char: '❤️', name: 'red heart love' },
      { char: '🤍', name: 'white heart pure peace' },
      { char: '💔', name: 'broken heart sorrow' },
      { char: '🕊️', name: 'dove peace freedom' },
      { char: '✨', name: 'sparkles hope shine' },
      { char: '🕯️', name: 'candle light memory here' },
      { char: '🌸', name: 'cherry blossom healing' },
      { char: '🌿', name: 'herb plant growth fresh' },
      { char: '🌙', name: 'crescent moon night thoughts' },
      { char: '🌧️', name: 'rain cloud rain sanctuary' },
      { char: '🌊', name: 'ocean wave deep thoughts' }
    ]
  },
  {
    id: 'comfort',
    name: 'Comfort',
    icon: '🫂',
    emojis: [
      { char: '🫂', name: 'hug embrace comfort' },
      { char: '🤍', name: 'warmth peace safe' },
      { char: '🕯️', name: 'candle vigil warmth' },
      { char: '✨', name: 'hope light shine' },
      { char: '🤲', name: 'palms open together' },
      { char: '🫶', name: 'heart hands care' },
      { char: '🙏', name: 'gratitude pray thank you' },
      { char: '💐', name: 'flowers kindness bouquet' },
      { char: '🩹', name: 'bandage healing recover' },
      { char: '🌤️', name: 'sun behind cloud brighter days' },
      { char: '🌈', name: 'rainbow promise after storm' },
      { char: '🌻', name: 'sunflower bright warmth' },
      { char: '🌱', name: 'seedling new beginning sprout' },
      { char: '☕', name: 'warm cup gentle rest' },
      { char: '🧘', name: 'calm meditation stillness' }
    ]
  },
  {
    id: 'hearts',
    name: 'Hearts',
    icon: '❤️',
    emojis: [
      { char: '❤️', name: 'red heart classic love' },
      { char: '🧡', name: 'orange heart warmth sunset' },
      { char: '💛', name: 'yellow heart friendship light' },
      { char: '💚', name: 'green heart growth heal' },
      { char: '💙', name: 'blue heart ocean deep' },
      { char: '💜', name: 'purple heart mystery soft' },
      { char: '🖤', name: 'black heart grief midnight' },
      { char: '🤍', name: 'white heart pure peaceful' },
      { char: '🤎', name: 'brown heart earth grounded' },
      { char: '💖', name: 'sparkling heart adoration' },
      { char: '💗', name: 'growing heart emotion' },
      { char: '💓', name: 'beating heart alive' },
      { char: '💞', name: 'revolving hearts connection' },
      { char: '💕', name: 'two hearts soul bond' },
      { char: '💌', name: 'love letter unspoken words' }
    ]
  },
  {
    id: 'nature',
    name: 'Nature',
    icon: '🌿',
    emojis: [
      { char: '🌙', name: 'moon midnight solace' },
      { char: '⭐', name: 'star wish night' },
      { char: '🌟', name: 'glowing star bright' },
      { char: '🌧️', name: 'cloud rain tears' },
      { char: '⛈️', name: 'storm thunder chaos' },
      { char: '🍂', name: 'fallen leaf autumn nostalgia' },
      { char: '🍁', name: 'maple leaf season change' },
      { char: '🍃', name: 'leaves fluttering wind release' },
      { char: '🌿', name: 'herb soothing tranquility' },
      { char: '🌊', name: 'wave emotional tide' },
      { char: '🌌', name: 'milky way universe infinity' },
      { char: '🌅', name: 'sunrise new hope dawn' }
    ]
  },
  {
    id: 'symbols',
    name: 'Symbols',
    icon: '🕯️',
    emojis: [
      { char: '🕯️', name: 'candle memory presence' },
      { char: '✨', name: 'magic spark hope' },
      { char: '💫', name: 'dizzy star dream' },
      { char: '🕊️', name: 'dove quiet peace' },
      { char: '⚓', name: 'anchor safe grounded' },
      { char: '🗝️', name: 'key secret heart' },
      { char: '⏳', name: 'hourglass time passing' },
      { char: '🪔', name: 'diya lamp holy light' },
      { char: '🪷', name: 'lotus blooming out of dark' },
      { char: '🫧', name: 'bubbles release gentle' }
    ]
  }
];

const GIF_QUICK_TAGS = ['All', 'Hug', 'Comfort', 'Heart', 'Candle', 'Peace', 'Rain', 'Hope'];

export default function EmojiGifPicker({ isOpen, onClose, onSelectEmoji, onSelectGif, activeTab = 'emoji' }) {
  const [tab, setTab] = useState(activeTab); // 'emoji' | 'gif'
  const [activeCategory, setActiveCategory] = useState('emotions');
  const [searchQuery, setSearchQuery] = useState('');
  const [gifResults, setGifResults] = useState([]);
  const [isLoadingGifs, setIsLoadingGifs] = useState(false);
  const [selectedGifTag, setSelectedGifTag] = useState('All');
  const searchInputRef = useRef(null);

  useEffect(() => {
    setTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (tab === 'gif' && isOpen) {
      loadGifs(searchQuery || (selectedGifTag === 'All' ? 'comfort' : selectedGifTag));
    }
  }, [tab, isOpen, selectedGifTag]);

  const loadGifs = async (q) => {
    setIsLoadingGifs(true);
    try {
      const res = await searchGifs(q);
      if (res?.success) {
        setGifResults(res.results || []);
      }
    } catch {
      // fallback
    } finally {
      setIsLoadingGifs(false);
    }
  };

  const handleGifSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      loadGifs(searchQuery.trim());
    }
  };

  const filteredEmojis = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      const cat = EMOJI_CATEGORIES.find((c) => c.id === activeCategory);
      return cat ? cat.emojis : [];
    }
    const all = [];
    EMOJI_CATEGORIES.forEach((cat) => {
      cat.emojis.forEach((em) => {
        if (em.name.toLowerCase().includes(q) || em.char.includes(q)) {
          all.push(em);
        }
      });
    });
    return all;
  }, [searchQuery, activeCategory]);

  if (!isOpen) return null;

  return (
    <div className="emoji-gif-popover-card" onClick={(e) => e.stopPropagation()}>
      {/* Header Tabs */}
      <div className="picker-tabs-header">
        <div className="picker-tabs-group">
          <button
            type="button"
            className={`picker-tab-btn ${tab === 'emoji' ? 'active' : ''}`}
            onClick={() => { setTab('emoji'); setSearchQuery(''); }}
          >
            <Smile size={16} />
            <span>Emojis</span>
          </button>
          <button
            type="button"
            className={`picker-tab-btn ${tab === 'gif' ? 'active' : ''}`}
            onClick={() => { setTab('gif'); setSearchQuery(''); }}
          >
            <ImageIcon size={16} />
            <span>GIFs</span>
          </button>
        </div>
        <button type="button" className="picker-close-btn" onClick={onClose} aria-label="Close picker">
          <X size={15} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="picker-search-bar">
        <Search size={14} className="picker-search-icon" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder={tab === 'emoji' ? 'Search feeling, heart, comfort...' : 'Search emotional GIFs...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && tab === 'gif') {
              handleGifSearchSubmit(e);
            }
          }}
          className="picker-search-input"
        />
        {searchQuery && (
          <button type="button" className="picker-search-clear" onClick={() => setSearchQuery('')}>
            <X size={12} />
          </button>
        )}
      </div>

      {/* EMOJI TAB VIEW */}
      {tab === 'emoji' && (
        <div className="picker-emoji-view">
          {!searchQuery && (
            <div className="emoji-category-nav">
              {EMOJI_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`emoji-cat-pill ${activeCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                  title={cat.name}
                >
                  <span className="cat-icon">{cat.icon}</span>
                  <span className="cat-name">{cat.name}</span>
                </button>
              ))}
            </div>
          )}

          <div className="emoji-grid-container">
            {filteredEmojis.length === 0 ? (
              <div className="picker-empty-state">No matching emojis found.</div>
            ) : (
              filteredEmojis.map((em, idx) => (
                <button
                  key={`${em.char}-${idx}`}
                  type="button"
                  className="emoji-grid-item"
                  onClick={() => onSelectEmoji(em.char)}
                  title={em.name}
                >
                  {em.char}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* GIF TAB VIEW */}
      {tab === 'gif' && (
        <div className="picker-gif-view">
          {/* Quick Tag Pills */}
          <div className="gif-quick-tags-nav">
            {GIF_QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`gif-tag-pill ${selectedGifTag === tag ? 'active' : ''}`}
                onClick={() => {
                  setSelectedGifTag(tag);
                  loadGifs(tag === 'All' ? 'comfort hug' : tag.toLowerCase());
                }}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="gif-grid-container">
            {isLoadingGifs ? (
              <div className="picker-loading-state">
                <Loader2 className="animate-spin text-amber-400" size={24} />
                <span>Finding gentle GIFs...</span>
              </div>
            ) : gifResults.length === 0 ? (
              <div className="picker-empty-state">No GIFs found for this feeling.</div>
            ) : (
              gifResults.map((gif) => (
                <button
                  key={gif.id}
                  type="button"
                  className="gif-card-btn"
                  onClick={() => onSelectGif(gif.url)}
                  title={gif.title}
                >
                  <img
                    src={gif.preview || gif.url}
                    alt={gif.title}
                    loading="lazy"
                    className="gif-card-img"
                  />
                  <span className="gif-card-overlay-label">{gif.title}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
