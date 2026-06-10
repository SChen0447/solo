export class AudioManager {
  audioContext: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  source: AudioBufferSourceNode | null = null;
  gainNode: GainNode | null = null;
  audioBuffer: AudioBuffer | null = null;
  isPlaying: boolean = false;
  currentTime: number = 0;
  duration: number = 0;
  sampleRate: number = 0;

  private startTime: number = 0;
  private pauseTime: number = 0;
  private timeDomainData: Uint8Array | null = null;
  private frequencyData: Uint8Array | null = null;
  private onEndedCallback: (() => void) | null = null;

  async loadFile(file: File): Promise<void> {
    this.destroy();

    const arrayBuffer = await file.arrayBuffer();
    this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    this.duration = this.audioBuffer.duration;
    this.sampleRate = this.audioBuffer.sampleRate;
    this.currentTime = 0;
    this.pauseTime = 0;

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 128;
    this.analyser.smoothingTimeConstant = 0.8;

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0.8;

    this.timeDomainData = new Uint8Array(this.analyser.fftSize);
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
  }

  play(): void {
    if (!this.audioContext || !this.audioBuffer || !this.analyser || !this.gainNode) return;
    if (this.isPlaying) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.analyser);
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    this.source.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.currentTime = 0;
        this.pauseTime = 0;
        if (this.onEndedCallback) {
          this.onEndedCallback();
        }
      }
    };

    const offset = this.pauseTime;
    this.source.start(0, offset);
    this.startTime = this.audioContext.currentTime - offset;
    this.isPlaying = true;
  }

  pause(): void {
    if (!this.isPlaying || !this.source || !this.audioContext) return;

    this.pauseTime = this.audioContext.currentTime - this.startTime;
    this.source.stop();
    this.source.disconnect();
    this.source = null;
    this.isPlaying = false;
  }

  seek(time: number): void {
    if (!this.audioBuffer) return;

    time = Math.max(0, Math.min(time, this.duration));
    const wasPlaying = this.isPlaying;

    if (this.source) {
      this.source.stop();
      this.source.disconnect();
      this.source = null;
    }

    this.pauseTime = time;
    this.currentTime = time;
    this.isPlaying = false;

    if (wasPlaying) {
      this.play();
    }
  }

  setVolume(value: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, value));
    }
  }

  getTimeDomainData(): Uint8Array {
    if (this.analyser && this.timeDomainData) {
      this.analyser.getByteTimeDomainData(this.timeDomainData as Uint8Array<ArrayBuffer>);
    }
    return this.timeDomainData || new Uint8Array(0);
  }

  getFrequencyData(): Uint8Array {
    if (this.analyser && this.frequencyData) {
      this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>);
    }
    return this.frequencyData || new Uint8Array(0);
  }

  updateCurrentTime(): void {
    if (this.isPlaying && this.audioContext) {
      this.currentTime = this.audioContext.currentTime - this.startTime;
      if (this.currentTime > this.duration) {
        this.currentTime = this.duration;
      }
    }
  }

  onEnded(callback: () => void): void {
    this.onEndedCallback = callback;
  }

  destroy(): void {
    if (this.source) {
      try {
        this.source.stop();
      } catch {
        // ignore
      }
      this.source.disconnect();
      this.source = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.audioBuffer = null;
    this.isPlaying = false;
    this.currentTime = 0;
    this.duration = 0;
    this.sampleRate = 0;
    this.timeDomainData = null;
    this.frequencyData = null;
  }
}
