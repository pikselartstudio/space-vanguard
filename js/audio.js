// Procedural Web Audio API sound & music generator for Starblast 3D space game
class SoundSystem {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.initialized = false;
    this.isSoundMuted = false;
    this.isMusicMuted = false;

    // Procedural Music Engine properties
    this.musicPlaying = false;
    this.musicStep = 0;
    this.nextNoteTime = 0;
    this.musicTimer = null;
    this.tempo = 84; // Gloomy, deep space atmospheric tempo
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Master output bus
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // SFX Bus
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.isSoundMuted ? 0 : 0.45, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Music Bus
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.isMusicMuted ? 0 : 0.22, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.initialized = true;
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  ensureContext() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleSound() {
    this.ensureContext();
    this.isSoundMuted = !this.isSoundMuted;
    if (this.sfxGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.sfxGain.gain.cancelScheduledValues(now);
      this.sfxGain.gain.setValueAtTime(this.sfxGain.gain.value, now);
      this.sfxGain.gain.linearRampToValueAtTime(this.isSoundMuted ? 0 : 0.45, now + 0.08);
    }
    return !this.isSoundMuted;
  }

  toggleMusic() {
    this.ensureContext();
    this.isMusicMuted = !this.isMusicMuted;
    if (this.musicGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
      this.musicGain.gain.linearRampToValueAtTime(this.isMusicMuted ? 0 : 0.22, now + 0.12);
    }
    if (!this.isMusicMuted && !this.musicPlaying) {
      this.startMusic();
    }
    return !this.isMusicMuted;
  }

