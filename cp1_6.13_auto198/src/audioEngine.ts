export type WaveformType = 'sine' | 'sawtooth' | 'square' | 'triangle';

const NOTE_FREQUENCIES: Record<number, number> = {
  60: 261.63,
  61: 277.18,
  62: 293.66,
  63: 311.13,
  64: 329.63,
  65: 349.23,
  66: 369.99,
  67: 392.00,
  68: 415.30,
  69: 440.00,
  70: 466.16,
  71: 493.88,
  72: 523.25
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const getNoteName = (midiNote: number): string => {
  const octave = Math.floor(midiNote / 12) - 1;
  const noteIndex = midiNote % 12;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
};

export const getFrequency = (midiNote: number): number => {
  return NOTE_FREQUENCIES[midiNote] || 440;
};

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bpm: number = 100;
  private waveform: WaveformType = 'sine';
  private isInitialized: boolean = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;
    
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.audioContext.destination);
    this.isInitialized = true;
  }

  ensureInitialized(): void {
    if (!this.audioContext || !this.masterGain) {
      throw new Error('AudioEngine not initialized');
    }
  }

  resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      return this.audioContext.resume();
    }
    return Promise.resolve();
  }

  setBPM(bpm: number): void {
    this.bpm = Math.max(40, Math.min(180, bpm));
  }

  getBPM(): number {
    return this.bpm;
  }

  setWaveform(waveform: WaveformType): void {
    this.waveform = waveform;
  }

  getWaveform(): WaveformType {
    return this.waveform;
  }

  playNote(midiNote: number, duration: number = 0.3, volume: number = 0.5): void {
    this.ensureInitialized();
    
    const ctx = this.audioContext!;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = this.waveform;
    oscillator.frequency.value = getFrequency(midiNote);
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain!);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }

  playNoteWithDelay(midiNote: number, delay: number, duration: number = 0.3, volume: number = 0.5): void {
    this.ensureInitialized();
    
    const ctx = this.audioContext!;
    const startTime = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = this.waveform;
    oscillator.frequency.value = getFrequency(midiNote);
    
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain!);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }

  beatToSeconds(beats: number): number {
    return (beats / this.bpm) * 60;
  }

  secondsToBeats(seconds: number): number {
    return (seconds * this.bpm) / 60;
  }
}

export const audioEngine = new AudioEngine();
