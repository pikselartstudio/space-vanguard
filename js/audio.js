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
    this.tempo = 114; // Futuristic space tempo
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

    // Chord Progression across 4 bars (16 sixteenth notes per bar)
    // Bar 0: D minor (D3/F3/A3)
    // Bar 1: Bb major (Bb2/D3/F3)
    // Bar 2: F major (F2/A2/C3)
    // Bar 3: C major / A minor (C3/E3/G3)
    const bar = Math.floor(step / 16);
    const stepInBar = step % 16;

    // 1. Bass Note on beat 0 and beat 8 of each bar (pulse rhythm)
    if (stepInBar === 0 || stepInBar === 8) {
      const bassFreqs = [73.42, 58.27, 87.31, 65.41]; // D2, Bb1, F2, C2
      this.playSynthBass(bassFreqs[bar], time, 0.42);
    }

    // 2. Cosmic Ambient Pad at the beginning of each bar
    if (stepInBar === 0) {
      const padChords = [
        [146.83, 220.00, 261.63], // D3, A3, C4 (Dm7)
        [116.54, 174.61, 233.08], // Bb2, F3, Bb3 (Bb)
        [87.31, 130.81, 174.61],  // F2, C3, F3 (F)
        [130.81, 164.81, 196.00]  // C3, E3, G3 (C)
      ];
      this.playSynthPad(padChords[bar], time, (60 / this.tempo) * 3.8);
    }

    // 3. Cosmic Pluck Arpeggiator (syncopated high sci-fi notes)
    // D Minor scale frequencies: D4=293.66, E4=329.63, F4=349.23, G4=392.00, A4=440.00, Bb4=466.16, C5=523.25, D5=587.33, E5=659.25, F5=698.46, A5=880.00
    const arpPatterns = [
      // Bar 0 (D minor arpeggios)
      [293.66, 0, 440.00, 349.23, 523.25, 0, 440.00, 587.33, 349.23, 0, 440.00, 523.25, 659.25, 587.33, 523.25, 440.00],
      // Bar 1 (Bb major arpeggios)
      [233.08, 0, 349.23, 293.66, 466.16, 0, 349.23, 587.33, 293.66, 0, 349.23, 466.16, 587.33, 466.16, 349.23, 293.66],
      // Bar 2 (F major arpeggios)
      [174.61, 0, 261.63, 349.23, 523.25, 0, 349.23, 659.25, 261.63, 0, 349.23, 523.25, 698.46, 659.25, 523.25, 349.23],
      // Bar 3 (C major / Am arpeggios)
      [196.00, 0, 329.63, 392.00, 523.25, 0, 392.00, 659.25, 329.63, 0, 392.00, 523.25, 783.99, 659.25, 523.25, 392.00]
    ];

    const freq = arpPatterns[bar][stepInBar];
    if (freq > 0) {
      const isAccent = (stepInBar % 4 === 0);
      this.playSynthPluck(freq, time, isAccent ? 0.22 : 0.15, isAccent ? 0.14 : 0.09);
    }

    // 4. Subtle Cosmic Pulse / Shimmer on steps 4 and 12
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

  // Metallic collision sound when ship crashes into asteroid or another ship
  playMetalCrash(volume = 1.0, impactForce = 50) {
    if (!this.initialized || this.isSoundMuted || volume <= 0.02) return;
    const now = this.ctx.currentTime;

    if (this.lastCrashTime && (now - this.lastCrashTime < 0.06)) return;
    this.lastCrashTime = now;

    const clampedVol = Math.min(1.0, Math.max(0.1, volume)) * Math.min(1.2, Math.max(0.4, impactForce / 60));
    const duration = 0.28;

    // 1. Initial crunchy metal crunch impact transient (filtered noise)
    const bufSize = Math.floor(this.ctx.sampleRate * 0.06);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.8;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const nFilter = this.ctx.createBiquadFilter();
    nFilter.type = 'bandpass';
    nFilter.frequency.setValueAtTime(1400, now);
    nFilter.Q.setValueAtTime(2.0, now);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(clampedVol * 0.45, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(this.sfxGain);
    noise.start(now);

    // 2. Inharmonic metallic ringing resonant modes (titanium hull ring)
    const metalTones = [280, 620, 1140, 1850];
    metalTones.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = (idx === 0) ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);
      // Slight pitch sag on impact
      osc.frequency.exponentialRampToValueAtTime(freq * 0.88, now + duration);

      const toneVol = (clampedVol * 0.25) / (idx + 1);
      gain.gain.setValueAtTime(toneVol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + duration);
    });
  }

  // Punchy, sci-fi arcade laser sound with sub-punch & frequency sweep
  playLaser(isHeavy = false, volume = 1.0) {
    if (!this.initialized || this.isSoundMuted || volume <= 0.02) return;
    const now = this.ctx.currentTime;
    const masterVol = Math.min(1.0, Math.max(0, volume));

    // 1. Visceral sub-punch transient (kick attack)
    const kickOsc = this.ctx.createOscillator();
    const kickGain = this.ctx.createGain();
    kickOsc.type = 'sine';
    kickOsc.frequency.setValueAtTime(isHeavy ? 120 : 180, now);
    kickOsc.frequency.exponentialRampToValueAtTime(isHeavy ? 35 : 55, now + 0.06);

    kickGain.gain.setValueAtTime((isHeavy ? 0.35 : 0.22) * masterVol, now);
    kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    kickOsc.connect(kickGain);
    kickGain.connect(this.sfxGain);
    kickOsc.start(now);
    kickOsc.stop(now + 0.06);

    // 2. Main sci-fi laser frequency sweep
    const laserOsc = this.ctx.createOscillator();
    const laserFilter = this.ctx.createBiquadFilter();
    const laserGain = this.ctx.createGain();

    laserOsc.type = isHeavy ? 'sawtooth' : 'triangle';
    const startFreq = isHeavy ? 680 : 1350;
    const endFreq = isHeavy ? 80 : 190;
    const duration = isHeavy ? 0.24 : 0.13;

    laserOsc.frequency.setValueAtTime(startFreq, now);
    laserOsc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    laserFilter.type = 'lowpass';
    laserFilter.frequency.setValueAtTime(isHeavy ? 2800 : 4200, now);
    laserFilter.frequency.exponentialRampToValueAtTime(600, now + duration);

    laserGain.gain.setValueAtTime((isHeavy ? 0.38 : 0.26) * masterVol, now);
    laserGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    laserOsc.connect(laserFilter);
    laserFilter.connect(laserGain);
    laserGain.connect(this.sfxGain);

    laserOsc.start(now);
    laserOsc.stop(now + duration);
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
