export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private frequencyData: Uint8Array<ArrayBuffer> | null = null;
  private timeDomainData: Uint8Array<ArrayBuffer> | null = null;
  private isInitialized: boolean = false;

  private readonly FFT_SIZE: number = 2048;
  private readonly SMOOTHING_TIME_CONSTANT: number = 0.8;

  constructor() {}

  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

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
      this.analyser.fftSize = this.FFT_SIZE;
      this.analyser.smoothingTimeConstant = this.SMOOTHING_TIME_CONSTANT;

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser);

      const freqBuffer = new ArrayBuffer(this.analyser.frequencyBinCount);
      const timeBuffer = new ArrayBuffer(this.analyser.fftSize);
      this.frequencyData = new Uint8Array(freqBuffer);
      this.timeDomainData = new Uint8Array(timeBuffer);

      this.isInitialized = true;
    } catch (error) {
      console.error('音频初始化失败:', error);
      throw error;
    }
  }

  getFrequencyArray(): Uint8Array {
    if (!this.analyser || !this.frequencyData) {
      return new Uint8Array(0);
    }
    this.analyser.getByteFrequencyData(this.frequencyData);
    return this.frequencyData;
  }

  getTimeDomainArray(): Uint8Array {
    if (!this.analyser || !this.timeDomainData) {
      return new Uint8Array(0);
    }
    this.analyser.getByteTimeDomainData(this.timeDomainData);
    return this.timeDomainData;
  }

  getFrequencyBands(): number[] {
    const freqData = this.getFrequencyArray();
    if (freqData.length === 0) {
      return [0, 0, 0, 0, 0, 0, 0, 0];
    }

    const bands: number[] = [];
    const bandBoundaries = [
      0, 0.03, 0.125, 0.25, 1, 2, 4, 8, 20
    ];

    const sampleRate = this.analyser?.context.sampleRate || 44100;
    const nyquist = sampleRate / 2;

    for (let i = 0; i < bandBoundaries.length - 1; i++) {
      const startFreq = bandBoundaries[i] * 1000;
      const endFreq = bandBoundaries[i + 1] * 1000;
      
      const startBin = Math.floor(startFreq / nyquist * freqData.length);
      const endBin = Math.floor(endFreq / nyquist * freqData.length);
      
      const actualStart = Math.max(0, startBin);
      const actualEnd = Math.min(freqData.length - 1, endBin);
      
      if (actualEnd <= actualStart) {
        bands.push(0);
        continue;
      }

      let sum = 0;
      for (let j = actualStart; j <= actualEnd; j++) {
        sum += freqData[j];
      }
      bands.push(sum / (actualEnd - actualStart + 1) / 255);
    }

    return bands;
  }

  getAverageVolume(): number {
    const timeData = this.getTimeDomainArray();
    if (timeData.length === 0) return 0;

    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
      const v = (timeData[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / timeData.length);
  }

  resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  dispose(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
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
    this.frequencyData = null;
    this.timeDomainData = null;
    this.isInitialized = false;
  }

  get ready(): boolean {
    return this.isInitialized;
  }
}
