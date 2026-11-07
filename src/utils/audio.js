// Enhanced Soundscape Engine: Real Recorded Rain & Multi-Track Ambient Mixer
// Features real recorded audio tracks + Web Audio procedural atmospheric layers.

class SoundscapeEngine {
  constructor() {
    this.isPlaying = false;
    this.audioCtx = null;
    this.tracks = {
      rain: { volume: 0.8, element: null },
      thunder: { volume: 0.35, element: null },
      fire: { volume: 0.3, node: null, gain: null },
      chords: { volume: 0.4, nodes: [], gain: null }
    };
    this.sessionStartTime = null;
    this.sleepTimerId = null;
    this.sleepTimerMinutes = null;
    this.listeners = new Set();
  }

  initAudioElements() {
    const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/';
    if (!this.tracks.rain.element) {
      const rain = new Audio(`${baseUrl}rain.mp3`);
      rain.loop = true;
      rain.preload = 'auto';
      rain.volume = this.tracks.rain.volume;
      this.tracks.rain.element = rain;
    }

    if (!this.tracks.thunder.element) {
      const thunder = new Audio(`${baseUrl}thunder.mp3`);
      thunder.loop = true;
      thunder.preload = 'auto';
      thunder.volume = this.tracks.thunder.volume;
      this.tracks.thunder.element = thunder;
    }
  }

  initWebAudio() {
    try {
      if (!this.audioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.audioCtx = new AudioCtx();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
    } catch (e) {
      console.warn('Web Audio init error:', e);
    }
  }

  startFireCrackle() {
    if (!this.audioCtx) return;

    // Fire crackle synthesis (pink noise bursts & high-frequency pops)
    const bufferSize = this.audioCtx.sampleRate * 2;
    const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let last = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (last * 0.94) + (white * 0.06);
      if (Math.random() < 0.003) {
        data[i] += (Math.random() - 0.5) * 1.5; // crackle pop
      }
      last = data[i];
    }

    const fireSource = this.audioCtx.createBufferSource();
    fireSource.buffer = noiseBuffer;
    fireSource.loop = true;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, this.audioCtx.currentTime);
    filter.Q.setValueAtTime(2, this.audioCtx.currentTime);

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(this.tracks.fire.volume * 0.25, this.audioCtx.currentTime);

    fireSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioCtx.destination);
    fireSource.start();

    this.tracks.fire.node = fireSource;
    this.tracks.fire.gain = gain;
  }

  startChords() {
    if (!this.audioCtx) return;

    // Warm D minor 9 meditative chords
    const freqs = [146.83, 174.61, 220.00, 261.63, 329.63];
    const masterGain = this.audioCtx.createGain();
    masterGain.gain.setValueAtTime(this.tracks.chords.volume * 0.03, this.audioCtx.currentTime);
    masterGain.connect(this.audioCtx.destination);
    this.tracks.chords.gain = masterGain;

    this.tracks.chords.nodes = freqs.map((freq, idx) => {
      const osc = this.audioCtx.createOscillator();
      const oscGain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      const lfo = this.audioCtx.createOscillator();
      lfo.frequency.setValueAtTime(0.08 + idx * 0.03, this.audioCtx.currentTime);
      const lfoGain = this.audioCtx.createGain();
      lfoGain.gain.setValueAtTime(1.2, this.audioCtx.currentTime);
      lfo.connect(osc.frequency);
      lfo.start();

      oscGain.gain.setValueAtTime(1 / (idx + 1.2), this.audioCtx.currentTime);
      osc.connect(oscGain);
      oscGain.connect(masterGain);
      osc.start();

      return { osc, lfo, oscGain };
    });
  }

  start() {
    try {
      this.initAudioElements();
      this.initWebAudio();

      if (this.tracks.rain.element && this.tracks.rain.volume > 0) {
        this.tracks.rain.element.play().catch((e) => console.log('Rain play error:', e));
      }
      if (this.tracks.thunder.element && this.tracks.thunder.volume > 0) {
        this.tracks.thunder.element.play().catch((e) => console.log('Thunder play error:', e));
      }

      if (this.tracks.fire.volume > 0 && !this.tracks.fire.node) {
        try { this.startFireCrackle(); } catch (e) {}
      }

      if (this.tracks.chords.volume > 0 && this.tracks.chords.nodes.length === 0) {
        try { this.startChords(); } catch (e) {}
      }

      if (!this.sessionStartTime) {
        this.sessionStartTime = Date.now();
      }

      this.isPlaying = true;
      this.notify();
    } catch (e) {
      console.warn('Soundscape start error:', e);
    }
  }

  stop() {
    try {
      if (this.tracks.rain.element) {
        try { this.tracks.rain.element.pause(); } catch (e) {}
      }
      if (this.tracks.thunder.element) {
        try { this.tracks.thunder.element.pause(); } catch (e) {}
      }

      if (this.tracks.fire.node) {
        try {
          this.tracks.fire.node.stop();
          this.tracks.fire.node.disconnect();
        } catch (e) {}
        this.tracks.fire.node = null;
      }

      if (this.tracks.chords.nodes.length > 0) {
        this.tracks.chords.nodes.forEach(({ osc, lfo }) => {
          try {
            osc.stop();
            lfo.stop();
            osc.disconnect();
            lfo.disconnect();
          } catch (e) {}
        });
        this.tracks.chords.nodes = [];
      }

      if (this.sleepTimerId) {
        clearTimeout(this.sleepTimerId);
        this.sleepTimerId = null;
      }

      this.isPlaying = false;
      this.notify();
    } catch (e) {
      console.warn('Soundscape stop error:', e);
    }
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  setVolume(trackName, volume) {
    const vol = Math.max(0, Math.min(1, volume));
    if (this.tracks[trackName]) {
      this.tracks[trackName].volume = vol;

      if (trackName === 'rain' && this.tracks.rain.element) {
        this.tracks.rain.element.volume = vol;
        if (this.isPlaying && vol > 0 && this.tracks.rain.element.paused) {
          this.tracks.rain.element.play().catch(() => {});
        } else if (vol === 0 && !this.tracks.rain.element.paused) {
          this.tracks.rain.element.pause();
        }
      }

      if (trackName === 'thunder' && this.tracks.thunder.element) {
        this.tracks.thunder.element.volume = vol;
        if (this.isPlaying && vol > 0 && this.tracks.thunder.element.paused) {
          this.tracks.thunder.element.play().catch(() => {});
        } else if (vol === 0 && !this.tracks.thunder.element.paused) {
          this.tracks.thunder.element.pause();
        }
      }

      if (trackName === 'fire' && this.tracks.fire.gain && this.audioCtx) {
        this.tracks.fire.gain.gain.setValueAtTime(vol * 0.25, this.audioCtx.currentTime);
      }

      if (trackName === 'chords' && this.tracks.chords.gain && this.audioCtx) {
        this.tracks.chords.gain.gain.setValueAtTime(vol * 0.03, this.audioCtx.currentTime);
      }

      this.notify();
    }
  }

  setPreset(presetName) {
    switch (presetName) {
      case 'midnight-storm':
        this.setVolume('rain', 0.9);
        this.setVolume('thunder', 0.7);
        this.setVolume('chords', 0.1);
        this.setVolume('fire', 0);
        break;
      case 'cozy-fireplace':
        this.setVolume('rain', 0.65);
        this.setVolume('thunder', 0);
        this.setVolume('chords', 0.35);
        this.setVolume('fire', 0.85);
        break;
      case 'melancholy-piano':
        this.setVolume('rain', 0.6);
        this.setVolume('thunder', 0.2);
        this.setVolume('chords', 0.75);
        this.setVolume('fire', 0);
        break;
      case 'pure-rain':
      default:
        this.setVolume('rain', 0.85);
        this.setVolume('thunder', 0.15);
        this.setVolume('chords', 0.25);
        this.setVolume('fire', 0);
        break;
    }
  }

  setSleepTimer(minutes) {
    if (this.sleepTimerId) {
      clearTimeout(this.sleepTimerId);
      this.sleepTimerId = null;
    }
    this.sleepTimerMinutes = minutes;
    if (minutes && minutes > 0) {
      this.sleepTimerId = setTimeout(() => {
        this.stop();
      }, minutes * 60 * 1000);
    }
    this.notify();
  }

  getSessionDurationFormatted() {
    if (!this.sessionStartTime) return '0 min';
    const mins = Math.floor((Date.now() - this.sessionStartTime) / (1000 * 60));
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((fn) => fn(this));
  }
}

export const soundscape = new SoundscapeEngine();
// Alias for backward compatibility
export const ambientSound = soundscape;
