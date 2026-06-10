export interface FrequencyData {
  low: number;
  mid: number;
  high: number;
}

export interface Track {
  id: number;
  name: string;
  genre: string;
  bpm: number;
  baseFrequency: number;
  harmonicPattern: number[];
  bgColor: string;
}

export const TRACKS: Track[] = [
  {
    id: 0,
    name: 'Electronic Pulse',
    genre: '电子',
    bpm: 128,
    baseFrequency: 55,
    harmonicPattern: [1, 2, 3.99, 5.02],
    bgColor: 'linear-gradient(135deg, #1a0a2e 0%, #0a1628 50%, #0d0d2b 100%)',
  },
  {
    id: 1,
    name: 'Jazz Horizon',
    genre: '爵士',
    bpm: 96,
    baseFrequency: 110,
    harmonicPattern: [1, 1.25, 1.5, 2.01],
    bgColor: 'linear-gradient(135deg, #2a0a1e 0%, #1a1a2e 50%, #0d1a2b 100%)',
  },
  {
    id: 2,
    name: 'Classic Dreams',
    genre: '古典',
    bpm: 72,
    baseFrequency: 220,
    harmonicPattern: [1, 2, 3, 4],
    bgColor: 'linear-gradient(135deg, #0a1a2e 0%, #1a0a2e 50%, #0d0d1b 100%)',
  },
];

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private frequencyData: Uint8Array | null = null;
  private activeOscillators: OscillatorNode[] = [];
  private activeGains: GainNode[] = [];
  private masterGain: GainNode | null = null;
  private currentTrackId: number = -1;
  private lastUpdateTime: number = 0;
  private readonly updateInterval: number = 1000 / 60;
  private cachedFrequency: FrequencyData = { low: 0, mid: 0, high: 0 };

  async init(): Promise<void> {
    if (this.audioContext) return;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.75;
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.25;
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
  }

  private ensureContext(): void {
    if (!this.audioContext) {
      throw new Error('AudioAnalyzer not initialized. Call init() first.');
    }
  }

  private stopAllTracks(): void {
    this.ensureContext();
    const now = this.audioContext!.currentTime;
    this.activeOscillators.forEach((osc, i) => {
      const gain = this.activeGains[i];
      if (gain) {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      }
      setTimeout(() => {
        try { osc.stop(); } catch (_) {}
        try { osc.disconnect(); } catch (_) {}
      }, 350);
    });
    this.activeOscillators = [];
    this.activeGains = [];
  }

  playTrack(trackId: number): void {
    this.ensureContext();
    if (this.currentTrackId === trackId) return;
    this.stopAllTracks();
    this.currentTrackId = trackId;
    const track = TRACKS[trackId];
    if (!track || !this.audioContext || !this.masterGain) return;

    const ctx = this.audioContext;
    const beatDuration = 60 / track.bpm;
    const now = ctx.currentTime;

    track.harmonicPattern.forEach((harmonic, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = index === 0 ? 'sine' : index === 1 ? 'triangle' : 'sine';
      osc.frequency.value = track.baseFrequency * harmonic;
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now);

      const amplitude = 0.5 / (index + 1);
      const pattern = this.getBeatPattern(index, track.bpm);

      pattern.forEach((beat, beatIndex) => {
        const startTime = now + beatIndex * beatDuration * 0.5;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(amplitude * beat, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + beatDuration * 0.4);
      });

      this.activeOscillators.push(osc);
      this.activeGains.push(gain);
    });

    this.scheduleLoop(track, now + beatDuration * 8);
  }

  private getBeatPattern(harmonicIndex: number, bpm: number): number[] {
    const patterns: Record<number, number[]> = {
      128: [1, 0.3, 0.7, 0.4, 1, 0.3, 0.6, 0.5, 1, 0.3, 0.7, 0.4, 1, 0.3, 0.6, 0.5],
      96:  [0.8, 0.5, 0.3, 0.7, 0.6, 0.4, 0.8, 0.3, 0.7, 0.5, 0.4, 0.6, 0.8, 0.3, 0.5, 0.7],
      72:  [1, 0.2, 0.2, 0.6, 0.2, 0.2, 0.8, 0.2, 1, 0.2, 0.2, 0.5, 0.2, 0.3, 0.7, 0.2],
    };
    const base = patterns[bpm] || patterns[128];
    return base.map(v => Math.max(0.1, v - harmonicIndex * 0.15));
  }

  private scheduleLoop(track: Track, startTime: number): void {
    if (!this.audioContext || !this.masterGain) return;
    const ctx = this.audioContext;
    const beatDuration = 60 / track.bpm;

    const intervalId = setInterval(() => {
      if (this.currentTrackId !== track.id) {
        clearInterval(intervalId);
        return;
      }
      if (!this.audioContext || this.currentTrackId !== track.id) {
        clearInterval(intervalId);
        return;
      }

      const now = ctx.currentTime;
      track.harmonicPattern.forEach((harmonic, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = index === 0 ? 'sine' : index === 1 ? 'triangle' : 'sine';
        osc.frequency.value = track.baseFrequency * harmonic;
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now);

        const amplitude = 0.5 / (index + 1);
        const pattern = this.getBeatPattern(index, track.bpm);

        pattern.forEach((beat, beatIndex) => {
          const t = now + beatIndex * beatDuration * 0.5;
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(amplitude * beat, t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, t + beatDuration * 0.4);
        });

        this.activeOscillators.push(osc);
        this.activeGains.push(gain);
        setTimeout(() => {
          try { osc.stop(); } catch (_) {}
          try { osc.disconnect(); } catch (_) {}
          const idx = this.activeOscillators.indexOf(osc);
          if (idx > -1) {
            this.activeOscillators.splice(idx, 1);
            this.activeGains.splice(idx, 1);
          }
        }, beatDuration * 8 * 1000 + 500);
      });
    }, beatDuration * 8 * 1000);
  }

  getFrequencyData(): FrequencyData {
    const now = performance.now();
    if (now - this.lastUpdateTime < this.updateInterval) {
      return this.cachedFrequency;
    }
    this.lastUpdateTime = now;

    if (!this.analyser || !this.frequencyData) {
      this.cachedFrequency = { low: 0, mid: 0, high: 0 };
      return this.cachedFrequency;
    }

    this.analyser.getByteFrequencyData(this.frequencyData);
    const len = this.frequencyData.length;

    const lowEnd = Math.floor(len * 0.12);
    const midEnd = Math.floor(len * 0.45);

    let lowSum = 0, midSum = 0, highSum = 0;
    for (let i = 0; i < lowEnd; i++) lowSum += this.frequencyData[i];
    for (let i = lowEnd; i < midEnd; i++) midSum += this.frequencyData[i];
    for (let i = midEnd; i < len; i++) highSum += this.frequencyData[i];

    this.cachedFrequency = {
      low: Math.min(1, (lowSum / lowEnd) / 255),
      mid: Math.min(1, (midSum / (midEnd - lowEnd)) / 255),
      high: Math.min(1, (highSum / (len - midEnd)) / 255),
    };
    return this.cachedFrequency;
  }

  playClickSound(geometryType: number): void {
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const frequencies = [440, 523.25, 659.25, 783.99];
    const freq = frequencies[geometryType % frequencies.length];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.1);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  stop(): void {
    this.stopAllTracks();
    this.currentTrackId = -1;
  }

  resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}
