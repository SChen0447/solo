export type BeatMode = 'simple' | 'syncopated' | 'sixteenth';

export interface BeatEvent {
  beatIndex: number;
  subdivisionIndex: number;
  totalBeats: number;
  timestamp: number;
  mode: BeatMode;
}

export interface RhythmPattern {
  name: string;
  bpm: number;
  subdivision: 1 | 2 | 4;
  trackColor: string;
  glowIntensity: number;
  displayName: string;
}

export const RHYTHM_PATTERNS: Record<BeatMode, RhythmPattern> = {
  simple: {
    name: 'simple',
    displayName: '简单 4/4 拍',
    bpm: 90,
    subdivision: 1,
    trackColor: '#4ECDC4',
    glowIntensity: 0.4
  },
  syncopated: {
    name: 'syncopated',
    displayName: '切分节奏',
    bpm: 120,
    subdivision: 2,
    trackColor: '#FFE66D',
    glowIntensity: 0.6
  },
  sixteenth: {
    name: 'sixteenth',
    displayName: '16分加速',
    bpm: 150,
    subdivision: 4,
    trackColor: '#FF6B6B',
    glowIntensity: 0.8
  }
};

type BeatCallback = (event: BeatEvent) => void;

export class BeatEngine {
  private mode: BeatMode = 'simple';
  private pattern: RhythmPattern = RHYTHM_PATTERNS.simple;
  private beatIndex = 0;
  private subdivisionIndex = 0;
  private nextBeatTime = 0;
  private timerId: number | null = null;
  private isRunning = false;
  private callbacks: Set<BeatCallback> = new Set();
  private startTimestamp = 0;

  constructor() {}

  onBeat(callback: BeatCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  setMode(mode: BeatMode): void {
    this.mode = mode;
    this.pattern = RHYTHM_PATTERNS[mode];
    if (this.isRunning) {
      this.stop();
      this.beatIndex = 0;
      this.subdivisionIndex = 0;
      this.start();
    }
  }

  getMode(): BeatMode {
    return this.mode;
  }

  getPattern(): RhythmPattern {
    return this.pattern;
  }

  getCurrentBeat(): number {
    return this.beatIndex;
  }

  getTimeToNextBeat(): number {
    if (!this.isRunning) return 0;
    const now = performance.now();
    return Math.max(0, this.nextBeatTime - now);
  }

  getBeatInterval(): number {
    return 60000 / (this.pattern.bpm * this.pattern.subdivision);
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startTimestamp = performance.now();
    this.nextBeatTime = this.startTimestamp;
    this.scheduleNextBeat();
  }

  stop(): void {
    this.isRunning = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private scheduleNextBeat(): void {
    if (!this.isRunning) return;

    const now = performance.now();
    const delay = Math.max(0, this.nextBeatTime - now);

    this.timerId = window.setTimeout(() => {
      this.triggerBeat();
      const interval = 60000 / (this.pattern.bpm * this.pattern.subdivision);
      this.nextBeatTime += interval;
      this.scheduleNextBeat();
    }, delay);
  }

  private triggerBeat(): void {
    const totalBeats = 4 * this.pattern.subdivision;
    const event: BeatEvent = {
      beatIndex: this.beatIndex,
      subdivisionIndex: this.subdivisionIndex,
      totalBeats,
      timestamp: performance.now(),
      mode: this.mode
    };

    for (const cb of this.callbacks) {
      cb(event);
    }

    this.subdivisionIndex++;
    if (this.subdivisionIndex >= this.pattern.subdivision) {
      this.subdivisionIndex = 0;
      this.beatIndex = (this.beatIndex + 1) % 4;
    }
  }

  destroy(): void {
    this.stop();
    this.callbacks.clear();
  }
}
