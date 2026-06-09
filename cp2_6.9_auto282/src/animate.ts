export type AnimationCallback = (deltaTime: number, timestamp: number) => void;

export class AnimationLoop {
  private rafId: number | null = null;
  private lastTime: number = 0;
  private callbacks: Set<AnimationCallback> = new Set();
  private isRunning: boolean = false;
  private fpsFrames: number = 0;
  private fpsLastTime: number = 0;
  private currentFps: number = 0;
  private onFpsUpdate: ((fps: number) => void) | null = null;

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.fpsLastTime = this.lastTime;
    this.fpsFrames = 0;
    this.loop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  addCallback(cb: AnimationCallback): void {
    this.callbacks.add(cb);
  }

  removeCallback(cb: AnimationCallback): void {
    this.callbacks.delete(cb);
  }

  setFpsUpdateCallback(cb: (fps: number) => void): void {
    this.onFpsUpdate = cb;
  }

  getFps(): number {
    return this.currentFps;
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    const deltaTime = now - this.lastTime;
    this.lastTime = now;

    this.fpsFrames++;
    if (now - this.fpsLastTime >= 500) {
      this.currentFps = (this.fpsFrames * 1000) / (now - this.fpsLastTime);
      this.fpsFrames = 0;
      this.fpsLastTime = now;
      this.onFpsUpdate?.(this.currentFps);
    }

    for (const cb of this.callbacks) {
      try {
        cb(deltaTime, now);
      } catch (e) {
        console.error('Animation callback error:', e);
      }
    }

    this.rafId = requestAnimationFrame(this.loop);
  };
}

export class PlaybackController {
  private isPlaying: boolean = false;
  private startTime: number = 0;
  private playbackSpeed: number = 1;
  private currentTime: number = 0;
  private totalDuration: number = 0;
  private strokeTimes: { start: number; end: number }[] = [];
  private onStrokeRender: ((strokeIndex: number, progress: number) => void) | null = null;
  private onComplete: (() => void) | null = null;
  private renderedStrokes: Set<number> = new Set();
  private onPlaybackStateChange: ((playing: boolean) => void) | null = null;

  setup(
    strokeTimes: { start: number; end: number }[],
    totalDuration: number
  ): void {
    this.strokeTimes = strokeTimes;
    this.totalDuration = totalDuration;
    this.reset();
  }

  setSpeed(speed: number): void {
    this.playbackSpeed = speed;
    if (this.isPlaying) {
      this.startTime = performance.now() - (this.currentTime / speed);
    }
  }

  setStrokeRenderCallback(cb: (strokeIndex: number, progress: number) => void): void {
    this.onStrokeRender = cb;
  }

  setCompleteCallback(cb: () => void): void {
    this.onComplete = cb;
  }

  setStateChangeCallback(cb: (playing: boolean) => void): void {
    this.onPlaybackStateChange = cb;
  }

  start(): void {
    if (this.strokeTimes.length === 0) return;
    this.isPlaying = true;
    this.startTime = performance.now();
    this.onPlaybackStateChange?.(true);
  }

  stop(): void {
    this.isPlaying = false;
    this.onPlaybackStateChange?.(false);
  }

  reset(): void {
    this.isPlaying = false;
    this.currentTime = 0;
    this.renderedStrokes.clear();
    this.onPlaybackStateChange?.(false);
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  update(now: number): void {
    if (!this.isPlaying) return;

    const elapsed = (now - this.startTime) * this.playbackSpeed;
    this.currentTime = Math.min(elapsed, this.totalDuration);

    for (let i = 0; i < this.strokeTimes.length; i++) {
      const st = this.strokeTimes[i];
      if (this.currentTime >= st.start && !this.renderedStrokes.has(i)) {
        this.renderedStrokes.add(i);
        const progress = Math.min(1, (this.currentTime - st.start) / Math.max(1, st.end - st.start));
        this.onStrokeRender?.(i, progress);
      } else if (this.renderedStrokes.has(i)) {
        const progress = Math.min(1, (this.currentTime - st.start) / Math.max(1, st.end - st.start));
        this.onStrokeRender?.(i, progress);
      }
    }

    if (this.currentTime >= this.totalDuration) {
      this.stop();
      this.onComplete?.();
    }
  }
}

export function easeOutQuad(t: number): number {
  return t * (2 - t);
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
