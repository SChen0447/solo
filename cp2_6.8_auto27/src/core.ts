export type BeatPhase = {
  currentBeat: number;
  beatProgress: number;
  timeSinceLastBeat: number;
  timeToNextBeat: number;
  bpm: number;
};

export type GameCoreState = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'ended';

export interface CoreCallbacks {
  onBeat?: (beatIndex: number, time: number) => void;
  onUpdate?: (deltaTime: number, phase: BeatPhase) => void;
  onStateChange?: (state: GameCoreState) => void;
}

export class GameCore {
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;

  private beatTimes: number[] = [];
  private currentBeatIndex: number = -1;
  private startTime: number = 0;
  private lastFrameTime: number = 0;
  private animationFrameId: number = 0;
  private state: GameCoreState = 'idle';

  private callbacks: CoreCallbacks = {};
  private bpm: number = 100;

  private beatFlashTime: number = 0;
  private readonly BEAT_FLASH_DURATION = 200;

  constructor() {}

  setCallbacks(callbacks: CoreCallbacks) {
    this.callbacks = callbacks;
  }

  getState(): GameCoreState {
    return this.state;
  }

  getBeatTimes(): number[] {
    return this.beatTimes;
  }

  getBpm(): number {
    return this.bpm;
  }

  getBeatPhase(): BeatPhase {
    if (!this.audioContext || this.state !== 'playing') {
      return {
        currentBeat: 0,
        beatProgress: 0,
        timeSinceLastBeat: 0,
        timeToNextBeat: 0,
        bpm: this.bpm,
      };
    }

    const currentTime = this.audioContext.currentTime - this.startTime;
    let beatIndex = 0;

    for (let i = 0; i < this.beatTimes.length; i++) {
      if (this.beatTimes[i] <= currentTime) {
        beatIndex = i;
      } else {
        break;
      }
    }

    const currentBeatTime = this.beatTimes[beatIndex] ?? 0;
    const nextBeatTime = this.beatTimes[beatIndex + 1] ?? currentBeatTime + 60 / this.bpm;
    const beatDuration = nextBeatTime - currentBeatTime;
    const timeSinceLastBeat = currentTime - currentBeatTime;
    const beatProgress = beatDuration > 0 ? timeSinceLastBeat / beatDuration : 0;

    return {
      currentBeat: beatIndex,
      beatProgress,
      timeSinceLastBeat,
      timeToNextBeat: nextBeatTime - currentTime,
      bpm: this.bpm,
    };
  }

  getBeatFlashIntensity(): number {
    const elapsed = performance.now() - this.beatFlashTime;
    if (elapsed > this.BEAT_FLASH_DURATION) return 0;
    return 1 - elapsed / this.BEAT_FLASH_DURATION;
  }

  async loadAudioFromFile(file: File): Promise<void> {
    this.setState('loading');
    try {
      const arrayBuffer = await file.arrayBuffer();
      await this.initAudioContext();
      if (!this.audioContext) throw new Error('AudioContext not initialized');
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.detectBeats();
      this.setState('ready');
    } catch (e) {
      console.error('Failed to load audio:', e);
      this.setState('idle');
      throw e;
    }
  }

  loadDemoTrack(): void {
    this.setState('loading');
    this.bpm = 100;
    this.beatTimes = [];
    const beatInterval = 60 / this.bpm;
    for (let i = 0; i < 1000; i++) {
      this.beatTimes.push(i * beatInterval);
    }
    this.audioBuffer = null;
    this.setState('ready');
  }

