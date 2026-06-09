export interface MelodyParams {
  releaseYear: number;
  artist: string;
  duration?: number;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private activeOscillators: OscillatorNode[] = [];
  private isPlaying: boolean = false;
  private stopTimeout: number | null = null;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0.3;
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
    }
    return this.audioContext;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private getFrequencyScale(releaseYear: number): number[] {
    const baseNotes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
    const decade = Math.floor(releaseYear / 10) % 10;
    const shift = decade % baseNotes.length;
    return baseNotes.map((_, i) => baseNotes[(i + shift) % baseNotes.length]);
  }

  private getWaveformType(artist: string): OscillatorType {
    const types: OscillatorType[] = ['sine', 'square', 'sawtooth', 'triangle'];
    const hash = this.hashString(artist);
    return types[hash % types.length];
  }

  playRandomMelody(params: MelodyParams): void {
    const { releaseYear, artist, duration = 5000 } = params;

    if (this.isPlaying) {
      this.stop();
    }

    const ctx = this.getContext();
    const scale = this.getFrequencyScale(releaseYear);
    const waveform = this.getWaveformType(artist);
    const artistHash = this.hashString(artist);
    const yearFactor = (releaseYear % 100) / 100;

    const noteCount = Math.floor(8 + yearFactor * 8);
    const noteDuration = duration / noteCount;

    this.isPlaying = true;

    for (let i = 0; i < noteCount; i++) {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      const noteIndex = (artistHash + i * 7) % scale.length;
      const octaveShift = Math.floor(((artistHash + i * 3) % 3) - 1);
      const frequency = scale[noteIndex] * Math.pow(2, octaveShift);

      osc.type = waveform;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime + (i * noteDuration) / 1000);

      const startTime = ctx.currentTime + (i * noteDuration) / 1000;
      const endTime = startTime + (noteDuration * 0.8) / 1000;

      noteGain.gain.setValueAtTime(0, startTime);
      noteGain.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
      noteGain.gain.exponentialRampToValueAtTime(0.01, endTime);

      osc.connect(noteGain);
      noteGain.connect(this.gainNode!);

      osc.start(startTime);
      osc.stop(endTime);

      this.activeOscillators.push(osc);
    }

    this.stopTimeout = window.setTimeout(() => {
      this.stop();
    }, duration);
  }

  stop(): void {
    this.activeOscillators.forEach(osc => {
      try {
        osc.stop();
      } catch {
        // oscillator may have already stopped
      }
    });
    this.activeOscillators = [];
    this.isPlaying = false;

    if (this.stopTimeout) {
      clearTimeout(this.stopTimeout);
      this.stopTimeout = null;
    }
  }

  getByteFrequencyData(dataArray: Uint8Array): void {
    if (this.analyser) {
      (this.analyser.getByteFrequencyData as (data: Uint8Array) => void)(dataArray);
    }
  }

  getFrequencyBinCount(): number {
    return this.analyser ? this.analyser.frequencyBinCount : 0;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}

export const audioEngine = new AudioEngine();
