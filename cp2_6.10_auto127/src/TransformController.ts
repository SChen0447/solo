export interface TransformParams {
  transformOriginX: number;
  rotateX: number;
  rotateY: number;
  perspective: number;
  translateZ: number;
  perspectiveOriginX: number;
  perspectiveOriginY: number;
}

export interface Snapshot {
  id: string;
  params: TransformParams;
  timestamp: number;
}

export interface KeyframeData {
  [time: number]: TransformParams | null;
}

export type ParamKey = keyof TransformParams;

const DEFAULT_PARAMS: TransformParams = {
  transformOriginX: 50,
  rotateX: 0,
  rotateY: 0,
  perspective: 500,
  translateZ: 0,
  perspectiveOriginX: 50,
  perspectiveOriginY: 50
};

const KEYFRAME_TIMES = [0, 1, 2, 3];

export class TransformController {
  private params: TransformParams;
  private listeners: Set<(params: TransformParams) => void> = new Set();
  private snapshots: Snapshot[] = [];
  private activeSnapshotId: string | null = null;
  private keyframes: KeyframeData = {};
  private animationFrame: number | null = null;
  private animationStartTime: number = 0;
  private animationDuration: number = 3000;
  private playbackSpeed: number = 1;
  private isPlaying: boolean = false;

  constructor(initialParams?: Partial<TransformParams>) {
    this.params = { ...DEFAULT_PARAMS, ...initialParams };
    KEYFRAME_TIMES.forEach(t => {
      this.keyframes[t] = null;
    });
  }

  getParams(): TransformParams {
    return { ...this.params };
  }

  setParam(key: ParamKey, value: number): void {
    this.params[key] = value;
    this.activeSnapshotId = null;
    this.notifyListeners();
  }

  setParams(params: Partial<TransformParams>): void {
    this.params = { ...this.params, ...params };
    this.activeSnapshotId = null;
    this.notifyListeners();
  }

  getTransformString(): string {
    return `translateZ(${this.params.translateZ}px) rotateX(${this.params.rotateX}deg) rotateY(${this.params.rotateY}deg)`;
  }

  getTransformOriginString(): string {
    return `${this.params.transformOriginX}% 50%`;
  }

  getPerspectiveOriginString(): string {
    return `${this.params.perspectiveOriginX}% ${this.params.perspectiveOriginY}%`;
  }

  getPerspectiveValue(): number {
    return this.params.perspective;
  }

  onChange(callback: (params: TransformParams) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(cb => cb(this.params));
  }

  getSnapshot(): Snapshot {
    return {
      id: this.generateId(),
      params: { ...this.params },
      timestamp: Date.now()
    };
  }

  saveSnapshot(): Snapshot | null {
    if (this.snapshots.length >= 4) {
      return null;
    }
    const snapshot = this.getSnapshot();
    this.snapshots.push(snapshot);
    this.activeSnapshotId = snapshot.id;
    return snapshot;
  }

  applySnapshot(id: string): boolean {
    const snapshot = this.snapshots.find(s => s.id === id);
    if (!snapshot) return false;
    this.params = { ...snapshot.params };
    this.activeSnapshotId = id;
    this.notifyListeners();
    return true;
  }

  deleteSnapshot(id: string): boolean {
    const index = this.snapshots.findIndex(s => s.id === id);
    if (index === -1) return false;
    this.snapshots.splice(index, 1);
    if (this.activeSnapshotId === id) {
      this.activeSnapshotId = null;
    }
    return true;
  }

  getSnapshots(): Snapshot[] {
    return [...this.snapshots];
  }

  getActiveSnapshotId(): string | null {
    return this.activeSnapshotId;
  }

