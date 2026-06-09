export interface NoteVoice {
  oscillator: OscillatorNode;
  gainNode: GainNode;
  noteIndex: number;
  startTime: number;
  isPlaying: boolean;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private activeVoices: Map<number, NoteVoice> = new Map();
  private readonly maxPolyphony = 10;
  private readonly baseVolume = 0.3;
  private frequencyData: Uint8Array;

  constructor() {
    this.frequencyData = new Uint8Array(128);
  }

  private initContext(): void {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;
    this.masterGain.connect(this.ctx.destination);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.connect(this.masterGain);
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
  }

  public resume(): void {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private getNoteFrequency(noteIndex: number): number {
    return 440 * Math.pow(2, (noteIndex - 69) / 12);
  }

  public playNote(noteIndex: number, velocity: number = 80): void {
    this.initContext();
    if (!this.ctx || !this.analyser) return;

    if (this.activeVoices.has(noteIndex)) {
      this.stopNote(noteIndex);
    }

    if (this.activeVoices.size >= this.maxPolyphony) {
      const oldestKey = this.activeVoices.keys().next().value;
      if (oldestKey !== undefined) {
        this.stopNote(oldestKey);
      }
    }

    const oscillator = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.value = this.getNoteFrequency(noteIndex);

    const normalizedVelocity = Math.max(0.1, Math.min(1, velocity / 100));
    gainNode.gain.setValueAtTime(this.baseVolume * normalizedVelocity, this.ctx.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(this.analyser);
    oscillator.start();

    this.activeVoices.set(noteIndex, {
      oscillator,
      gainNode,
      noteIndex,
      startTime: this.ctx.currentTime,
      isPlaying: true
    });
  }

  public fadeOutNote(noteIndex: number): void {
    if (!this.ctx) return;
    const voice = this.activeVoices.get(noteIndex);
    if (!voice || !voice.isPlaying) return;

    const now = this.ctx.currentTime;
    voice.gainNode.gain.cancelScheduledValues(now);
    voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, now);
    voice.gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    setTimeout(() => {
      this.stopNote(noteIndex);
    }, 500);
  }

  public stopNote(noteIndex: number): void {
    const voice = this.activeVoices.get(noteIndex);
    if (!voice) return;

    try {
      voice.oscillator.stop();
      voice.oscillator.disconnect();
      voice.gainNode.disconnect();
    } catch (e) {
      // ignore
    }

    voice.isPlaying = false;
    this.activeVoices.delete(noteIndex);
  }

  public stopAllNotes(): void {
    for (const noteIndex of Array.from(this.activeVoices.keys())) {
      this.stopNote(noteIndex);
    }
  }

  public getSpectrumData(): Uint8Array {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>);
    }
    return this.frequencyData;
  }

  public isNotePlaying(noteIndex: number): boolean {
    return this.activeVoices.has(noteIndex) && this.activeVoices.get(noteIndex)!.isPlaying;
  }
}