  // --- PROCEDURAL SPACE BACKGROUND MUSIC ---
  startMusic() {
    this.ensureContext();
    if (this.musicPlaying || !this.ctx) return;
    this.musicPlaying = true;
    this.musicStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.1;

    // Scheduler tick running lookahead
    this.musicTimer = setInterval(() => {
      if (!this.musicPlaying || !this.ctx) return;
      const stepDuration = 60 / this.tempo / 4; // 16th note duration
      while (this.nextNoteTime < this.ctx.currentTime + 0.2) {
        this.scheduleMusicStep(this.musicStep, this.nextNoteTime);
        this.nextNoteTime += stepDuration;
        this.musicStep = (this.musicStep + 1) % 64; // 4-bar loop (16 steps each)
      }
    }, 45);
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  scheduleMusicStep(step, time) {
    if (this.isMusicMuted) return;

    // Gloomy, Atmospheric Deep Space Chord Progression across 4 bars:
    // Bar 0: C minor (C2 sub drone, dark cosmic abyss)
    // Bar 1: Ab major (Ab1 sub drone, somber celestial drift)
    // Bar 2: F minor (F1 sub drone, melancholy interstellar void)
    // Bar 3: Eb minor / G suspended (Eb1 sub drone, cosmic mystery)
    const bar = Math.floor(step / 16);
    const stepInBar = step % 16;

    // 1. Deep Sub-Bass Drone on beat 0 and beat 8
    if (stepInBar === 0 || stepInBar === 8) {
      const bassFreqs = [65.41, 51.91, 43.65, 38.89]; // C2, Ab1, F1, Eb1
      this.playSynthBass(bassFreqs[bar], time, 0.55);
    }

    // 2. Gloomy Cosmic Ambient Pad
    if (stepInBar === 0) {
      const padChords = [
        [130.81, 155.56, 196.00, 246.94], // C3, Eb3, G3, B3 (Cm maj7)
        [103.83, 130.81, 155.56, 207.65], // Ab2, C3, Eb3, Ab3 (Ab)
        [87.31, 130.81, 155.56, 207.65],  // F2, C3, Eb3, Ab3 (Fm7)
        [77.78, 116.54, 155.56, 185.00]   // Eb2, Bb2, Eb3, F#3 (Ebm)
      ];
      this.playSynthPad(padChords[bar], time, (60 / this.tempo) * 3.8);
    }

    // 3. Ethereal, Sparse Cosmic Bell Echoes
    const arpPatterns = [
      // Bar 0 (Cm space bells)
      [261.63, 0, 0, 392.00, 0, 311.13, 0, 0, 523.25, 0, 392.00, 0, 0, 311.13, 0, 0],
      // Bar 1 (Ab space bells)
      [207.65, 0, 0, 311.13, 0, 261.63, 0, 0, 415.30, 0, 311.13, 0, 0, 261.63, 0, 0],
      // Bar 2 (Fm space bells)
      [174.61, 0, 0, 261.63, 0, 311.13, 0, 0, 349.23, 0, 261.63, 0, 0, 311.13, 0, 0],
      // Bar 3 (Ebm space bells)
      [155.56, 0, 0, 233.08, 0, 293.66, 0, 0, 311.13, 0, 233.08, 0, 0, 293.66, 0, 0]
    ];

    const freq = arpPatterns[bar][stepInBar];
    if (freq > 0) {
      const isAccent = (stepInBar === 0 || stepInBar === 8);
      this.playSynthPluck(freq, time, isAccent ? 0.35 : 0.22, isAccent ? 0.12 : 0.08);
    }

    // 4. Ghostly space sub-pulse
    if (stepInBar === 4 || stepInBar === 12) {
      this.playSpacePulse(time);
    }
  }

  playSynthBass(freq, time, duration) {
    if (!this.ctx || this.isMusicMuted) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, time);
    filter.frequency.exponentialRampToValueAtTime(75, time + duration);

    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  playSynthPad(frequencies, time, duration) {
    if (!this.ctx || this.isMusicMuted) return;
    frequencies.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      // Slight detune for celestial shimmer
      osc.frequency.setValueAtTime(freq + (idx === 1 ? 0.7 : -0.5), time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.045, time + 0.6);
      gain.gain.linearRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(time);
      osc.stop(time + duration);
    });
  }

  playSynthPluck(freq, time, duration, volume = 0.12) {
    if (!this.ctx || this.isMusicMuted) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, time);
    filter.frequency.exponentialRampToValueAtTime(300, time + duration);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  playSpacePulse(time) {
    if (!this.ctx || this.isMusicMuted) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(95, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.08);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, time);

    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.08);
  }

  // --- SOUND EFFECTS (Connected to sfxGain) ---

  // Realistic metallic hull collision sound (FM bell/clang synthesis + metal overtones)
  playMetalCrash(volume = 1.0, impactForce = 50) {
    if (!this.initialized || this.isSoundMuted || volume <= 0.02) return;
    const now = this.ctx.currentTime;

    if (this.lastCrashTime && (now - this.lastCrashTime < 0.05)) return;
    this.lastCrashTime = now;

    const clampedVol = Math.min(1.0, Math.max(0.12, volume)) * Math.min(1.2, Math.max(0.4, impactForce / 55));
    const duration = 0.35;

    // 1. Sharp metallic impact crack / snap transient
    const snapOsc = this.ctx.createOscillator();
    const snapFilter = this.ctx.createBiquadFilter();
    const snapGain = this.ctx.createGain();
    snapOsc.type = 'triangle';
    snapOsc.frequency.setValueAtTime(3200, now);
    snapOsc.frequency.exponentialRampToValueAtTime(140, now + 0.035);

    snapFilter.type = 'highpass';
    snapFilter.frequency.setValueAtTime(800, now);

    snapGain.gain.setValueAtTime(clampedVol * 0.5, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    snapOsc.connect(snapFilter);
    snapFilter.connect(snapGain);
    snapGain.connect(this.sfxGain);
    snapOsc.start(now);
    snapOsc.stop(now + 0.035);

    // 2. High-frequency inharmonic crunch noise (hull shear)
    const bufSize = Math.floor(this.ctx.sampleRate * 0.05);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.7;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const nFilter = this.ctx.createBiquadFilter();
    nFilter.type = 'bandpass';
    nFilter.frequency.setValueAtTime(2200, now);
    nFilter.Q.setValueAtTime(2.5, now);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(clampedVol * 0.38, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(this.sfxGain);
    noise.start(now);

    // 3. FM Synthesis metallic clang: Inharmonic modulation (Carrier ~460Hz, Modulator ~650Hz [1.414 ratio])
    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modIndex = this.ctx.createGain();
    const carrierGain = this.ctx.createGain();
    const clangFilter = this.ctx.createBiquadFilter();

    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(460, now);
    carrier.frequency.exponentialRampToValueAtTime(380, now + duration);

    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(460 * 1.414, now);
    modulator.frequency.exponentialRampToValueAtTime(380 * 1.414, now + duration);

    modIndex.gain.setValueAtTime(950 * clampedVol, now);
    modIndex.gain.exponentialRampToValueAtTime(1, now + duration);

    modulator.connect(modIndex);
    modIndex.connect(carrier.frequency);

    clangFilter.type = 'bandpass';
    clangFilter.frequency.setValueAtTime(1250, now);
    clangFilter.Q.setValueAtTime(1.8, now);

    carrierGain.gain.setValueAtTime(clampedVol * 0.42, now);
    carrierGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    carrier.connect(clangFilter);
    clangFilter.connect(carrierGain);
    carrierGain.connect(this.sfxGain);

    carrier.start(now);
    modulator.start(now);
    carrier.stop(now + duration);
    modulator.stop(now + duration);

    // 4. Ringing metallic hull overtones (titanium resonance: 780Hz, 1420Hz, 2600Hz)
    const resonantFreqs = [780, 1420, 2600];
    resonantFreqs.forEach((freq, idx) => {
      const rOsc = this.ctx.createOscillator();
      const rGain = this.ctx.createGain();
      rOsc.type = 'sine';
      rOsc.frequency.setValueAtTime(freq, now);
      rOsc.frequency.exponentialRampToValueAtTime(freq * 0.94, now + duration);

      const rVol = (clampedVol * 0.22) / (idx + 1);
      rGain.gain.setValueAtTime(rVol, now);
      rGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * (0.8 + idx * 0.15));

      rOsc.connect(rGain);
      rGain.connect(this.sfxGain);
      rOsc.start(now);
      rOsc.stop(now + duration);
    });
  }

  // Crisp, punchy sci-fi laser blaster sound with resonant chirp & plasma harmonic
  playLaser(isHeavy = false, volume = 1.0) {
    if (!this.initialized || this.isSoundMuted || volume <= 0.02) return;
    const now = this.ctx.currentTime;
    const masterVol = Math.min(1.0, Math.max(0, volume));

    // 1. Visceral tactile sub-punch transient (kick thump)
    const kickOsc = this.ctx.createOscillator();
    const kickGain = this.ctx.createGain();
    kickOsc.type = 'sine';
    kickOsc.frequency.setValueAtTime(isHeavy ? 160 : 210, now);
    kickOsc.frequency.exponentialRampToValueAtTime(isHeavy ? 35 : 50, now + 0.045);

    kickGain.gain.setValueAtTime((isHeavy ? 0.38 : 0.24) * masterVol, now);
    kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    kickOsc.connect(kickGain);
    kickGain.connect(this.sfxGain);
    kickOsc.start(now);
    kickOsc.stop(now + 0.045);

    // 2. High-energy sci-fi chirp sweep with resonant filter
    const laserOsc = this.ctx.createOscillator();
    const laserFilter = this.ctx.createBiquadFilter();
    const laserGain = this.ctx.createGain();

    const duration = isHeavy ? 0.16 : 0.10;
    const startFreq = isHeavy ? 1800 : 2600;
    const endFreq = isHeavy ? 140 : 220;

    laserOsc.type = isHeavy ? 'sawtooth' : 'triangle';
    laserOsc.frequency.setValueAtTime(startFreq, now);
    laserOsc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    laserFilter.type = 'bandpass';
    laserFilter.frequency.setValueAtTime(isHeavy ? 2200 : 3400, now);
    laserFilter.frequency.exponentialRampToValueAtTime(320, now + duration);
    laserFilter.Q.setValueAtTime(3.2, now); // Crisp resonant laser "pew" zing

    laserGain.gain.setValueAtTime((isHeavy ? 0.42 : 0.32) * masterVol, now);
    laserGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    laserOsc.connect(laserFilter);
    laserFilter.connect(laserGain);
    laserGain.connect(this.sfxGain);

    laserOsc.start(now);
    laserOsc.stop(now + duration);

    // 3. Plasma sizzle overtone harmonic (gives futuristic energy snap)
    const sizzleOsc = this.ctx.createOscillator();
    const sizzleGain = this.ctx.createGain();
    sizzleOsc.type = 'square';
    sizzleOsc.frequency.setValueAtTime(isHeavy ? 2800 : 3800, now);
    sizzleOsc.frequency.exponentialRampToValueAtTime(600, now + duration * 0.7);

    sizzleGain.gain.setValueAtTime(0.07 * masterVol, now);
    sizzleGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.7);

    sizzleOsc.connect(sizzleGain);
    sizzleGain.connect(this.sfxGain);
    sizzleOsc.start(now);
    sizzleOsc.stop(now + duration * 0.7);
  }

  // Asteroid or ship explosion with distance volume scaling
  playExplosion(isLarge = false, volume = 1.0) {
    if (!this.initialized || this.isSoundMuted || volume <= 0.02) return;
    const now = this.ctx.currentTime;
    const duration = isLarge ? 0.8 : 0.4;

    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isLarge ? 400 : 800, now);
    filter.frequency.linearRampToValueAtTime(40, now + duration);

    const gain = this.ctx.createGain();
    const baseVol = (isLarge ? 0.6 : 0.35) * Math.min(1.0, Math.max(0, volume));
    gain.gain.setValueAtTime(baseVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
  }

  // Crystal/Gem pickup sound: shimmering crystalline bell chime with harmonics
  playGemPickup() {
    if (!this.initialized || this.isSoundMuted) return;
    const now = this.ctx.currentTime;

    // Dual high-frequency crystal bell tones in rapid pleasant arpeggio
    const rootNotes = [1318.51, 1567.98, 1760.00, 2093.00]; // E6, G6, A6, C7
    const root = rootNotes[Math.floor(Math.random() * rootNotes.length)];
    const tones = [
      { freq: root, delay: 0, duration: 0.18, vol: 0.22 },
      { freq: root * 1.5, delay: 0.04, duration: 0.22, vol: 0.16 } // Perfect fifth shimmer
    ];

    tones.forEach(t => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(t.freq, now + t.delay);
      osc.frequency.exponentialRampToValueAtTime(t.freq * 1.05, now + t.delay + t.duration);

      gain.gain.setValueAtTime(t.vol, now + t.delay);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t.delay + t.duration);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + t.delay);
      osc.stop(now + t.delay + t.duration);
    });
  }

  // Laser hitting asteroid/shield with rate limiting & distance volume scaling
  playHit(volume = 1.0) {
    if (!this.initialized || this.isSoundMuted || volume <= 0.02) return;
    const now = this.ctx.currentTime;

    // Rate limit to prevent buzzing / distorted audio glitching
    if (this.lastHitTime && (now - this.lastHitTime < 0.038)) {
      return;
    }
    this.lastHitTime = now;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.05);

    const baseVol = 0.15 * Math.min(1.0, Math.max(0, volume));
    gain.gain.setValueAtTime(baseVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Stat upgrade sound
  playUpgrade() {
    if (!this.initialized || this.isSoundMuted) return;
    const now = this.ctx.currentTime;
    [0, 0.07, 0.14].forEach((delay, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const freq = 440 * Math.pow(1.2, i);
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0.18, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + delay);
      osc.stop(now + delay + 0.12);
    });
  }

  // Evolution tier up fanfare
  playTierUp() {
    if (!this.initialized || this.isSoundMuted) return;
    const now = this.ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    chord.forEach((note, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(note, now + i * 0.08);

      gain.gain.setValueAtTime(0.25, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.5);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.5);
    });
  }
}

window.soundSystem = new SoundSystem();
