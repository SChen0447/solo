export interface FrameSnapshot {
  playerX: number;
  playerY: number;
  shards: boolean[];
  boxX: number;
  boxY: number;
  buttonPressed: boolean;
  doorOpen: boolean;
}

export type TimeMode = 'normal' | 'rewind' | 'forward';

export class TimeManager {
  private history: FrameSnapshot[] = [];
  private maxFrames: number = 600;
  private currentFrameIndex: number = -1;
  private mode: TimeMode = 'normal';
  private rewindSpeed: number = 5;
  private rewindAccumulator: number = 0;

  getMode(): TimeMode {
    return this.mode;
  }

  setMode(mode: TimeMode): void {
    this.mode = mode;
    if (mode === 'rewind') {
      this.rewindAccumulator = 0;
    }
  }

  getCurrentIndex(): number {
    return this.currentFrameIndex;
  }

  getHistoryLength(): number {
    return this.history.length;
  }

  getRewindSpeed(): number {
    return this.rewindSpeed;
  }

  pushFrame(snapshot: FrameSnapshot): void {
    if (this.mode !== 'normal') return;

    if (this.currentFrameIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentFrameIndex + 1);
    }

    this.history.push(snapshot);
    this.currentFrameIndex = this.history.length - 1;

    if (this.history.length > this.maxFrames) {
      this.history.shift();
      this.currentFrameIndex = this.history.length - 1;
    }
  }

  rewindStep(): FrameSnapshot | null {
    if (this.mode !== 'rewind') return null;
    if (this.currentFrameIndex <= 0) {
      this.mode = 'normal';
      return null;
    }

    this.rewindAccumulator += this.rewindSpeed;
    const steps = Math.floor(this.rewindAccumulator);
    this.rewindAccumulator -= steps;

    this.currentFrameIndex = Math.max(0, this.currentFrameIndex - steps);
    return this.history[this.currentFrameIndex] ?? null;
  }

  stopRewind(): FrameSnapshot | null {
    this.mode = 'normal';
    return this.history[this.currentFrameIndex] ?? null;
  }

  getCurrentSnapshot(): FrameSnapshot | null {
    if (this.currentFrameIndex < 0 || this.currentFrameIndex >= this.history.length) {
      return null;
    }
    return this.history[this.currentFrameIndex];
  }

  getProgress(): number {
    if (this.history.length <= 1) return 0;
    return this.currentFrameIndex / (this.history.length - 1);
  }

  getCapacityUsage(): number {
    return this.history.length / this.maxFrames;
  }

  clear(): void {
    this.history = [];
    this.currentFrameIndex = -1;
    this.mode = 'normal';
  }
}
