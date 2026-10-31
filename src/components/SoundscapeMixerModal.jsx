import React, { useState, useEffect } from 'react';
import { 
  X, 
  Volume2, 
  VolumeX, 
  CloudRain, 
  Zap, 
  Flame, 
  Music, 
  Clock, 
  Play, 
  Pause, 
  Sparkles, 
  Moon 
} from 'lucide-react';
import { soundscape } from '../utils/audio';

export default function SoundscapeMixerModal({ isOpen, onClose }) {
  const [engineState, setEngineState] = useState({
    isPlaying: soundscape.isPlaying,
    tracks: { ...soundscape.tracks },
    sleepTimerMinutes: soundscape.sleepTimerMinutes
  });
  const [sessionTime, setSessionTime] = useState(soundscape.getSessionDurationFormatted());

  useEffect(() => {
    const unsub = soundscape.subscribe((eng) => {
      setEngineState({
        isPlaying: eng.isPlaying,
        tracks: { ...eng.tracks },
        sleepTimerMinutes: eng.sleepTimerMinutes
      });
    });

    const timer = setInterval(() => {
      setSessionTime(soundscape.getSessionDurationFormatted());
    }, 15000);

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, []);

  if (!isOpen) return null;

  const handleTogglePlay = () => {
    soundscape.toggle();
  };

  const handleVolumeChange = (track, val) => {
    soundscape.setVolume(track, parseFloat(val));
    if (!soundscape.isPlaying && parseFloat(val) > 0) {
      soundscape.start();
    }
  };

  const handleSelectPreset = (preset) => {
    if (!soundscape.isPlaying) {
      soundscape.start();
    }
    soundscape.setPreset(preset);
  };

  const handleSelectTimer = (minutes) => {
    soundscape.setSleepTimer(minutes);
  };

  return (
    <div className="mixer-modal-backdrop" onClick={onClose}>
      <div className="mixer-modal-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="mixer-header">
          <div className="mixer-title-wrap">
            <div className="mixer-badge-icon">
              <CloudRain size={20} className="text-accent" />
            </div>
            <div>
              <h2 className="mixer-title">The Rain Sanctuary</h2>
              <span className="mixer-subtitle">Real recorded soundscapes for deep focus & sleep</span>
            </div>
          </div>
          <button className="mixer-close-btn" onClick={onClose} aria-label="Close mixer">
            <X size={20} />
          </button>
        </div>

        {/* Master Play / Pause Control */}
        <div className="mixer-master-bar">
          <button 
            onClick={handleTogglePlay}
            className={`master-toggle-btn ${engineState.isPlaying ? 'playing' : ''}`}
          >
            {engineState.isPlaying ? (
              <>
                <Pause size={18} />
                <span>Pause Sanctuary</span>
              </>
            ) : (
              <>
                <Play size={18} />
                <span>Start Rain & Ambience</span>
              </>
            )}
          </button>

          <div className="session-pill" title="Time spent resting here">
            <Moon size={14} className="text-amber-400" />
            <span>Resting for {sessionTime}</span>
          </div>
        </div>

        {/* Multi-Track Volume Mixer */}
        <div className="tracks-mixer-grid">
          {/* Real Rain */}
          <div className="track-slider-card">
            <div className="track-header">
              <div className="track-name-row">
                <CloudRain size={16} className="text-sky-400" />
                <span className="track-title">Real Recorded Rain</span>
              </div>
              <span className="volume-pct">
                {Math.round((engineState.tracks.rain?.volume || 0) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={engineState.tracks.rain?.volume ?? 0.8}
              onChange={(e) => handleVolumeChange('rain', e.target.value)}
              className="volume-range-slider"
            />
          </div>

          {/* Rolling Thunder */}
          <div className="track-slider-card">
            <div className="track-header">
              <div className="track-name-row">
                <Zap size={16} className="text-amber-400" />
                <span className="track-title">Distant Thunder</span>
              </div>
              <span className="volume-pct">
                {Math.round((engineState.tracks.thunder?.volume || 0) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={engineState.tracks.thunder?.volume ?? 0.35}
              onChange={(e) => handleVolumeChange('thunder', e.target.value)}
              className="volume-range-slider"
            />
          </div>

          {/* Cozy Fireplace */}
          <div className="track-slider-card">
            <div className="track-header">
              <div className="track-name-row">
                <Flame size={16} className="text-rose-400" />
                <span className="track-title">Hearth Fireplace</span>
              </div>
              <span className="volume-pct">
                {Math.round((engineState.tracks.fire?.volume || 0) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={engineState.tracks.fire?.volume ?? 0.3}
              onChange={(e) => handleVolumeChange('fire', e.target.value)}
              className="volume-range-slider"
            />
          </div>

          {/* Melancholy Chords */}
          <div className="track-slider-card">
            <div className="track-header">
              <div className="track-name-row">
                <Music size={16} className="text-indigo-400" />
                <span className="track-title">Meditative Chords</span>
              </div>
              <span className="volume-pct">
                {Math.round((engineState.tracks.chords?.volume || 0) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={engineState.tracks.chords?.volume ?? 0.4}
              onChange={(e) => handleVolumeChange('chords', e.target.value)}
              className="volume-range-slider"
            />
          </div>
        </div>

        {/* Quick Mood Presets */}
        <div className="mixer-section">
          <label className="mixer-section-label">
            <Sparkles size={14} className="text-accent" />
            <span>Atmospheric Presets</span>
          </label>
          <div className="preset-buttons-grid">
            <button 
              onClick={() => handleSelectPreset('pure-rain')}
              className="preset-btn"
            >
              🌧️ Pure Window Rain
            </button>
            <button 
              onClick={() => handleSelectPreset('midnight-storm')}
              className="preset-btn"
            >
              ⚡ Thunderstorm
            </button>
            <button 
              onClick={() => handleSelectPreset('cozy-fireplace')}
              className="preset-btn"
            >
              🔥 Fireside Rain
            </button>
            <button 
              onClick={() => handleSelectPreset('melancholy-piano')}
              className="preset-btn"
            >
              🎹 Melancholy Night
            </button>
          </div>
        </div>

        {/* Sleep / Ambient Timer */}
        <div className="mixer-section">
          <label className="mixer-section-label">
            <Clock size={14} className="text-accent" />
            <span>Sleep / Focus Timer</span>
          </label>
          <div className="timer-buttons-row">
            {[null, 15, 30, 60, 120].map((mins) => {
              const isActive = engineState.sleepTimerMinutes === mins;
              return (
                <button
                  key={mins ?? 'endless'}
                  onClick={() => handleSelectTimer(mins)}
                  className={`timer-pill ${isActive ? 'active' : ''}`}
                >
                  {mins ? `${mins}m` : 'Endless Night'}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
