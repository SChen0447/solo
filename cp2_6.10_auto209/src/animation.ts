import type { PixelFrame } from './character';
import { GRID_SIZE } from './character';

export type PlaybackState = 'stopped' | 'playing' | 'paused';

export type FrameChangeCallback = (frameIndex: number) => void;
export type StateChangeCallback = (state: PlaybackState) => void;

export class AnimationPlayer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private frames: PixelFrame[] = [];
  private frameIndex: number = 0;
  private frameInterval: number = 200;
  private lastFrameTime: number = 0;
  private rafId: number | null = null;
  private state: PlaybackState = 'stopped';
  private scale: number = 10;
  private onFrameChange: FrameChangeCallback | null = null;
  private onStateChange: StateChangeCallback | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取Canvas 2D上下文');
    }
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
  }

  setFrames(frames: PixelFrame[]): void {
    this.frames = frames;
    if (this.frameIndex >= frames.length) {
      this.frameIndex = 0;
    }
    this.renderCurrentFrame();
  }

  setFrameInterval(ms: number): void {
    this.frameInterval = Math.max(100, Math.min(1000, ms));
  }

  getFrameInterval(): number {
    return this.frameInterval;
  }

  setScale(scale: number): void {
    this.scale = scale;
    this.renderCurrentFrame();
  }

  getCurrentFrameIndex(): number {
    return this.frameIndex;
  }

  setCurrentFrameIndex(index: number): void {
    if (this.frames.length === 0) return;
    this.frameIndex = ((index % this.frames.length) + this.frames.length) % this.frames.length;
    this.renderCurrentFrame();
    this.notifyFrameChange();
  }

  getState(): PlaybackState {
    return this.state;
  }

  setOnFrameChange(callback: FrameChangeCallback | null): void {
    this.onFrameChange = callback;
  }

  setOnStateChange(callback: StateChangeCallback | null): void {
    this.onStateChange = callback;
  }

  play(): void {
    if (this.state === 'playing' || this.frames.length === 0) return;
    this.state = 'playing';
    this.lastFrameTime = performance.now();
    this.notifyStateChange();
    this.startLoop();
  }

  pause(): void {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.stopLoop();
    this.notifyStateChange();
  }

  stop(): void {
    this.state = 'stopped';
    this.stopLoop();
    this.frameIndex = 0;
    this.renderCurrentFrame();
    this.notifyFrameChange();
    this.notifyStateChange();
  }

  nextFrame(): void {
    if (this.frames.length === 0) return;
    this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    this.renderCurrentFrame();
    this.notifyFrameChange();
  }

  prevFrame(): void {
    if (this.frames.length === 0) return;
    this.frameIndex = (this.frameIndex - 1 + this.frames.length) % this.frames.length;
    this.renderCurrentFrame();
    this.notifyFrameChange();
  }

  renderFrame(frameIndex: number): void {
    if (this.frames.length === 0) return;
    const idx = ((frameIndex % this.frames.length) + this.frames.length) % this.frames.length;
    this.frameIndex = idx;
    this.renderCurrentFrame();
    this.notifyFrameChange();
  }

  private startLoop(): void {
    if (this.rafId !== null) return;
    const loop = (timestamp: number) => {
      if (this.state !== 'playing') return;
      const elapsed = timestamp - this.lastFrameTime;
      if (elapsed >= this.frameInterval) {
        this.frameIndex = (this.frameIndex + 1) % this.frames.length;
        this.renderCurrentFrame();
        this.notifyFrameChange();
        this.lastFrameTime = timestamp;
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private stopLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private renderCurrentFrame(): void {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    if (this.frames.length === 0) return;
    const frame = this.frames[this.frameIndex];
    if (!frame) return;

    const pixelSize = this.scale;
    const offsetX = (width - GRID_SIZE * pixelSize) / 2;
    const offsetY = (height - GRID_SIZE * pixelSize) / 2;

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const color = frame[y][x];
        if (color) {
          this.ctx.fillStyle = color;
          this.ctx.fillRect(
            offsetX + x * pixelSize,
            offsetY + y * pixelSize,
            pixelSize,
            pixelSize
          );
        }
      }
    }
  }

  private notifyFrameChange(): void {
    if (this.onFrameChange) {
      this.onFrameChange(this.frameIndex);
    }
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }

  destroy(): void {
    this.stopLoop();
  }
}
