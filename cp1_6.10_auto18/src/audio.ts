export type SensitivityLevel = 'low' | 'medium' | 'high';

const SENSITIVITY_MULTIPLIERS: Record<SensitivityLevel, number> = {
  low: 0.6,
  medium: 1.0,
  high: 1.6
};

const WAVEFORM_LENGTH = 128;
const BREATH_SMOOTHING = 0.85;
const PANIC_THRESHOLD = 0.75;
const PANIC_DURATION = 2000;
const VOLUME_SMOOTHING_FAST = 0.7;
const VOLUME_SMOOTHING_SLOW = 0.95;

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private waveformBuffer: Float32Array = new Float32Array(WAVEFORM_LENGTH);
  private currentStrength: number = 0;
  private smoothedStrength: number = 0;
  private fastVolume: number = 0;
  private slowVolume: number = 0;
  private sensitivity: SensitivityLevel = 'medium';
  private isPanicking: boolean = false;
  private panicEndTime: number = 0;
  private isInitialized: boolean = false;
  private timeDataArray: Float32Array = new Float32Array(0);

  async init(): Promise<boolean> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false
        }
      });

      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.4;
      
      source.connect(this.analyser);
      
      const bufferLength = this.analyser.fftSize;
      this.timeDataArray = new Float32Array(bufferLength);
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      return false;
    }
  }

  setSensitivity(level: SensitivityLevel): void {
    this.sensitivity = level;
  }

  getSensitivity(): SensitivityLevel {
    return this.sensitivity;
  }

  update(deltaTime: number): void {
    if (!this.isInitialized || !this.analyser) return;

    this.analyser.getFloatTimeDomainData(this.timeDataArray);

    let sum = 0;
    for (let i = 0; i < this.timeDataArray.length; i++) {
      sum += this.timeDataArray[i] * this.timeDataArray[i];
    }
    const rms = Math.sqrt(sum / this.timeDataArray.length);
    
    this.fastVolume = this.fastVolume * VOLUME_SMOOTHING_FAST + rms * (1 - VOLUME_SMOOTHING_FAST);
    this.slowVolume = this.slowVolume * VOLUME_SMOOTHING_SLOW + rms * (1 - VOLUME_SMOOTHING_SLOW);

    const rawStrength = (rms - 0.008) * 18;
    this.currentStrength = Math.max(-0.3, Math.min(1.0, rawStrength)) * SENSITIVITY_MULTIPLIERS[this.sensitivity];
    
    this.smoothedStrength = this.smoothedStrength * BREATH_SMOOTHING + this.currentStrength * (1 - BREATH_SMOOTHING);

    for (let i = 0; i < WAVEFORM_LENGTH - 1; i++) {
      this.waveformBuffer[i] = this.waveformBuffer[i + 1];
    }
    this.waveformBuffer[WAVEFORM_LENGTH - 1] = this.smoothedStrength;

    const now = performance.now();
    if (this.isPanicking) {
      if (now > this.panicEndTime) {
        this.isPanicking = false;
      }
    } else if (this.fastVolume > PANIC_THRESHOLD * 0.05 && this.fastVolume > this.slowVolume * 3) {
      this.isPanicking = true;
      this.panicEndTime = now + PANIC_DURATION;
    }

    void deltaTime;
  }

  getBreathStrength(): number {
    if (this.isPanicking) {
      return (Math.sin(performance.now() * 0.02) * 0.8 + Math.sin(performance.now() * 0.037) * 0.4);
    }
    return this.smoothedStrength;
  }

  getWaveformData(): Float32Array {
    return this.waveformBuffer;
  }

  isInPanic(): boolean {
    return this.isPanicking;
  }

  getPanicProgress(): number {
    if (!this.isPanicking) return 0;
    return Math.max(0, (this.panicEndTime - performance.now()) / PANIC_DURATION);
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  destroy(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.isInitialized = false;
  }
}

export const audioManager = new AudioManager();
