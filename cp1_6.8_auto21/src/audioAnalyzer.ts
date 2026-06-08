export type ParticleStyle = 'fire' | 'ice' | 'star';

export interface FrequencyData {
  bass: number;
  mid: number;
  high: number;
  overall: number;
}

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private frequencyData: Uint8Array<ArrayBuffer> | null = null;
  private waveformData: Uint8Array<ArrayBuffer> | null = null;
  private isPlaying = false;
  private fileName = '';
  private duration = 0;
  private onLoadedCallback: (() => void) | null = null;

  constructor() {}

  async loadFile(file: File): Promise<void> {
    this.fileName = file.name;
    const url = URL.createObjectURL(file);
    
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.8;
      
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0.7;
      
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
      this.waveformData = new Uint8Array(this.analyser.fftSize) as Uint8Array<ArrayBuffer>;
    }

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }

    this.audioElement = new Audio();
    this.audioElement.src = url;
    this.audioElement.crossOrigin = 'anonymous';

    return new Promise((resolve, reject) => {
      if (!this.audioElement || !this.audioContext || !this.analyser || !this.gainNode) {
        reject(new Error('Audio system not initialized'));
        return;
      }

      this.source = this.audioContext.createMediaElementSource(this.audioElement);
      this.source.connect(this.gainNode);
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      this.audioElement.addEventListener('loadedmetadata', () => {
        if (this.audioElement) {
          this.duration = this.audioElement.duration;
        }
        if (this.onLoadedCallback) {
          this.onLoadedCallback();
        }
        resolve();
      });

      this.audioElement.addEventListener('error', () => {
        reject(new Error('Failed to load audio file'));
      });

      this.audioElement.addEventListener('ended', () => {
        this.isPlaying = false;
      });
    });
  }

  async play(): Promise<void> {
    if (!this.audioElement || !this.audioContext) return;
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    await this.audioElement.play();
    this.isPlaying = true;
  }

  pause(): void {
    if (!this.audioElement) return;
    this.audioElement.pause();
    this.isPlaying = false;
  }

  togglePlay(): Promise<void> | void {
    if (this.isPlaying) {
      this.pause();
    } else {
      return this.play();
    }
  }

  setVolume(value: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, value));
    }
  }

  getVolume(): number {
    return this.gainNode ? this.gainNode.gain.value : 0;
  }

  getFrequencyData(): FrequencyData {
    if (!this.analyser || !this.frequencyData) {
      return { bass: 0, mid: 0, high: 0, overall: 0 };
    }

    this.analyser.getByteFrequencyData(this.frequencyData);
    
    const len = this.frequencyData.length;
    const bassEnd = Math.floor(len * 0.1);
    const midEnd = Math.floor(len * 0.5);
    
    let bassSum = 0;
    let midSum = 0;
    let highSum = 0;
    let totalSum = 0;
    
    for (let i = 0; i < bassEnd; i++) {
      bassSum += this.frequencyData[i];
    }
    for (let i = bassEnd; i < midEnd; i++) {
      midSum += this.frequencyData[i];
    }
    for (let i = midEnd; i < len; i++) {
      highSum += this.frequencyData[i];
    }
    for (let i = 0; i < len; i++) {
      totalSum += this.frequencyData[i];
    }
    
    return {
      bass: bassSum / bassEnd / 255,
      mid: midSum / (midEnd - bassEnd) / 255,
      high: highSum / (len - midEnd) / 255,
      overall: totalSum / len / 255
    };
  }

  getWaveformData(): Uint8Array | null {
    if (!this.analyser || !this.waveformData) return null;
    this.analyser.getByteTimeDomainData(this.waveformData);
    return this.waveformData;
  }

  getFileName(): string {
    return this.fileName;
  }

  getCurrentTime(): number {
    return this.audioElement ? this.audioElement.currentTime : 0;
  }

  getDuration(): number {
    return this.duration;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  setOnLoaded(callback: () => void): void {
    this.onLoadedCallback = callback;
  }

  dispose(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
