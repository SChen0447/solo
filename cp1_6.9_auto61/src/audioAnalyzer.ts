export interface AudioData {
  spectrum: Float32Array;
  bassEnergy: number;
  midEnergy: number;
  highEnergy: number;
  averageVolume: number;
}

type WaveformType = 'sine' | 'square' | 'sawtooth';

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private sourceNode: AudioNode | null = null;
  private spectrumData: Float32Array;
  private randomMode = false;
  private waveformType: WaveformType = 'sine';
  private waveformPhase = 0;
  private waveformFrequency = 3;
  private lastWaveformChange = 0;
  private audioElement: HTMLAudioElement | null = null;

  private static readonly FFT_SIZE = 64;
  private static readonly SAMPLE_RATE = 44100;

  constructor() {
    this.spectrumData = new Float32Array(AudioAnalyzer.FFT_SIZE);
  }

  async initFromMicrophone(): Promise<void> {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.setupAnalyser();
    this.sourceNode = this.audioContext.createMediaStreamSource(stream);
    this.sourceNode.connect(this.analyser!);
    this.randomMode = false;
  }

  async initFromFile(file: File): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    this.setupAnalyser();

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }
    this.audioElement = new Audio();
    this.audioElement.src = URL.createObjectURL(file);
    this.audioElement.loop = true;
    this.audioElement.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      this.audioElement!.addEventListener('canplaythrough', () => resolve(), { once: true });
      this.audioElement!.addEventListener('error', () => reject(new Error('Audio load failed')), { once: true });
    });

    const mediaSource = this.audioContext.createMediaElementSource(this.audioElement);
    this.sourceNode = mediaSource;
    mediaSource.connect(this.analyser!);
    this.analyser!.connect(this.audioContext.destination);
    this.audioElement.play().catch(() => {});
    this.randomMode = false;
  }

  startRandomMode(): void {
    this.randomMode = true;
    this.waveformPhase = 0;
    this.waveformFrequency = 1 + Math.random() * 9;
    this.lastWaveformChange = performance.now();
  }

  stopRandomMode(): void {
    this.randomMode = false;
  }

  isRandomMode(): boolean {
    return this.randomMode;
  }

  setVolume(value: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, value));
    }
    if (this.audioElement) {
      this.audioElement.volume = Math.max(0, Math.min(1, value));
    }
  }

  stopFilePlayback(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
  }

  private setupAnalyser(): void {
    if (!this.audioContext) return;
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = AudioAnalyzer.FFT_SIZE * 2;
    this.analyser.smoothingTimeConstant = 0.7;
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0.7;
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);
  }

  getAudioData(dt: number): AudioData {
    if (this.randomMode) {
      return this.generateSimulatedData(dt);
    }
    if (!this.analyser) {
      return {
        spectrum: this.spectrumData,
        bassEnergy: 0,
        midEnergy: 0,
        highEnergy: 0,
        averageVolume: 0
      };
    }

    const freqData = new Float32Array(this.analyser.frequencyBinCount);
    this.analyser.getFloatFrequencyData(freqData);

    for (let i = 0; i < AudioAnalyzer.FFT_SIZE && i < freqData.length; i++) {
      const db = freqData[i];
      const normalized = Math.max(0, Math.min(1, (db + 100) / 100));
      this.spectrumData[i] = normalized;
    }

    const bassEnd = Math.floor(250 / (AudioAnalyzer.SAMPLE_RATE / (AudioAnalyzer.FFT_SIZE * 2)));
    const midEnd = Math.floor(2000 / (AudioAnalyzer.SAMPLE_RATE / (AudioAnalyzer.FFT_SIZE * 2)));

    let bassSum = 0, midSum = 0, highSum = 0, totalSum = 0;
    const bassCount = Math.max(1, Math.min(bassEnd, this.spectrumData.length));
    for (let i = 0; i < bassCount; i++) bassSum += this.spectrumData[i];

    const midStart = bassEnd;
    const midCount = Math.max(1, Math.min(midEnd - midStart, this.spectrumData.length - midStart));
    for (let i = midStart; i < midStart + midCount && i < this.spectrumData.length; i++) {
      midSum += this.spectrumData[i];
    }

    const highStart = Math.max(midEnd, 0);
    const highCount = Math.max(1, this.spectrumData.length - highStart);
    for (let i = highStart; i < this.spectrumData.length; i++) {
      highSum += this.spectrumData[i];
    }

    for (let i = 0; i < this.spectrumData.length; i++) totalSum += this.spectrumData[i];

    return {
      spectrum: this.spectrumData,
      bassEnergy: bassSum / bassCount,
      midEnergy: midSum / midCount,
      highEnergy: highSum / highCount,
      averageVolume: totalSum / this.spectrumData.length
    };
  }

  private generateSimulatedData(dt: number): AudioData {
    const now = performance.now();
    if (now - this.lastWaveformChange > 2000) {
      const types: WaveformType[] = ['sine', 'square', 'sawtooth'];
      this.waveformType = types[Math.floor(Math.random() * types.length)];
      this.waveformFrequency = 1 + Math.random() * 9;
      this.lastWaveformChange = now;
    }

    this.waveformPhase += this.waveformFrequency * dt * Math.PI * 2;
    if (this.waveformPhase > Math.PI * 2) this.waveformPhase -= Math.PI * 2;

    let value: number;
    switch (this.waveformType) {
      case 'square':
        value = Math.sin(this.waveformPhase) >= 0 ? 1 : 0;
        break;
      case 'sawtooth':
        value = (this.waveformPhase / (Math.PI * 2)) % 1;
        break;
      default:
        value = (Math.sin(this.waveformPhase) + 1) / 2;
    }

    value = 0.3 + value * 0.7;

    for (let i = 0; i < this.spectrumData.length; i++) {
      const t = i / this.spectrumData.length;
      const envelope = Math.sin(t * Math.PI);
      const noise = (Math.random() - 0.5) * 0.15;
      this.spectrumData[i] = Math.max(0, Math.min(1, value * envelope * (0.6 + Math.random() * 0.4) + noise));
    }

    const bassCount = Math.floor(this.spectrumData.length * 0.2);
    const midCount = Math.floor(this.spectrumData.length * 0.5);

    let bassSum = 0, midSum = 0, highSum = 0, totalSum = 0;
    for (let i = 0; i < bassCount; i++) bassSum += this.spectrumData[i];
    for (let i = bassCount; i < bassCount + midCount && i < this.spectrumData.length; i++) {
      midSum += this.spectrumData[i];
    }
    for (let i = bassCount + midCount; i < this.spectrumData.length; i++) {
      highSum += this.spectrumData[i];
    }
    for (let i = 0; i < this.spectrumData.length; i++) totalSum += this.spectrumData[i];

    return {
      spectrum: this.spectrumData,
      bassEnergy: bassSum / bassCount,
      midEnergy: midSum / Math.max(1, midCount),
      highEnergy: highSum / Math.max(1, this.spectrumData.length - bassCount - midCount),
      averageVolume: totalSum / this.spectrumData.length
    };
  }

  dispose(): void {
    this.stopFilePlayback();
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
    }
  }
}
