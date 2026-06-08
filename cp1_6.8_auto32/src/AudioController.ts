export interface AudioFeatures {
  volume: number;
  dominantFrequency: number;
  isHighPitch: boolean;
  isLowPitch: boolean;
  lowPitchDuration: number;
}

export class AudioController {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private frequencyData: Uint8Array<ArrayBuffer> | null = null;
  
  private lowPitchStartTime: number = 0;
  private lastLowPitchState: boolean = false;
  
  private calibrationVolume: number = 0.5;
  private isCalibrating: boolean = false;
  private calibrationStartTime: number = 0;
  private calibrationDuration: number = 3000;
  private calibrationProgress: number = 0;

  private highPitchThreshold: number = 2000;
  private lowPitchThreshold: number = 500;
  private jumpVolumeThreshold: number = 0.3;
  private slideVolumeThreshold: number = 0.5;

  constructor() {}

  async init(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.3;

      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(new ArrayBuffer(bufferLength));
      this.frequencyData = new Uint8Array(new ArrayBuffer(bufferLength));
    } catch (error) {
      console.error('无法获取麦克风权限:', error);
      throw error;
    }
  }

  getFeatures(): AudioFeatures {
    if (!this.analyser || !this.dataArray || !this.frequencyData || !this.audioContext) {
      return {
        volume: 0,
        dominantFrequency: 0,
        isHighPitch: false,
        isLowPitch: false,
        lowPitchDuration: 0
      };
    }

    this.analyser.getByteTimeDomainData(this.dataArray);
    this.analyser.getByteFrequencyData(this.frequencyData);

    const volume = this.calculateVolume();
    const dominantFrequency = this.calculateDominantFrequency();
    const normalizedVolume = Math.min(volume / this.calibrationVolume, 1.0);

    const isHighPitch = dominantFrequency > this.highPitchThreshold && normalizedVolume > this.jumpVolumeThreshold;
    const isLowPitch = dominantFrequency < this.lowPitchThreshold && normalizedVolume > this.slideVolumeThreshold;

    const now = performance.now();
    if (isLowPitch && !this.lastLowPitchState) {
      this.lowPitchStartTime = now;
    }
    
    let lowPitchDuration = 0;
    if (isLowPitch) {
      lowPitchDuration = now - this.lowPitchStartTime;
    }
    
    this.lastLowPitchState = isLowPitch;

    if (this.isCalibrating) {
      this.updateCalibration(volume);
    }

    return {
      volume: normalizedVolume,
      dominantFrequency,
      isHighPitch,
      isLowPitch,
      lowPitchDuration
    };
  }

  private calculateVolume(): number {
    if (!this.dataArray) return 0;

    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const v = (this.dataArray[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / this.dataArray.length);
  }

  private calculateDominantFrequency(): number {
    if (!this.frequencyData || !this.audioContext || !this.analyser) return 0;

    const sampleRate = this.audioContext.sampleRate;
    const nyquist = sampleRate / 2;
    const binCount = this.frequencyData.length;

    let maxValue = 0;
    let maxIndex = 0;

    for (let i = 0; i < binCount; i++) {
      if (this.frequencyData[i] > maxValue) {
        maxValue = this.frequencyData[i];
        maxIndex = i;
      }
    }

    const frequency = (maxIndex / binCount) * nyquist;
    return frequency;
  }

  startCalibration(): void {
    this.isCalibrating = true;
    this.calibrationStartTime = performance.now();
    this.calibrationProgress = 0;
  }

  private updateCalibration(currentVolume: number): void {
    const elapsed = performance.now() - this.calibrationStartTime;
    
    if (elapsed >= this.calibrationDuration) {
      this.isCalibrating = false;
      return;
    }

    if (currentVolume > 0.01) {
      this.calibrationVolume = Math.max(this.calibrationVolume * 0.95, currentVolume * 0.05 + this.calibrationVolume * 0.95);
    }
    
    this.calibrationProgress = elapsed / this.calibrationDuration;
  }

  getCalibrationProgress(): number {
    return this.calibrationProgress;
  }

  isCalibrationComplete(): boolean {
    return !this.isCalibrating && this.calibrationProgress >= 1;
  }

  setCalibrationVolume(volume: number): void {
    this.calibrationVolume = Math.max(volume, 0.1);
  }

  getCalibrationVolume(): number {
    return this.calibrationVolume;
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  destroy(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