  private async initAudioContext(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  private detectBeats(): void {
    if (!this.audioBuffer) return;

    const channelData = this.audioBuffer.getChannelData(0);
    const sampleRate = this.audioBuffer.sampleRate;
    const duration = this.audioBuffer.duration;

    const windowSize = Math.floor(sampleRate * 0.05);
    const hopSize = Math.floor(windowSize / 2);
    const energies: number[] = [];
    const times: number[] = [];

    for (let i = 0; i + windowSize < channelData.length; i += hopSize) {
      let energy = 0;
      for (let j = 0; j < windowSize; j++) {
        energy += Math.abs(channelData[i + j]);
      }
      energies.push(energy / windowSize);
      times.push(i / sampleRate);
    }

    const avgEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;
    const threshold = avgEnergy * 1.5;

    this.beatTimes = [];
    let lastBeatTime = -1;
    const minBeatInterval = 60 / 180;

    for (let i = 1; i < energies.length - 1; i++) {
      if (
        energies[i] > threshold &&
        energies[i] > energies[i - 1] &&
        energies[i] > energies[i + 1] &&
        times[i] - lastBeatTime > minBeatInterval
      ) {
        this.beatTimes.push(times[i]);
        lastBeatTime = times[i];
      }
    }

    if (this.beatTimes.length < 2) {
      this.bpm = 100;
      const beatInterval = 60 / this.bpm;
      this.beatTimes = [];
      for (let i = 0; i < Math.ceil(duration / beatInterval) + 10; i++) {
        this.beatTimes.push(i * beatInterval);
      }
    } else {
      const intervals: number[] = [];
      for (let i = 1; i < this.beatTimes.length; i++) {
        intervals.push(this.beatTimes[i] - this.beatTimes[i - 1]);
      }
      intervals.sort((a, b) => a - b);
      const medianInterval = intervals[Math.floor(intervals.length / 2)];
      this.bpm = Math.round(60 / medianInterval);

      if (this.bpm < 80 || this.bpm > 140) {
        this.bpm = 100;
      }

      const beatInterval = 60 / this.bpm;
      const firstBeat = this.beatTimes[0];
      this.beatTimes = [];
      for (let i = 0; i < Math.ceil(duration / beatInterval) + 10; i++) {
        this.beatTimes.push(firstBeat + i * beatInterval);
      }
    }

    console.log(`Detected BPM: ${this.bpm}, ${this.beatTimes.length} beats`);
  }

  async start(): Promise<void> {
    if (this.state !== 'ready') return;

    await this.initAudioContext();

    this.currentBeatIndex = -1;
    this.lastFrameTime = performance.now();

    if (this.audioBuffer && this.audioContext) {
      this.sourceNode = this.audioContext.createBufferSource();
      this.sourceNode.buffer = this.audioBuffer;
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0.7;

      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      this.sourceNode.start();
      this.startTime = this.audioContext.currentTime;
    } else {
      this.startTime = 0;
      const ctx = this.audioContext!;
      this.startTime = ctx.currentTime;
    }

    this.setState('playing');
    this.startLoop();
  }

  pause(): void {
    if (this.state !== 'playing') return;
    cancelAnimationFrame(this.animationFrameId);
    if (this.sourceNode) {
      this.sourceNode.stop();
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    this.setState('paused');
  }

  resume(): void {
    if (this.state !== 'paused') return;
    this.lastFrameTime = performance.now();
    this.setState('playing');
    this.startLoop();
  }

  stop(): void {
    cancelAnimationFrame(this.animationFrameId);
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch (e) {}
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    this.currentBeatIndex = -1;
    this.setState('idle');
  }

  private startLoop(): void {
    const loop = () => {
      if (this.state !== 'playing') return;

      const now = performance.now();
      const deltaTime = (now - this.lastFrameTime) / 1000;
      this.lastFrameTime = now;

      const phase = this.getBeatPhase();

      if (phase.currentBeat > this.currentBeatIndex) {
        const newBeats = phase.currentBeat - this.currentBeatIndex;
        for (let i = 0; i < newBeats; i++) {
          const beatIdx = this.currentBeatIndex + 1 + i;
          this.beatFlashTime = performance.now();
          if (this.callbacks.onBeat) {
            this.callbacks.onBeat(beatIdx, this.beatTimes[beatIdx] ?? beatIdx * (60 / this.bpm));
          }
        }
        this.currentBeatIndex = phase.currentBeat;
      }

      if (this.callbacks.onUpdate) {
        this.callbacks.onUpdate(deltaTime, phase);
      }

      if (this.audioBuffer) {
        const currentTime = this.audioContext!.currentTime - this.startTime;
        if (currentTime >= this.audioBuffer.duration) {
          this.setState('ended');
          return;
        }
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  private setState(newState: GameCoreState): void {
    if (this.state === newState) return;
    this.state = newState;
    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange(newState);
    }
  }

  getCurrentTime(): number {
    if (!this.audioContext) return 0;
    return this.audioContext.currentTime - this.startTime;
  }

  destroy(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
