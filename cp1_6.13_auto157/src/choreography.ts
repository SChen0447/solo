import { Block } from './block';

export interface Keyframe {
  id: string;
  x: number;
  y: number;
  duration: number;
}

export interface BlockChoreography {
  blockId: number;
  keyframes: Keyframe[];
}

export type PlayState = 'idle' | 'playing' | 'paused';

export class ChoreographyManager {
  public bpm: number = 120;
  public static readonly DEFAULT_BPM = 120;
  public static readonly MIN_BPM = 60;
  public static readonly MAX_BPM = 200;
  public static readonly MAX_KEYFRAMES = 200;

  private blocks: Map<number, BlockChoreography> = new Map();
  private playState: PlayState = 'idle';
  private blockReferences: Map<number, Block> = new Map();
  private startTime: number = 0;
  private lastUpdateTime: number = 0;
  private accumulatedTime: number = 0;
  private currentSegmentStartTimes: Map<number, number> = new Map();
  private currentSegmentIndices: Map<number, number> = new Map();
  private segmentStartPositions: Map<number, { x: number; y: number; time: number }> = new Map();
  public onAnimationComplete: (() => void) | null = null;

  constructor() {}

  public registerBlock(block: Block): void {
    this.blockReferences.set(block.id, block);
    if (!this.blocks.has(block.id)) {
      this.blocks.set(block.id, { blockId: block.id, keyframes: [] });
    }
  }

  public getChoreography(blockId: number): BlockChoreography | undefined {
    return this.blocks.get(blockId);
  }

  public addKeyframe(blockId: number, keyframe: Omit<Keyframe, 'id'>): Keyframe | null {
    const choreo = this.blocks.get(blockId);
    if (!choreo) return null;
    if (this.getTotalKeyframes() >= ChoreographyManager.MAX_KEYFRAMES) return null;
    const kf: Keyframe = {
      id: this.generateId(),
      x: keyframe.x,
      y: keyframe.y,
      duration: keyframe.duration,
    };
    choreo.keyframes.push(kf);
    return kf;
  }

  public removeKeyframe(blockId: number, keyframeId: string): boolean {
    const choreo = this.blocks.get(blockId);
    if (!choreo) return false;
    const idx = choreo.keyframes.findIndex((k) => k.id === keyframeId);
    if (idx === -1) return false;
    choreo.keyframes.splice(idx, 1);
    return true;
  }

  public updateKeyframe(blockId: number, keyframeId: string, updates: Partial<Omit<Keyframe, 'id'>>): boolean {
    const choreo = this.blocks.get(blockId);
    if (!choreo) return false;
    const kf = choreo.keyframes.find((k) => k.id === keyframeId);
    if (!kf) return false;
    if (updates.x !== undefined) kf.x = updates.x;
    if (updates.y !== undefined) kf.y = updates.y;
    if (updates.duration !== undefined) kf.duration = updates.duration;
    return true;
  }

  public getKeyframes(blockId: number): Keyframe[] {
    const choreo = this.blocks.get(blockId);
    return choreo ? [...choreo.keyframes] : [];
  }

  public getTotalKeyframes(): number {
    let total = 0;
    this.blocks.forEach((c) => (total += c.keyframes.length));
    return total;
  }

  public setBpm(bpm: number): void {
    const newBpm = Math.max(ChoreographyManager.MIN_BPM, Math.min(ChoreographyManager.MAX_BPM, bpm));
    if (this.playState === 'playing') {
      const now = performance.now();
      this.accumulatedTime += this.getEffectiveElapsed(now);
      this.lastUpdateTime = now;
    }
    this.bpm = newBpm;
  }

  public getBpm(): number {
    return this.bpm;
  }

  public getSpeedFactor(): number {
    return this.bpm / ChoreographyManager.DEFAULT_BPM;
  }

  public startPlayback(): boolean {
    const allEmpty = Array.from(this.blocks.values()).every((c) => c.keyframes.length === 0);
    if (allEmpty) return false;

    this.playState = 'playing';
    this.startTime = performance.now();
    this.lastUpdateTime = this.startTime;
    this.accumulatedTime = 0;

    this.currentSegmentIndices.clear();
    this.currentSegmentStartTimes.clear();
    this.segmentStartPositions.clear();

    this.blocks.forEach((choreo, blockId) => {
      if (choreo.keyframes.length === 0) return;
      const block = this.blockReferences.get(blockId);
      if (!block) return;
      this.currentSegmentIndices.set(blockId, 0);
      this.segmentStartPositions.set(blockId, {
        x: block.x,
        y: block.y,
        time: 0,
      });
    });

    return true;
  }

