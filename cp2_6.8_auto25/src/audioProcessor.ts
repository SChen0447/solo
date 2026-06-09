export interface AudioData {
  frequencyData: Uint8Array;
  isBeat: boolean;
  lowFrequencyEnergy: number;
}

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private gainNode: GainNode | null = null;
  private startTime: number = 0;
  private pausedAt: number = 0;
  private isPlaying: boolean = false;
  private sensitivity: number = 1.0;

  private beatHistory: number[] = [];
  private beatThreshold: number = 1.5;
  private lastBeatTime: number = 0;
  private beatCooldown: number = 150;

  private onBeatCallback: (() => void) | null = null;
  private onEndedCallback: (() => void) | null = null;

  constructor() {}

  public async loadAudioFile(file: File): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0.7;
  }

  public play(): void {
    if (!this.audioContext || !this.audioBuffer || !this.analyser || !this.gainNode) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.gainNode);
    this.gainNode.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    this.source.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false;
        if (this.onEndedCallback) {
          this.onEndedCallback();
        }
      }
    };

    const offset = this.pausedAt;
    this.startTime = this.audioContext.currentTime - offset;
    this.source.start(0, offset);
    this.isPlaying = true;
  }

  public pause(): void {
    if (!this.audioContext || !this.source || !this.isPlaying) return;

    this.pausedAt = this.audioContext.currentTime - this.startTime;
    this.source.stop();
    this.source.disconnect();
    this.isPlaying = false;
  }

  public stop(): void {
    if (this.source) {
      this.source.stop();
      this.source.disconnect();
      this.source = null;
    }
    this.isPlaying = false;
    this.pausedAt = 0;
  }

  public seek(progress: number): void {
    if (!this.audioBuffer) return;

    const wasPlaying = this.isPlaying;
    const duration = this.audioBuffer.duration;
    this.pausedAt = progress * duration;

    if (wasPlaying) {
      if (this.source) {
        this.source.stop();
        this.source.disconnect();
      }
      this.play();
    }
  }

  public getAudioData(): AudioData {
    if (!this.analyser) {
      return {
        frequencyData: new Uint8Array(0),
        isBeat: false,
        lowFrequencyEnergy: 0
      };
    }

    const bufferLength = this.analyser.frequencyBinCount;
    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    const lowFreqEnd = Math.floor(bufferLength * 0.1);
    let lowFrequencyEnergy = 0;
    for (let i = 0; i < lowFreqEnd; i++) {
      lowFrequencyEnergy += frequencyData[i];
    }
    lowFrequencyEnergy = lowFrequencyEnergy / lowFreqEnd / 255;

    const isBeat = this.detectBeat(lowFrequencyEnergy);

    return {
      frequencyData,
      isBeat,
      lowFrequencyEnergy
    };
  }

  private detectBeat(energy: number): boolean {
    const now = Date.now();
    
    if (now - this.lastBeatTime < this.beatCooldown) {
      return false;
    }

    this.beatHistory.push(energy);
    if (this.beatHistory.length > 40) {
      this.beatHistory.shift();
    }

    const average = this.beatHistory.reduce((a, b) => a + b, 0) / this.beatHistory.length;
    const threshold = average * this.beatThreshold / this.sensitivity;

    if (energy > threshold && energy > 0.15) {
      this.lastBeatTime = now;
      if (this.onBeatCallback) {
        this.onBeatCallback();
      }
      return true;
    }

    return false;
  }

  public getCurrentTime(): number {
    if (!this.audioContext || !this.isPlaying) return this.pausedAt;
    return this.audioContext.currentTime - this.startTime;
  }

  public getDuration(): number {
    if (!this.audioBuffer) return 0;
    return this.audioBuffer.duration;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public setSensitivity(value: number): void {
    this.sensitivity = value;
  }

  public setOnBeatCallback(callback: () => void): void {
    this.onBeatCallback = callback;
  }

  public setOnEndedCallback(callback: () => void): void {
    this.onEndedCallback = callback;
  }

  public getFrequencyBinCount(): number {
    return this.analyser ? this.analyser.frequencyBinCount : 0;
  }
}
