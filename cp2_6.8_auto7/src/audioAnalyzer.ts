export interface AudioFeatures {
  spectrum: Float32Array;
  volume: number;
  bassEnergy: number;
  midEnergy: number;
  highEnergy: number;
  pan: number;
  waveform: Float32Array;
}

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private analyserLeft: AnalyserNode | null = null;
  private analyserRight: AnalyserNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private splitter: ChannelSplitterNode | null = null;
  private stream: MediaStream | null = null;
  private fftSize: number = 2048;
  private frequencyBinCount: number = 0;
  private sampleRate: number = 44100;
  private spectrumData: Float32Array = new Float32Array();
  private waveformData: Float32Array = new Float32Array();
  private waveformLeft: Float32Array = new Float32Array();
  private waveformRight: Float32Array = new Float32Array();
  private isInitialized: boolean = false;
  private targetGain: number = 1.0;
  private currentGain: number = 1.0;
  private smoothFactor: number = 0.85;

  constructor() {}

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
          channelCount: 2
        }
      });

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.sampleRate = this.audioContext.sampleRate;

      this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.stream);
      
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0;

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = 0.8;
      this.frequencyBinCount = this.analyser.frequencyBinCount;

      this.splitter = this.audioContext.createChannelSplitter(2);
      this.analyserLeft = this.audioContext.createAnalyser();
      this.analyserRight = this.audioContext.createAnalyser();
      this.analyserLeft.fftSize = this.fftSize;
      this.analyserRight.fftSize = this.fftSize;
      this.analyserLeft.smoothingTimeConstant = 0.5;
      this.analyserRight.smoothingTimeConstant = 0.5;

      this.spectrumData = new Float32Array(this.frequencyBinCount);
      this.waveformData = new Float32Array(this.fftSize);
      this.waveformLeft = new Float32Array(this.fftSize);
      this.waveformRight = new Float32Array(this.fftSize);

      this.mediaStreamSource.connect(this.gainNode);
      this.gainNode.connect(this.analyser);
      this.gainNode.connect(this.splitter);
      this.splitter.connect(this.analyserLeft, 0);
      this.splitter.connect(this.analyserRight, 1);

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize audio analyzer:', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.isInitialized = false;
  }

  getFeatures(): AudioFeatures {
    if (!this.analyser || !this.analyserLeft || !this.analyserRight) {
      return {
        spectrum: new Float32Array(),
        volume: 0,
        bassEnergy: 0,
        midEnergy: 0,
        highEnergy: 0,
        pan: 0,
        waveform: new Float32Array()
      };
    }

    this.analyser.getFloatFrequencyData(this.spectrumData as any);
    this.analyser.getFloatTimeDomainData(this.waveformData as any);
    this.analyserLeft.getFloatTimeDomainData(this.waveformLeft as any);
    this.analyserRight.getFloatTimeDomainData(this.waveformRight as any);

    const normalizedSpectrum = this.normalizeSpectrum(this.spectrumData);

    const volume = this.calculateVolume(this.waveformData);

    const { bassEnergy, midEnergy, highEnergy } = this.calculateBandEnergies(normalizedSpectrum);

    const pan = this.calculatePan();

    this.applyAutoGainControl(volume);

    return {
      spectrum: normalizedSpectrum,
      volume,
      bassEnergy,
      midEnergy,
      highEnergy,
      pan,
      waveform: this.waveformData
    };
  }

  private normalizeSpectrum(spectrum: Float32Array): Float32Array {
    const normalized = new Float32Array(spectrum.length);
    const minDb = -100;
    const maxDb = -10;

    for (let i = 0; i < spectrum.length; i++) {
      const db = spectrum[i];
      let normalizedValue = (db - minDb) / (maxDb - minDb);
      normalizedValue = Math.max(0, Math.min(1, normalizedValue));
      normalized[i] = normalizedValue;
    }

    return normalized;
  }

  private calculateVolume(waveform: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < waveform.length; i++) {
      sum += waveform[i] * waveform[i];
    }
    const rms = Math.sqrt(sum / waveform.length);
    return Math.min(1, rms * 3);
  }

  private calculateBandEnergies(spectrum: Float32Array): {
    bassEnergy: number;
    midEnergy: number;
    highEnergy: number;
  } {
    const length = spectrum.length;
    const bassEnd = Math.floor(length * 0.1);
    const midEnd = Math.floor(length * 0.5);

    let bassSum = 0;
    let midSum = 0;
    let highSum = 0;

    for (let i = 0; i < bassEnd; i++) {
      bassSum += spectrum[i];
    }
    for (let i = bassEnd; i < midEnd; i++) {
      midSum += spectrum[i];
    }
    for (let i = midEnd; i < length; i++) {
      highSum += spectrum[i];
    }

    const bassEnergy = bassSum / bassEnd;
    const midEnergy = midSum / (midEnd - bassEnd);
    const highEnergy = highSum / (length - midEnd);

    return {
      bassEnergy: Math.min(1, bassEnergy),
      midEnergy: Math.min(1, midEnergy),
      highEnergy: Math.min(1, highEnergy)
    };
  }

  private calculatePan(): number {
    let leftEnergy = 0;
    let rightEnergy = 0;

    for (let i = 0; i < this.waveformLeft.length; i++) {
      leftEnergy += this.waveformLeft[i] * this.waveformLeft[i];
      rightEnergy += this.waveformRight[i] * this.waveformRight[i];
    }

    leftEnergy = Math.sqrt(leftEnergy / this.waveformLeft.length);
    rightEnergy = Math.sqrt(rightEnergy / this.waveformRight.length);

    const total = leftEnergy + rightEnergy;
    if (total < 0.0001) return 0;

    let pan = (rightEnergy - leftEnergy) / total;
    pan = Math.max(-1, Math.min(1, pan));

    return pan;
  }

  private applyAutoGainControl(volume: number): void {
    const targetVolume = 0.3;
    
    if (volume > 0.01) {
      const ratio = targetVolume / volume;
      this.targetGain = Math.max(0.5, Math.min(3.0, ratio));
    }

    this.currentGain += (this.targetGain - this.currentGain) * 0.02;

    if (this.gainNode) {
      this.gainNode.gain.setTargetAtTime(this.currentGain, this.audioContext?.currentTime || 0, 0.1);
    }
  }

  getFrequencyBinCount(): number {
    return this.frequencyBinCount;
  }

  getSampleRate(): number {
    return this.sampleRate;
  }

  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }
}
