import { Particle } from './particle';
import type { CanvasManager } from './canvas';
import { Sprayer } from './sprayer';

export interface RendererStats {
  fps: number;
  particleCount: number;
}

export type StatsCallback = (stats: RendererStats) => void;

export class Renderer {
  private canvasManager: CanvasManager;
  private sprayer: Sprayer;
  private animationId: number | null = null;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  private currentFps: number = 60;
  private onStatsUpdate?: StatsCallback;
  private running: boolean = false;

  constructor(
    canvasManager: CanvasManager,
    sprayer: Sprayer,
    onStatsUpdate?: StatsCallback
  ) {
    this.canvasManager = canvasManager;
    this.sprayer = sprayer;
    this.onStatsUpdate = onStatsUpdate;
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = performance.now();
    this.fpsUpdateTime = this.lastFrameTime;
    this.loop();
  }

  public stop(): void {
    this.running = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private loop = (): void => {
    if (!this.running) return;

    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.frameCount++;
    if (now - this.fpsUpdateTime >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.fpsUpdateTime));
      this.frameCount = 0;
      this.fpsUpdateTime = now;
    }

    this.sprayer.emit();

    const { width, height } = this.canvasManager;
    const particles = this.sprayer.updateParticles(width, height);

    this.render(particles);

    if (this.onStatsUpdate) {
      this.onStatsUpdate({
        fps: this.currentFps,
        particleCount: this.sprayer.getParticleCount()
      });
    }

    this.animationId = requestAnimationFrame(this.loop);
  };

  private render(particles: Particle[]): void {
    const { paintCtx, width, height } = this.canvasManager;

    paintCtx.clearRect(0, 0, width, height);

    paintCtx.globalCompositeOperation = 'source-over';

    for (let i = 0; i < particles.length; i++) {
      particles[i].draw(paintCtx);
    }
  }

  public getFps(): number {
    return this.currentFps;
  }
}
