export type FrequencyBand = 'low' | 'mid' | 'high';

export interface AudioData {
  lowEnergy: number;
  midEnergy: number;
  highEnergy: number;
  isBeat: boolean;
  beatStrength: number;
  bpm: number;
}

type BeatListener = (strength: number) => void;
type AudioDataListener = (data: AudioData) => void;

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private frequencyData: Uint8Array | null = null;
  private timeData: Uint8Array | null = null;

  private energyHistory: number[] = [];
  private beatHistory: number[] = [];
  private lastBeatTime: number = 0;
  private bpm: number = 120;
  private beatInterval: number = 500;

  private currentData: AudioData = {
    lowEnergy: 0,
    midEnergy: 0,
    highEnergy: 0,
    isBeat: false,
    beatStrength: 0,
    bpm: 120
  };

  private smoothedLow: number = 0;
  private smoothedMid: number = 0;
  private smoothedHigh: number = 0;

  private beatListeners: BeatListener[] = [];
  private dataListeners: AudioDataListener[] = [];

  private isAnalyzing: boolean = false;
  private animationId: number | null = null;
  private lastSampleTime: number = 0;

  constructor() {}

  async loadFromFile(file: File): Promise<void> {
    this.stop();

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const url = URL.createObjectURL(file);

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }

    this.audioElement = new Audio();
    this.audioElement.src = url;
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.loop = true;

    if (this.source) {
      this.source.disconnect();
    }

    this.source = this.audioContext.createMediaElementSource(this.audioElement);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.7;

    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeData = new Uint8Array(this.analyser.fftSize);

    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    this.energyHistory = [];
    this.beatHistory = [];
    this.lastBeatTime = 0;
    this.bpm = 120;
    this.beatInterval = 500;
    this.smoothedLow = 0;
    this.smoothedMid = 0;
    this.smoothedHigh = 0;

    return new Promise((resolve) => {
      if (!this.audioElement) return resolve();
      this.audioElement.addEventListener('canplaythrough', () => resolve(), { once: true });
    });
  }

  play(): void {
    if (this.audioElement) {
      this.audioElement.play();
      this.startAnalysis();
    }
  }

  pause(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.stopAnalysis();
    }
  }

  resume(): void {
    if (this.audioElement) {
      this.audioElement.play();
      this.startAnalysis();
    }
  }

  stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    this.stopAnalysis();
  }

  isPlaying(): boolean {
    return this.audioElement ? !this.audioElement.paused : false;
  }

  isLoaded(): boolean {
    return this.audioElement !== null && this.audioElement.src !== '';
  }

  getTrackName(): string {
    if (!this.audioElement || !this.audioElement.src) return '';
    try {
      const url = new URL(this.audioElement.src);
      const path = decodeURIComponent(url.pathname);
      const parts = path.split('/');
      return parts[parts.length - 1] || 'Unknown Track';
    } catch {
      return 'Unknown Track';
    }
  }

  getCurrentData(): AudioData {
    return { ...this.currentData };
  }

  getBPM(): number {
    return this.bpm;
  }

  onBeat(listener: BeatListener): () => void {
    this.beatListeners.push(listener);
    return () => {
      this.beatListeners = this.beatListeners.filter(l => l !== listener);
    };
  }

  onData(listener: AudioDataListener): () => void {
    this.dataListeners.push(listener);
    return () => {
      this.dataListeners = this.dataListeners.filter(l => l !== listener);
    };
  }

  private startAnalysis(): void {
    if (this.isAnalyzing) return;
    this.isAnalyzing = true;
    this.lastSampleTime = performance.now();
    this.analyzeLoop();
  }

  private stopAnalysis(): void {
    this.isAnalyzing = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private analyzeLoop = (): void => {
    if (!this.isAnalyzing || !this.analyser || !this.frequencyData || !this.timeData) {
      return;
    }

    const now = performance.now();
    const elapsed = now - this.lastSampleTime;

    if (elapsed >= 50) {
      this.lastSampleTime = now;
      this.analyser.getByteFrequencyData(this.frequencyData);
      this.analyser.getByteTimeDomainData(this.timeData);

      const binCount = this.frequencyData.length;
      const sampleRate = this.audioContext?.sampleRate || 44100;
      const binWidth = sampleRate / (this.analyser.fftSize);

      const lowEnd = Math.floor(250 / binWidth);
      const midEnd = Math.floor(2000 / binWidth);

      let lowSum = 0, lowCount = 0;
      let midSum = 0, midCount = 0;
      let highSum = 0, highCount = 0;

      for (let i = 0; i < binCount; i++) {
        const val = this.frequencyData[i] / 255;
        if (i <= lowEnd) {
          lowSum += val;
          lowCount++;
        } else if (i <= midEnd) {
          midSum += val;
          midCount++;
        } else {
          highSum += val;
          highCount++;
        }
      }

      const rawLow = lowCount > 0 ? lowSum / lowCount : 0;
      const rawMid = midCount > 0 ? midSum / midCount : 0;
      const rawHigh = highCount > 0 ? highSum / highCount : 0;

      const smoothing = 0.6;
      this.smoothedLow = this.smoothedLow * smoothing + rawLow * (1 - smoothing);
      this.smoothedMid = this.smoothedMid * smoothing + rawMid * (1 - smoothing);
      this.smoothedHigh = this.smoothedHigh * smoothing + rawHigh * (1 - smoothing);

      const totalEnergy = (this.smoothedLow + this.smoothedMid + this.smoothedHigh) / 3;
      this.energyHistory.push(totalEnergy);
      if (this.energyHistory.length > 43) {
        this.energyHistory.shift();
      }

      const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / Math.max(this.energyHistory.length, 1);
      const energyVariance = this.energyHistory.reduce((acc, e) => acc + Math.pow(e - avgEnergy, 2), 0) / Math.max(this.energyHistory.length, 1);
      const energyStdDev = Math.sqrt(energyVariance);

      const threshold = avgEnergy + energyStdDev * 1.3;
      const isBeat = totalEnergy > threshold && totalEnergy > 0.15;

      let beatStrength = 0;
      if (isBeat) {
        const timeSinceLastBeat = now - this.lastBeatTime;
        if (timeSinceLastBeat > this.beatInterval * 0.6) {
          beatStrength = Math.min(1, (totalEnergy - threshold) / Math.max(threshold, 0.01));
          this.lastBeatTime = now;

          this.beatHistory.push(timeSinceLastBeat);
          if (this.beatHistory.length > 8) {
            this.beatHistory.shift();
          }

          const avgInterval = this.beatHistory.reduce((a, b) => a + b, 0) / this.beatHistory.length;
          this.beatInterval = avgInterval;
          this.bpm = Math.round(60000 / avgInterval);
          this.bpm = Math.max(60, Math.min(200, this.bpm));

          this.beatListeners.forEach(l => l(beatStrength));
        }
      }

      this.currentData = {
        lowEnergy: this.smoothedLow,
        midEnergy: this.smoothedMid,
        highEnergy: this.smoothedHigh,
        isBeat,
        beatStrength,
        bpm: this.bpm
      };

      this.dataListeners.forEach(l => l(this.currentData));
    }

    this.animationId = requestAnimationFrame(this.analyzeLoop);
  };

  destroy(): void {
    this.stop();
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.audioElement = null;
    this.frequencyData = null;
    this.timeData = null;
    this.beatListeners = [];
    this.dataListeners = [];
  }
}
