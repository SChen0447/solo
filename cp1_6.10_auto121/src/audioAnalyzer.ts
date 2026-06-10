export class AudioAnalyzer {
  public audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private mediaElement: HTMLAudioElement | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private frequencyData: Uint8Array;
  private timeDomainData: Uint8Array;
  private isPlaying: boolean = false;
  private startTime: number = 0;
  private pausedAt: number = 0;
  private duration: number = 0;

  private beatHistory: number[] = [];
  private lastBeatTime: number = 0;
  private bpm: number = 0;
  private lastBassEnergy: number = 0;
  private bpmUpdateTimer: number = 0;

  private onEndedCallback: (() => void) | null = null;

  constructor() {
    this.frequencyData = new Uint8Array(1024);
    this.timeDomainData = new Uint8Array(1024);
  }

  private ensureContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0.8;
      this.gainNode.connect(this.audioContext.destination);
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeDomainData = new Uint8Array(this.analyser.frequencyBinCount);
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public setOnEndedCallback(callback: () => void): void {
    this.onEndedCallback = callback;
  }

  public async loadFromFile(file: File): Promise<void> {
    this.ensureContext();
    this.stop();

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
    this.duration = this.audioBuffer.duration;
    this.pausedAt = 0;
    this.resetBPM();
    this.play();
  }

  public async loadFromUrl(url: string): Promise<void> {
    this.ensureContext();
    this.stop();

    if (!this.mediaElement) {
      this.mediaElement = new Audio();
      this.mediaElement.crossOrigin = 'anonymous';
    }

    this.mediaElement.src = url;
    await this.mediaElement.load();

    if (this.mediaSource) {
      this.mediaSource.disconnect();
    }
    this.mediaSource = this.audioContext!.createMediaElementSource(this.mediaElement);
    this.mediaSource.connect(this.analyser!);
    this.analyser!.connect(this.gainNode!);

    this.duration = this.mediaElement.duration || 0;
    this.mediaElement.addEventListener('loadedmetadata', () => {
      this.duration = this.mediaElement!.duration;
    });

    this.mediaElement.addEventListener('ended', () => {
      this.isPlaying = false;
      if (this.onEndedCallback) {
        this.onEndedCallback();
      }
    });

    this.resetBPM();
    this.mediaElement.play();
    this.isPlaying = true;
  }

  public play(): void {
    if (!this.audioContext) return;
    this.ensureContext();

    if (this.mediaElement) {
      this.mediaElement.play();
      this.isPlaying = true;
      return;
    }

    if (this.audioBuffer) {
      if (this.source) {
        this.source.stop();
        this.source.disconnect();
      }
      this.source = this.audioContext.createBufferSource();
      this.source.buffer = this.audioBuffer;
      this.source.connect(this.analyser!);
      this.analyser!.connect(this.gainNode!);
      this.source.onended = () => {
        if (this.isPlaying) {
          this.isPlaying = false;
          this.pausedAt = 0;
          if (this.onEndedCallback) {
            this.onEndedCallback();
          }
        }
      };
      const offset = this.pausedAt;
      this.source.start(0, offset);
      this.startTime = this.audioContext.currentTime - offset;
      this.isPlaying = true;
    }
  }

  public pause(): void {
    if (this.mediaElement) {
      this.mediaElement.pause();
      this.isPlaying = false;
      return;
    }
    if (this.source && this.isPlaying && this.audioContext) {
      this.pausedAt = this.audioContext.currentTime - this.startTime;
      this.source.stop();
      this.source.disconnect();
      this.source = null;
      this.isPlaying = false;
    }
  }

  public stop(): void {
    if (this.mediaElement) {
      this.mediaElement.pause();
      this.mediaElement.currentTime = 0;
      this.isPlaying = false;
    }
    if (this.source) {
      try { this.source.stop(); } catch (e) {}
      this.source.disconnect();
      this.source = null;
    }
    this.isPlaying = false;
    this.pausedAt = 0;
    this.audioBuffer = null;
  }

  public setVolume(value: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, value));
    }
    if (this.mediaElement) {
      this.mediaElement.volume = Math.max(0, Math.min(1, value));
    }
  }

  public seek(time: number): void {
    if (this.mediaElement) {
      this.mediaElement.currentTime = Math.max(0, Math.min(this.duration, time));
      return;
    }
    if (this.isPlaying) {
      this.pausedAt = time;
      this.play();
    } else {
      this.pausedAt = time;
    }
  }

  public getCurrentTime(): number {
    if (this.mediaElement) {
      return this.mediaElement.currentTime;
    }
    if (this.isPlaying && this.audioContext) {
      return this.audioContext.currentTime - this.startTime;
    }
    return this.pausedAt;
  }

  public getDuration(): number {
    return this.duration;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getFrequencyData(): Uint8Array {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.frequencyData);
    }
    return this.frequencyData;
  }

  public getTimeDomainData(): Uint8Array {
    if (this.analyser) {
      this.analyser.getByteTimeDomainData(this.timeDomainData);
    }
    return this.timeDomainData;
  }

  public getAverageVolume(): number {
    const data = this.getTimeDomainData();
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    return Math.min(100, rms * 200);
  }

  public getBandEnergy(startBin: number, endBin: number): number {
    const data = this.getFrequencyData();
    let sum = 0;
    const s = Math.max(0, Math.min(data.length - 1, startBin));
    const e = Math.max(0, Math.min(data.length - 1, endBin));
    for (let i = s; i <= e; i++) {
      sum += data[i];
    }
    return sum / ((e - s + 1) * 255);
  }

  public getBassEnergy(): number {
    if (!this.analyser) return 0;
    const sampleRate = this.audioContext?.sampleRate || 44100;
    const nyquist = sampleRate / 2;
    const binCount = this.analyser.frequencyBinCount;
    const startBin = Math.floor(20 / nyquist * binCount);
    const endBin = Math.floor(250 / nyquist * binCount);
    return this.getBandEnergy(startBin, endBin);
  }

  public getMidEnergy(): number {
    if (!this.analyser) return 0;
    const sampleRate = this.audioContext?.sampleRate || 44100;
    const nyquist = sampleRate / 2;
    const binCount = this.analyser.frequencyBinCount;
    const startBin = Math.floor(250 / nyquist * binCount);
    const endBin = Math.floor(2000 / nyquist * binCount);
    return this.getBandEnergy(startBin, endBin);
  }

  public getHighEnergy(): number {
    if (!this.analyser) return 0;
    const sampleRate = this.audioContext?.sampleRate || 44100;
    const nyquist = sampleRate / 2;
    const binCount = this.analyser.frequencyBinCount;
    const startBin = Math.floor(2000 / nyquist * binCount);
    const endBin = Math.floor(Math.min(20000, nyquist) / nyquist * binCount);
    return this.getBandEnergy(startBin, endBin);
  }

  private resetBPM(): void {
    this.beatHistory = [];
    this.lastBeatTime = 0;
    this.bpm = 0;
    this.lastBassEnergy = 0;
    this.bpmUpdateTimer = 0;
  }

  public getBPM(): number {
    return this.bpm;
  }

  public update(deltaTime: number): void {
    if (!this.isPlaying) return;

    const bass = this.getBassEnergy();
    const now = performance.now() / 1000;

    if (bass > 0.5 && bass > this.lastBassEnergy * 1.3 && (now - this.lastBeatTime) > 0.3) {
      if (this.lastBeatTime > 0) {
        const interval = now - this.lastBeatTime;
        this.beatHistory.push(60 / interval);
        if (this.beatHistory.length > 8) {
          this.beatHistory.shift();
        }
      }
      this.lastBeatTime = now;
    }
    this.lastBassEnergy = bass;

    this.bpmUpdateTimer += deltaTime;
    if (this.bpmUpdateTimer >= 1.0) {
      this.bpmUpdateTimer = 0;
      if (this.beatHistory.length >= 3) {
        const avg = this.beatHistory.reduce((a, b) => a + b, 0) / this.beatHistory.length;
        this.bpm = Math.round(avg);
      }
    }
  }
}