  reorderSnapshots(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= this.snapshots.length) return;
    if (toIndex < 0 || toIndex >= this.snapshots.length) return;
    const [removed] = this.snapshots.splice(fromIndex, 1);
    this.snapshots.splice(toIndex, 0, removed);
  }

  resetParams(): void {
    this.params = { ...DEFAULT_PARAMS };
    this.activeSnapshotId = null;
    this.notifyListeners();
  }

  recordKeyframe(time: number): void {
    if (!KEYFRAME_TIMES.includes(time)) return;
    this.keyframes[time] = { ...this.params };
  }

  clearKeyframe(time: number): void {
    if (!KEYFRAME_TIMES.includes(time)) return;
    this.keyframes[time] = null;
  }

  getKeyframe(time: number): TransformParams | null {
    return this.keyframes[time] ? { ...this.keyframes[time] } : null;
  }

  getKeyframeTimes(): number[] {
    return [...KEYFRAME_TIMES];
  }

  hasKeyframe(time: number): boolean {
    return this.keyframes[time] !== null;
  }

  setPlaybackSpeed(speed: number): void {
    this.playbackSpeed = speed;
  }

  getPlaybackSpeed(): number {
    return this.playbackSpeed;
  }

  isAnimationPlaying(): boolean {
    return this.isPlaying;
  }

  playAnimation(onProgress?: (currentTime: number) => void): void {
    if (this.isPlaying) return;

    const recordedFrames = KEYFRAME_TIMES.filter(t => this.keyframes[t] !== null);
    if (recordedFrames.length < 2) return;

    this.isPlaying = true;
    this.animationStartTime = performance.now();

    const animate = (now: number) => {
      if (!this.isPlaying) return;

      const elapsed = (now - this.animationStartTime) * this.playbackSpeed;
      const progress = Math.min(elapsed / this.animationDuration, 1);
      const currentTime = progress * 3;

      this.interpolateToTime(currentTime);

      if (onProgress) {
        onProgress(currentTime);
      }

      if (progress >= 1) {
        this.isPlaying = false;
        this.animationFrame = null;
        return;
      }

      this.animationFrame = requestAnimationFrame(animate);
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  stopAnimation(): void {
    this.isPlaying = false;
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private interpolateToTime(currentTime: number): void {
    const sortedTimes = KEYFRAME_TIMES.filter(t => this.keyframes[t] !== null).sort((a, b) => a - b);
    if (sortedTimes.length < 2) return;

    let prevTime = sortedTimes[0];
    let nextTime = sortedTimes[sortedTimes.length - 1];

    for (let i = 0; i < sortedTimes.length - 1; i++) {
      if (currentTime >= sortedTimes[i] && currentTime <= sortedTimes[i + 1]) {
        prevTime = sortedTimes[i];
        nextTime = sortedTimes[i + 1];
        break;
      }
    }

    if (currentTime <= sortedTimes[0]) {
      this.params = { ...this.keyframes[sortedTimes[0]]! };
    } else if (currentTime >= sortedTimes[sortedTimes.length - 1]) {
      this.params = { ...this.keyframes[sortedTimes[sortedTimes.length - 1]]! };
    } else {
      const range = nextTime - prevTime;
      const t = range === 0 ? 0 : (currentTime - prevTime) / range;
      const prevParams = this.keyframes[prevTime]!;
      const nextParams = this.keyframes[nextTime]!;

      this.params = {
        transformOriginX: this.lerp(prevParams.transformOriginX, nextParams.transformOriginX, t),
        rotateX: this.lerp(prevParams.rotateX, nextParams.rotateX, t),
        rotateY: this.lerp(prevParams.rotateY, nextParams.rotateY, t),
        perspective: this.lerp(prevParams.perspective, nextParams.perspective, t),
        translateZ: this.lerp(prevParams.translateZ, nextParams.translateZ, t),
        perspectiveOriginX: this.lerp(prevParams.perspectiveOriginX, nextParams.perspectiveOriginX, t),
        perspectiveOriginY: this.lerp(prevParams.perspectiveOriginY, nextParams.perspectiveOriginY, t)
      };
    }

    this.activeSnapshotId = null;
    this.notifyListeners();
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }
}
