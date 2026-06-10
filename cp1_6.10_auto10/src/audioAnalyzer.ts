export interface AudioFrequencyData {
  low: number;
  mid: number;
  high: number;
}

export type AudioCallback = (data: AudioFrequencyData) => void;

const FFT_SIZE = 2048;
const LOW_MIN = 20;
const LOW_MAX = 250;
const MID_MIN = 250;
const MID_MAX = 2000;
const HIGH_MIN = 2000;
const HIGH_MAX = 20000;

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null = null;
  private microphoneStream: MediaStream | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private frequencyData: Uint8Array;
  private callback: AudioCallback;
  private animationId: number | null = null;
  private isRunning: boolean = false;

  constructor(callback: AudioCallback) {
    this.callback = callback;
    this.frequencyData = new Uint8Array(FFT_SIZE);
  }

  private async ensureContext(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = FFT_SIZE;
      this.analyser.smoothingTimeConstant = 0.8;
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  async startMicrophone(): Promise<void> {
    this.stop();
    await this.ensureContext();

    try {
      this.microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.source = this.audioContext!.createMediaStreamSource(this.microphoneStream);
      this.source.connect(this.analyser!);
      this.startLoop();
    } catch (err) {
      console.error('麦克风获取失败:', err);
      throw err;
    }
  }

  async startFile(file: File): Promise<void> {
    this.stop();
    await this.ensureContext();

    this.audioElement = new Audio();
    this.audioElement.src = URL.createObjectURL(file);
    this.audioElement.loop = true;
    this.audioElement.crossOrigin = 'anonymous';

    this.source = this.audioContext!.createMediaElementSource(this.audioElement);
    this.source.connect(this.analyser!);
    this.analyser!.connect(this.audioContext!.destination);

    try {
      await this.audioElement.play();
      this.startLoop();
    } catch (err) {
      console.error('音频播放失败:', err);
      throw err;
    }
  }

  private startLoop(): void {
    this.isRunning = true;
    const loop = () => {
      if (!this.isRunning || !this.analyser) return;

      this.analyser.getByteFrequencyData(this.frequencyData);
      const freqData = this.computeBands();
      this.callback(freqData);

      this.animationId = requestAnimationFrame(loop);
    };
    loop();
  }

  private computeBands(): AudioFrequencyData {
    if (!this.audioContext) {
      return { low: 0, mid: 0, high: 0 };
    }

    const sampleRate = this.audioContext.sampleRate;
    const nyquist = sampleRate / 2;
    const binSize = nyquist / this.frequencyData.length;

    const lowStart = Math.floor(LOW_MIN / binSize);
    const lowEnd = Math.floor(LOW_MAX / binSize);
    const midStart = Math.floor(MID_MIN / binSize);
    const midEnd = Math.floor(MID_MAX / binSize);
    const highStart = Math.floor(HIGH_MIN / binSize);
    const highEnd = Math.min(Math.floor(HIGH_MAX / binSize), this.frequencyData.length - 1);

    const low = this.averageBand(lowStart, lowEnd);
    const mid = this.averageBand(midStart, midEnd);
    const high = this.averageBand(highStart, highEnd);

    return { low, mid, high };
  }

  private averageBand(start: number, end: number): number {
    if (end <= start) return 0;
    let sum = 0;
    for (let i = start; i < end; i++) {
      sum += this.frequencyData[i];
    }
    return sum / (end - start) / 255;
  }

  stop(): void {
    this.isRunning = false;

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach((t) => t.stop());
      this.microphoneStream = null;
    }

    if (this.audioElement) {
      this.audioElement.pause();
      if (this.audioElement.src) {
        URL.revokeObjectURL(this.audioElement.src);
      }
      this.audioElement = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    this.callback({ low: 0, mid: 0, high: 0 });
  }

  get active(): boolean {
    return this.isRunning;
  }
}
