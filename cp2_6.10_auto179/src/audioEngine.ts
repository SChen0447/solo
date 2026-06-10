import { EffectProcessor } from './effectProcessor';

export class AudioEngine {
  private context: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private buffer: AudioBuffer | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private effectProcessor: EffectProcessor | null = null;

  private frequencyData: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(0));
  private timeDomainData: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(0));

  private startTime: number = 0;
  private pausedAt: number = 0;
  private isPlayingFlag: boolean = false;
  private isLoopingFlag: boolean = false;

  public onPlaybackEnd: (() => void) | null = null;

  public async loadFile(file: File): Promise<AudioBuffer> {
    if (!this.context) {
      this.context = new AudioContext();
    }
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    const arrayBuffer = await file.arrayBuffer();
    this.buffer = await this.context.decodeAudioData(arrayBuffer);

    this.initNodes();

    const binCount = 128;
    this.frequencyData = new Uint8Array(new ArrayBuffer(this.analyser!.frequencyBinCount));
    this.timeDomainData = new Uint8Array(new ArrayBuffer(this.analyser!.frequencyBinCount));

    return this.buffer;
  }

  private initNodes(): void {
    if (!this.context || !this.buffer) return;

    if (this.analyser) this.analyser.disconnect();
    if (this.masterGain) this.masterGain.disconnect();
    if (this.effectProcessor) {
      (this.effectProcessor.input as AudioNode).disconnect();
      (this.effectProcessor.output as AudioNode).disconnect();
    }

    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;

    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.9;

    this.effectProcessor = new EffectProcessor(this.context);

    this.effectProcessor.output.connect(this.analyser);
    this.analyser.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);
  }

  public start(offset?: number): void {
    if (!this.context || !this.buffer) return;
    if (this.context.state === 'suspended') {
      this.context.resume();
    }

    this.stop(false);

    this.source = this.context.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.loop = this.isLoopingFlag;
    this.source.connect(this.effectProcessor!.input);

    const startOffset = offset !== undefined ? offset : this.pausedAt;
    const clampedOffset = Math.min(Math.max(0, startOffset), this.buffer.duration);

    this.source.onended = () => {
      if (this.isPlayingFlag) {
        this.isPlayingFlag = false;
        this.pausedAt = 0;
        if (this.onPlaybackEnd) this.onPlaybackEnd();
      }
    };

    this.source.start(0, clampedOffset);
    this.startTime = this.context.currentTime - clampedOffset;
    this.isPlayingFlag = true;
  }

  public stop(resetTime: boolean = true): void {
    if (this.source) {
      try {
        this.source.onended = null;
        this.source.stop();
      } catch (_e) {
        // ignore
      }
      this.source.disconnect();
      this.source = null;
    }
    if (this.isPlayingFlag && resetTime) {
      this.pausedAt = this.context ? this.context.currentTime - this.startTime : 0;
      if (this.buffer) {
        this.pausedAt = Math.min(this.pausedAt, this.buffer.duration);
      }
    }
    if (resetTime) {
      this.pausedAt = 0;
    }
    this.isPlayingFlag = false;
  }

  public pause(): void {
    if (!this.isPlayingFlag || !this.context) return;
    this.pausedAt = this.context.currentTime - this.startTime;
    if (this.buffer) {
      this.pausedAt = Math.min(this.pausedAt, this.buffer.duration);
    }
    this.stop(false);
  }

  public seek(progress: number): void {
    if (!this.buffer) return;
    const target = progress * this.buffer.duration;
    const wasPlaying = this.isPlayingFlag;
    this.pausedAt = target;
    if (wasPlaying) {
      this.start(target);
    }
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

  public getWaveformData(resolution: number): Float32Array {
    if (!this.buffer) return new Float32Array(0);

    const rawData = this.buffer.getChannelData(0);
    const samples = Math.min(resolution, rawData.length);
    const blockSize = Math.floor(rawData.length / samples);
    const result = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      const start = i * blockSize;
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[start + j]);
      }
      result[i] = sum / blockSize;
    }

    const max = Math.max(...result);
    if (max > 0) {
      for (let i = 0; i < samples; i++) {
        result[i] /= max;
      }
    }

    return result;
  }

  public get isPlaying(): boolean {
    return this.isPlayingFlag;
  }

  public get isLooping(): boolean {
    return this.isLoopingFlag;
  }

  public setLooping(value: boolean): void {
    this.isLoopingFlag = value;
    if (this.source) {
      this.source.loop = value;
    }
  }

  public get currentTime(): number {
    if (!this.context || !this.buffer) return 0;
    if (this.isPlayingFlag) {
      return Math.min(this.context.currentTime - this.startTime, this.buffer.duration);
    }
    return this.pausedAt;
  }

  public get duration(): number {
    return this.buffer ? this.buffer.duration : 0;
  }

  public getEffectProcessor(): EffectProcessor | null {
    return this.effectProcessor;
  }

  public hasBuffer(): boolean {
    return this.buffer !== null;
  }

  public getSampleRate(): number {
    return this.buffer ? this.buffer.sampleRate : 44100;
  }
}
