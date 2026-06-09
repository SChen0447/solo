export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private frequencyData: Uint8Array | null = null;
  private timeDomainData: Uint8Array | null = null;
  private isPlaying: boolean = false;
  private startTime: number = 0;
  private pauseTime: number = 0;

  private fftSize: number = 256;
  private smoothingTimeConstant: number = 0.8;

  constructor() {}

  private initAudioContext(): void {
    if (this.audioContext) return;
    
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.fftSize;
    this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;
    
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0.7;
    
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeDomainData = new Uint8Array(this.analyser.frequencyBinCount);
  }

  public async loadAudioFile(file: File): Promise<void> {
    this.initAudioContext();
    
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    this.stop();

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
  }

  public play(): void {
    if (!this.audioContext || !this.audioBuffer || !this.analyser || !this.gainNode) {
      return;
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.stop();

    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.analyser);
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    const offset = this.pauseTime % this.audioBuffer.duration;
    this.source.start(0, offset);
    this.startTime = this.audioContext.currentTime - offset;
    this.isPlaying = true;

    this.source.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.pauseTime = 0;
      }
    };
  }

  public pause(): void {
    if (!this.isPlaying || !this.source || !this.audioContext) {
      return;
    }

    this.pauseTime = this.audioContext.currentTime - this.startTime;
    this.source.stop();
    this.source.disconnect();
    this.source = null;
    this.isPlaying = false;
  }

  public stop(): void {
    if (this.source) {
      try {
        this.source.stop();
      } catch (e) {}
      this.source.disconnect();
      this.source = null;
    }
    this.isPlaying = false;
  }

  public togglePlayback(): boolean {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
    return this.isPlaying;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public setVolume(value: number): void {
    if (this.gainNode) {
      this.gainNode.gain.setTargetAtTime(
        Math.max(0, Math.min(1, value)),
        this.audioContext?.currentTime || 0,
        0.01
      );
    }
  }

  public getVolume(): number {
    return this.gainNode ? this.gainNode.gain.value : 0;
  }

  public getFrequencyData(): Uint8Array {
    if (!this.analyser || !this.frequencyData) {
      return new Uint8Array(0);
    }
    this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>);
    return this.frequencyData;
  }

  public getTimeDomainData(): Uint8Array {
    if (!this.analyser || !this.timeDomainData) {
      return new Uint8Array(0);
    }
    this.analyser.getByteTimeDomainData(this.timeDomainData as Uint8Array<ArrayBuffer>);
    return this.timeDomainData;
  }

  public getFrequencyBinCount(): number {
    return this.analyser ? this.analyser.frequencyBinCount : 0;
  }

  public getAverageFrequency(): number {
    const data = this.getFrequencyData();
    if (data.length === 0) return 0;
    
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    return sum / data.length;
  }

  public getBandEnergy(startBin: number, endBin: number): number {
    const data = this.getFrequencyData();
    if (data.length === 0) return 0;
    
    const start = Math.max(0, Math.min(startBin, data.length - 1));
    const end = Math.max(start, Math.min(endBin, data.length - 1));
    
    let sum = 0;
    let count = 0;
    for (let i = start; i <= end; i++) {
      sum += data[i];
      count++;
    }
    
    return count > 0 ? sum / count : 0;
  }

  public dispose(): void {
    this.stop();
    
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
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
    this.audioBuffer = null;
  }
}