  public pausePlayback(): void {
    if (this.playState === 'playing') {
      const now = performance.now();
      this.accumulatedTime += this.getEffectiveElapsed(now);
      this.playState = 'paused';
    }
  }

  public stopPlayback(): void {
    this.playState = 'idle';
    this.currentSegmentIndices.clear();
    this.currentSegmentStartTimes.clear();
    this.segmentStartPositions.clear();
    this.accumulatedTime = 0;
  }

  public getPlayState(): PlayState {
    return this.playState;
  }

  private getEffectiveElapsed(now: number): number {
    if (this.playState !== 'playing') return 0;
    return (now - this.lastUpdateTime) * this.getSpeedFactor();
  }

  public update(now: number): void {
    if (this.playState !== 'playing') return;

    const effectiveDelta = this.getEffectiveElapsed(now);
    this.accumulatedTime += effectiveDelta;
    this.lastUpdateTime = now;

    let allFinished = true;

    this.blocks.forEach((choreo, blockId) => {
      if (choreo.keyframes.length === 0) return;
      const block = this.blockReferences.get(blockId);
      if (!block) return;

      let segmentIdx = this.currentSegmentIndices.get(blockId) ?? 0;
      let segmentStart = this.segmentStartPositions.get(blockId)!;

      if (segmentIdx >= choreo.keyframes.length) {
        return;
      }

      allFinished = false;

      let currentKeyframe = choreo.keyframes[segmentIdx];
      let elapsedInSegment = this.accumulatedTime - segmentStart.time;

      while (elapsedInSegment >= currentKeyframe.duration && segmentIdx < choreo.keyframes.length) {
        segmentStart = {
          x: currentKeyframe.x,
          y: currentKeyframe.y,
          time: segmentStart.time + currentKeyframe.duration,
        };
        segmentIdx++;
        if (segmentIdx >= choreo.keyframes.length) {
          block.x = currentKeyframe.x;
          block.y = currentKeyframe.y;
          this.currentSegmentIndices.set(blockId, segmentIdx);
          this.segmentStartPositions.set(blockId, segmentStart);
          return;
        }
        currentKeyframe = choreo.keyframes[segmentIdx];
        elapsedInSegment = this.accumulatedTime - segmentStart.time;
      }

      this.currentSegmentIndices.set(blockId, segmentIdx);
      this.segmentStartPositions.set(blockId, segmentStart);

      if (segmentIdx < choreo.keyframes.length) {
        const t = currentKeyframe.duration > 0 ? Math.min(elapsedInSegment / currentKeyframe.duration, 1) : 1;
        const eased = this.easeInOutCubic(t);
        block.x = segmentStart.x + (currentKeyframe.x - segmentStart.x) * eased;
        block.y = segmentStart.y + (currentKeyframe.y - segmentStart.y) * eased;
      }
    });

    if (allFinished && this.playState === 'playing') {
      this.stopPlayback();
      if (this.onAnimationComplete) {
        this.onAnimationComplete();
      }
    }
  }

  public isBlockAnimating(blockId: number): boolean {
    if (this.playState !== 'playing') return false;
    const choreo = this.blocks.get(blockId);
    if (!choreo || choreo.keyframes.length === 0) return false;
    const idx = this.currentSegmentIndices.get(blockId) ?? 0;
    return idx < choreo.keyframes.length;
  }

  public clearAll(): void {
    this.blocks.clear();
    this.stopPlayback();
    this.blockReferences.forEach((_, id) => {
      this.blocks.set(id, { blockId: id, keyframes: [] });
    });
  }

  public getTotalDuration(blockId: number): number {
    const choreo = this.blocks.get(blockId);
    if (!choreo) return 0;
    return choreo.keyframes.reduce((sum, kf) => sum + kf.duration, 0);
  }

  private generateId(): string {
    return 'kf_' + Math.random().toString(36).substring(2, 11);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public getPlaybackProgress(blockId: number): number {
    const total = this.getTotalDuration(blockId);
    if (total === 0) return 0;
    const startPos = this.segmentStartPositions.get(blockId);
    if (!startPos) return 0;
    return Math.min(this.accumulatedTime / total, 1);
  }
}
