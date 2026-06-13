import { MIN_SONAR_RADIUS, MAX_SONAR_RADIUS } from './maze';

export interface AudioAnalysis {
  frequency: number;
  loudness: number;
  normalizedLoudness: number;
  sonarRadius: number;
}

export const MIN_FREQUENCY = 100;
export const MAX_FREQUENCY = 2000;
export const FFT_SIZE = 2048;
export const ANALYSIS_INTERVAL = 16;

export class ReverbProcessor {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private frequencyData: Uint8Array;
  private timeData: Float32Array;
  private frequencyHistory: number[] = [];
  private loudnessHistory: number[] = [];
  private historySize = 8;
  private echoOscillator: OscillatorNode | null = null;
  private echoGain: GainNode | null = null;
  private isInitialized = false;

  constructor() {
    this.frequencyData = new Uint8Array(FFT_SIZE / 2);
    this.timeData = new Float32Array(FFT_SIZE);
  }

  public async initialize(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = FFT_SIZE;
      this.analyser.smoothingTimeConstant = 0.8;

      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);

      this.echoGain = this.audioContext.createGain();
      this.echoGain.gain.value = 0;
      this.echoGain.connect(this.audioContext.destination);

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      return false;
    }
  }

  public getIsInitialized(): boolean {
    return this.isInitialized;
  }

  public suspend(): void {
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend();
    }
  }

  public resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public analyze(): AudioAnalysis {
    if (!this.isInitialized || !this.analyser) {
      return {
        frequency: 0,
        loudness: -60,
        normalizedLoudness: 0,
        sonarRadius: MIN_SONAR_RADIUS,
      };
    }

    this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array);
    this.analyser.getFloatTimeDomainData(this.timeData as Float32Array);

    const frequency = this.detectDominantFrequency();
    const loudness = this.calculateLoudness();

    this.frequencyHistory.push(frequency);
    this.loudnessHistory.push(loudness);
    if (this.frequencyHistory.length > this.historySize) {
      this.frequencyHistory.shift();
      this.loudnessHistory.shift();
    }

    const smoothedFrequency = this.smooth(this.frequencyHistory);
    const smoothedLoudness = this.smooth(this.loudnessHistory);

    const normalizedLoudness = this.normalizeLoudness(smoothedLoudness);
    const sonarRadius = MIN_SONAR_RADIUS + normalizedLoudness * (MAX_SONAR_RADIUS - MIN_SONAR_RADIUS);

    return {
      frequency: Math.round(smoothedFrequency),
      loudness: Math.round(smoothedLoudness),
      normalizedLoudness,
      sonarRadius,
    };
  }

  private detectDominantFrequency(): number {
    if (!this.analyser) return MIN_FREQUENCY;

    const sampleRate = this.audioContext?.sampleRate || 44100;
    const nyquist = sampleRate / 2;
    const binWidth = nyquist / (FFT_SIZE / 2);

    let maxIndex = 0;
    let maxValue = 0;

    const minBin = Math.floor(MIN_FREQUENCY / binWidth);
    const maxBin = Math.ceil(MAX_FREQUENCY / binWidth);

    for (let i = minBin; i <= maxBin && i < this.frequencyData.length; i++) {
      if (this.frequencyData[i] > maxValue) {
        maxValue = this.frequencyData[i];
        maxIndex = i;
      }
    }

    let dominantFreq = maxIndex * binWidth;

    if (maxIndex > 0 && maxIndex < this.frequencyData.length - 1) {
      const y0 = this.frequencyData[maxIndex - 1];
      const y1 = this.frequencyData[maxIndex];
      const y2 = this.frequencyData[maxIndex + 1];
      const correction = (y2 - y0) / (2 * (2 * y1 - y0 - y2));
      dominantFreq = (maxIndex + correction) * binWidth;
    }

    return Math.max(MIN_FREQUENCY, Math.min(MAX_FREQUENCY, dominantFreq));
  }

  private calculateLoudness(): number {
    let sumSquares = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      sumSquares += this.timeData[i] * this.timeData[i];
    }
    const rms = Math.sqrt(sumSquares / this.timeData.length);
    const reference = 0.00002;
    const db = 20 * Math.log10(Math.max(rms, reference) / reference);
    return Math.max(-60, Math.min(0, db));
  }

  private normalizeLoudness(db: number): number {
    const minDb = -60;
    const maxDb = -10;
    const normalized = (db - minDb) / (maxDb - minDb);
    return Math.max(0, Math.min(1, normalized));
  }

  private smooth(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const start = Math.floor(sorted.length * 0.25);
    const end = Math.ceil(sorted.length * 0.75);
    const trimmed = sorted.slice(start, end);
    return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
  }

  public playEchoSound(frequency: number, intensity: number): void {
    if (!this.isInitialized || !this.audioContext || !this.echoGain) return;

    if (this.echoOscillator) {
      this.echoOscillator.stop();
      this.echoOscillator.disconnect();
    }

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.value = frequency * 2;
    filter.Q.value = 1;

    osc.type = 'sine';
    osc.frequency.value = frequency;

    const echoDelay = this.audioContext.createDelay(0.5);
    echoDelay.delayTime.value = 0.1;

    const echoGain2 = this.audioContext.createGain();
    echoGain2.gain.value = 0.3;

    gain.gain.setValueAtTime(0, this.audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(intensity * 0.15, this.audioContext.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioContext.destination);
    gain.connect(echoDelay);
    echoDelay.connect(echoGain2);
    echoGain2.connect(this.audioContext.destination);
    echoGain2.connect(echoDelay);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.5);

    this.echoOscillator = osc;
  }

  public playCollectSound(): void {
    if (!this.isInitialized || !this.audioContext) return;

    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const startTime = this.audioContext!.currentTime + i * 0.15;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(this.audioContext!.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  }

  public playVictorySound(): void {
    if (!this.isInitialized || !this.audioContext) return;

    const scale = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
    scale.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = 'triangle';
      osc.frequency.value = freq;

      const startTime = this.audioContext!.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

      osc.connect(gain);
      gain.connect(this.audioContext!.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.7);
    });

    setTimeout(() => {
      const chord = [329.63, 415.30, 523.25, 659.25];
      chord.forEach((freq) => {
        const osc = this.audioContext!.createOscillator();
        const gain = this.audioContext!.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;

        const startTime = this.audioContext!.currentTime;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.15, startTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.5);

        osc.connect(gain);
        gain.connect(this.audioContext!.destination);
        osc.start(startTime);
        osc.stop(startTime + 1.6);
      });
    }, scale.length * 120 + 200);
  }

  public dispose(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    if (this.echoOscillator) {
      this.echoOscillator.stop();
      this.echoOscillator.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.isInitialized = false;
  }
}
