export interface SpiceConfig {
  mint: number;
  cinnamon: number;
  rose: number;
  ginger: number;
  lemon: number;
  honey: number;
}

export interface TeaConfig {
  teaType: 'green' | 'black' | 'flower';
  temperature: number;
  steepTime: number;
  spices: SpiceConfig;
}

const PENTATONIC_SCALE = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmOscillators: OscillatorNode[] = [];
  private bgmGainNodes: GainNode[] = [];
  private bgmInterval: number | null = null;
  private bgmPlaying = false;
  private spiceChordGains: { [key: string]: GainNode } = {};
  private spiceChordOscillators: { [key: string]: OscillatorNode[] } = {};

  init() {
    if (this.audioContext) return;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.audioContext.destination);
  }

  resume() {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  playBrewSound() {
    if (!this.audioContext || !this.masterGain) return;
    this.resume();

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 1.5);
    filter.Q.value = 0.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 2);

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.5);
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(0.1, now + 0.05);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.6);
  }

  playCupClinkSound() {
    if (!this.audioContext || !this.masterGain) return;
    this.resume();

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const freq = 1200 + Math.random() * 600;
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.03);
      gain.gain.linearRampToValueAtTime(0.08, now + i * 0.03 + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.03 + 0.3);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + i * 0.03);
      osc.stop(now + i * 0.03 + 0.3);
    }
  }

  private generateMelody(teaColor: string, spices: SpiceConfig): number[] {
    const notes: number[] = [];
    const baseNotes = [...PENTATONIC_SCALE];
    const numNotes = 8 + Math.floor(Math.random() * 5);

    let moodShift = 0;
    if (spices.mint > 0) moodShift += 1;
    if (spices.rose > 0) moodShift += 0.5;
    if (spices.cinnamon > 0) moodShift -= 0.5;
    if (spices.ginger > 0) moodShift += 0.3;
    if (spices.lemon > 0) moodShift += 0.8;
    if (spices.honey > 0) moodShift -= 0.3;

    let currentIndex = 3 + Math.floor(moodShift);
    currentIndex = Math.max(0, Math.min(baseNotes.length - 1, currentIndex));

    for (let i = 0; i < numNotes; i++) {
      const step = Math.floor(Math.random() * 5) - 2;
      currentIndex = Math.max(0, Math.min(baseNotes.length - 1, currentIndex + step));
      notes.push(baseNotes[currentIndex]);
    }

    return notes;
  }

  playTeaMelody(teaColor: string, spices: SpiceConfig) {
    if (!this.audioContext || !this.masterGain) return;
    this.resume();

    const ctx = this.audioContext;
    const masterGain = this.masterGain;
    const now = ctx.currentTime;
    const melody = this.generateMelody(teaColor, spices);
    const noteDuration = 0.4;
    const bpm = 70;
    const beatDuration = 60 / bpm;

    melody.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + i * beatDuration * 0.5;

      osc.type = 'triangle';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.12, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.08, startTime + noteDuration * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + noteDuration + 0.05);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2;
      gain2.gain.setValueAtTime(0, startTime);
      gain2.gain.linearRampToValueAtTime(0.04, startTime + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration * 0.5);
      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(startTime);
      osc2.stop(startTime + noteDuration * 0.6);
    });
  }

  startBGM() {
    if (!this.audioContext || !this.masterGain || this.bgmPlaying) return;
    this.resume();

    const ctx = this.audioContext;
    this.bgmPlaying = true;

    const playNote = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.06, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.04, startTime + duration * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);

      return osc;
    };

    const bpm = 60;
    const beatDuration = 60 / bpm;
    let currentTime = ctx.currentTime;
    let noteIndex = 0;
    const bgmPattern = [0, 2, 4, 3, 2, 4, 1, 3];

    const scheduleNext = () => {
      if (!this.bgmPlaying) return;

      const note = PENTATONIC_SCALE[bgmPattern[noteIndex % bgmPattern.length]];
      playNote(note, currentTime, beatDuration * 0.8);
      noteIndex++;
      currentTime += beatDuration;

      if (noteIndex % 4 === 0) {
        const bassNote = PENTATONIC_SCALE[Math.floor(noteIndex / 4) % 3] / 2;
        const bassOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bassOsc.type = 'sine';
        bassOsc.frequency.value = bassNote;
        bassGain.gain.setValueAtTime(0, currentTime - beatDuration * 4);
        bassGain.gain.linearRampToValueAtTime(0.05, currentTime - beatDuration * 4 + 0.1);
        bassGain.gain.exponentialRampToValueAtTime(0.001, currentTime - beatDuration * 4 + beatDuration * 3.9);
        bassOsc.connect(bassGain);
        bassGain.connect(this.masterGain!);
        bassOsc.start(currentTime - beatDuration * 4);
        bassOsc.stop(currentTime);
      }
    };

    for (let i = 0; i < 8; i++) {
      scheduleNext();
    }

    this.bgmInterval = window.setInterval(scheduleNext, beatDuration * 1000);
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  addSpiceChord(spice: keyof SpiceConfig, intensity: number) {
    if (!this.audioContext || !this.masterGain || intensity === 0) return;
    this.resume();

    this.removeSpiceChord(spice);

    const ctx = this.audioContext;
    const oscillators: OscillatorNode[] = [];

    const chordGain = ctx.createGain();
    chordGain.gain.value = 0;
    chordGain.gain.linearRampToValueAtTime(0.08 * intensity / 3, ctx.currentTime + 0.5);
    chordGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 12);
    chordGain.connect(this.masterGain);

    let baseFreq: number;
    let type: OscillatorType;
    let harmonics: number[];

    switch (spice) {
      case 'mint':
        baseFreq = 880;
        type = 'sine';
        harmonics = [1, 1.5, 2];
        break;
      case 'cinnamon':
        baseFreq = 130.81;
        type = 'triangle';
        harmonics = [1, 1.25, 1.5];
        break;
      case 'rose':
        baseFreq = 523.25;
        type = 'sine';
        harmonics = [1, 1.2, 1.4];
        break;
      case 'ginger':
        baseFreq = 196;
        type = 'sawtooth';
        harmonics = [1, 1.5];
        break;
      case 'lemon':
        baseFreq = 784;
        type = 'sine';
        harmonics = [1, 2, 3];
        break;
      case 'honey':
        baseFreq = 261.63;
        type = 'sine';
        harmonics = [1, 1.25];
        break;
      default:
        baseFreq = 440;
        type = 'sine';
        harmonics = [1];
    }

    harmonics.forEach((h, i) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = baseFreq * h;
      oscGain.gain.value = 0.5 / (i + 1);
      osc.connect(oscGain);
      oscGain.connect(chordGain);
      osc.start();
      oscillators.push(osc);
    });

    if (spice === 'mint') {
      const triangle = ctx.createOscillator();
      const triGain = ctx.createGain();
      triangle.type = 'triangle';
      triangle.frequency.value = baseFreq * 2;
      triGain.gain.value = 0.3;
      triangle.connect(triGain);
      triGain.connect(chordGain);
      triangle.start();
      oscillators.push(triangle);
    }

    if (spice === 'cinnamon') {
      const harp = ctx.createOscillator();
      const harpGain = ctx.createGain();
      harp.type = 'sine';
      harp.frequency.value = baseFreq * 3;
      harpGain.gain.value = 0.2;
      harp.connect(harpGain);
      harpGain.connect(chordGain);
      harp.start();
      oscillators.push(harp);
    }

    this.spiceChordGains[spice] = chordGain;
    this.spiceChordOscillators[spice] = oscillators;

    setTimeout(() => {
      this.removeSpiceChord(spice);
    }, 12000);
  }

  private removeSpiceChord(spice: keyof SpiceConfig) {
    if (this.spiceChordOscillators[spice]) {
      this.spiceChordOscillators[spice].forEach(osc => {
        try { osc.stop(); } catch (e) {}
      });
      delete this.spiceChordOscillators[spice];
    }
    if (this.spiceChordGains[spice]) {
      try { this.spiceChordGains[spice].disconnect(); } catch (e) {}
      delete this.spiceChordGains[spice];
    }
  }

  setMasterVolume(value: number) {
    if (this.masterGain) {
      this.masterGain.gain.value = value;
    }
  }
}

export const audioEngine = new AudioEngine();
