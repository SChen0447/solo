export interface BeatAnalysisResult {
  beats: number[];
  bpm: number;
  duration: number;
}

export class BPMAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private gainNode: GainNode | null = null;
  private frequencyData: Uint8Array | null = null;
  private startTime: number = 0;
  private isPlaying: boolean = false;
  private isDemo: boolean = false;
  private demoDuration: number = 0;
  private demoBpm: number = 120;
  private demoStartTime: number = 0;
  private demoPausedTime: number = 0;

  constructor() {}

  async loadAudioFromFile(file: File): Promise<BeatAnalysisResult> {
    const arrayBuffer = await file.arrayBuffer();
    return this.decodeAndAnalyze(arrayBuffer);
  }

  async loadAudioFromUrl(url: string): Promise<BeatAnalysisResult> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return this.decodeAndAnalyze(arrayBuffer);
  }

  private async decodeAndAnalyze(arrayBuffer: ArrayBuffer): Promise<BeatAnalysisResult> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
    const result = this.analyzeBeats(this.audioBuffer);

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0.7;

    return result;
  }

  private analyzeBeats(buffer: AudioBuffer): BeatAnalysisResult {
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const duration = buffer.duration;

    const windowSize = Math.floor(sampleRate * 0.05);
    const hopSize = Math.floor(windowSize / 2);
    const energies: number[] = [];

    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      let energy = 0;
      for (let j = 0; j < windowSize; j++) {
        energy += channelData[i + j] * channelData[i + j];
      }
      energies.push(energy / windowSize);
    }

    const avgEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;
    const threshold = avgEnergy * 1.3;

    const beats: number[] = [];
    const minBeatInterval = sampleRate * 0.2 / hopSize;
    let lastBeatIndex = -Infinity;

    for (let i = 1; i < energies.length - 1; i++) {
      if (energies[i] > threshold &&
          energies[i] > energies[i - 1] &&
          energies[i] > energies[i + 1] &&
          i - lastBeatIndex > minBeatInterval) {
        const time = (i * hopSize) / sampleRate;
        beats.push(time);
        lastBeatIndex = i;
      }
    }

    let bpm = 120;
    if (beats.length > 1) {
      const intervals: number[] = [];
      for (let i = 1; i < beats.length; i++) {
        intervals.push(beats[i] - beats[i - 1]);
      }
      intervals.sort((a, b) => a - b);
      const medianInterval = intervals[Math.floor(intervals.length / 2)];
      bpm = Math.round(60 / medianInterval);
      bpm = Math.max(60, Math.min(200, bpm));
    }

    return { beats, bpm, duration };
  }

  generateEvenBeats(bpm: number, duration: number): number[] {
    const beats: number[] = [];
    const interval = 60 / bpm;
    for (let t = 0; t <= duration; t += interval) {
      beats.push(t);
    }
    return beats;
  }

  setupDemoBuffer(bpm: number, duration: number): void {
    this.isDemo = true;
    this.demoBpm = bpm;
    this.demoDuration = duration;
    this.frequencyData = new Uint8Array(128);
  }

  play(startTime: number = 0): void {
    if (this.isDemo) {
      this.isPlaying = true;
      this.demoStartTime = performance.now() / 1000 - startTime;
      this.demoPausedTime = 0;
      return;
    }

    if (!this.audioContext || !this.audioBuffer || !this.analyser || !this.gainNode) return;

    this.stop();

    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.analyser);
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    this.source.start(0, startTime);
    this.startTime = this.audioContext.currentTime - startTime;
    this.isPlaying = true;
  }

  pause(): void {
    if (this.isDemo && this.isPlaying) {
      this.isPlaying = false;
      this.demoPausedTime = this.getCurrentTime();
      return;
    }

    if (this.source && this.isPlaying) {
      this.source.stop();
      this.isPlaying = false;
    }
  }

  stop(): void {
    if (this.isDemo) {
      this.isPlaying = false;
      this.demoPausedTime = 0;
      return;
    }

    if (this.source) {
      try {
        this.source.stop();
      } catch (e) {}
      this.source.disconnect();
      this.source = null;
    }
    this.isPlaying = false;
  }

  getCurrentTime(): number {
    if (this.isDemo) {
      if (!this.isPlaying) {
        return this.demoPausedTime;
      }
      return performance.now() / 1000 - this.demoStartTime;
    }

    if (!this.audioContext || !this.isPlaying) return 0;
    return this.audioContext.currentTime - this.startTime;
  }

  getFrequencyData(): Uint8Array | null {
    if (this.isDemo && this.frequencyData) {
      const time = this.getCurrentTime();
      const beatInterval = 60 / this.demoBpm;
      const beatProgress = (time % beatInterval) / beatInterval;
      const beatIntensity = Math.max(0, 1 - beatProgress * 2) * 0.8 + 0.2;

      for (let i = 0; i < this.frequencyData.length; i++) {
        const freqFactor = 1 - i / this.frequencyData.length;
        const base = Math.sin(time * 2 + i * 0.1) * 0.3 + 0.5;
        const beatBoost = beatIntensity * freqFactor;
        const value = Math.min(1, base * 0.5 + beatBoost * 0.8) * 255;
        this.frequencyData[i] = value;
      }
      return this.frequencyData;
    }

    if (!this.analyser || !this.frequencyData) return null;
    this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>);
    return this.frequencyData;
  }

  getAudioDuration(): number {
    if (this.isDemo) {
      return this.demoDuration;
    }
    return this.audioBuffer?.duration || 0;
  }

  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  isAudioLoaded(): boolean {
    if (this.isDemo) return true;
    return this.audioBuffer !== null;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  dispose(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.audioBuffer = null;
    this.analyser = null;
    this.gainNode = null;
    this.frequencyData = null;
  }
}
