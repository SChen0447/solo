import type { CollectedEvent } from './eventCollector';
import { clamp } from './utils';

export interface HeatmapConfig {
  opacity: number;
  radius: number;
}

interface ColorStop {
  offset: number;
  color: string;
}

const DEFAULT_COLOR_STOPS: ColorStop[] = [
  { offset: 0, color: 'rgba(33, 148, 243, 0)' },
  { offset: 0.2, color: 'rgba(33, 148, 243, 0.6)' },
  { offset: 0.5, color: 'rgba(253, 203, 110, 0.8)' },
  { offset: 0.8, color: 'rgba(231, 76, 60, 0.9)' },
  { offset: 1, color: 'rgba(231, 76, 60, 1)' }
];

export class HeatmapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private getEvents: () => CollectedEvent[];
  private config: HeatmapConfig;
  private targetOpacity: number;
  private currentOpacity: number;
  private targetRadius: number;
  private currentRadius: number;
  private animationFrameId: number | null = null;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private getScrollOffset: () => { top: number; left: number };

  constructor(
    canvas: HTMLCanvasElement,
    getEvents: () => CollectedEvent[],
    getScrollOffset: () => { top: number; left: number },
    config?: Partial<HeatmapConfig>
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;

    this.offscreenCanvas = document.createElement('canvas');
    const offCtx = this.offscreenCanvas.getContext('2d');
    if (!offCtx) throw new Error('Failed to get offscreen 2D context');
    this.offscreenCtx = offCtx;

    this.getEvents = getEvents;
    this.getScrollOffset = getScrollOffset;
    this.config = {
      opacity: config?.opacity ?? 0.6,
      radius: config?.radius ?? 40
    };
    this.targetOpacity = this.config.opacity;
    this.currentOpacity = this.config.opacity;
    this.targetRadius = this.config.radius;
    this.currentRadius = this.config.radius;
  }

  public setOpacity(opacity: number): void {
    this.targetOpacity = clamp(opacity, 0.3, 1.0);
  }

  public setRadius(radius: number): void {
    this.targetRadius = clamp(radius, 20, 80);
  }

  private interpolateConfig(): void {
    const smoothness = 0.15;
    this.currentOpacity += (this.targetOpacity - this.currentOpacity) * smoothness;
    this.currentRadius += (this.targetRadius - this.currentRadius) * smoothness;
  }

  private createRadialGradient(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): CanvasGradient {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    DEFAULT_COLOR_STOPS.forEach((stop) => {
      gradient.addColorStop(stop.offset, stop.color);
    });
    return gradient;
  }

  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.offscreenCanvas.width = rect.width * dpr;
    this.offscreenCanvas.height = rect.height * dpr;
    this.offscreenCtx.scale(dpr, dpr);
  }

  public render(): void {
    this.interpolateConfig();
    this.resizeCanvas();

    const events = this.getEvents();
    const rect = this.canvas.getBoundingClientRect();
    const { top: scrollTop, left: scrollLeft } = this.getScrollOffset();

    this.offscreenCtx.clearRect(0, 0, rect.width, rect.height);
    this.offscreenCtx.globalAlpha = this.currentOpacity;

    const densityMap = new Map<string, number>();
    const gridSize = Math.max(this.currentRadius / 4, 10);

    events.forEach((event) => {
      let x = event.x;
      let y = event.y;

      if (event.type === 'mousemove' || event.type === 'click') {
        if (event.scrollTop !== undefined) {
          y += (event.scrollTop - scrollTop);
        }
        if (event.scrollLeft !== undefined) {
          x += (event.scrollLeft - scrollLeft);
        }
      }

      const gridX = Math.floor(x / gridSize);
      const gridY = Math.floor(y / gridSize);
      const key = `${gridX},${gridY}`;
      densityMap.set(key, (densityMap.get(key) || 0) + 1);
    });

    const maxDensity = Math.max(...Array.from(densityMap.values()), 1);

    densityMap.forEach((density, key) => {
      const [gx, gy] = key.split(',').map(Number);
      const x = gx * gridSize + gridSize / 2;
      const y = gy * gridSize + gridSize / 2;
      const intensity = clamp(density / maxDensity, 0.1, 1);
      const radius = this.currentRadius * intensity;

      const gradient = this.createRadialGradient(this.offscreenCtx, x, y, radius);
      this.offscreenCtx.fillStyle = gradient;
      this.offscreenCtx.globalAlpha = this.currentOpacity * intensity * 0.7;
      this.offscreenCtx.beginPath();
      this.offscreenCtx.arc(x, y, radius, 0, Math.PI * 2);
      this.offscreenCtx.fill();
    });

    this.ctx.clearRect(0, 0, rect.width, rect.height);
    this.ctx.filter = 'blur(4px)';
    this.ctx.drawImage(this.offscreenCanvas, 0, 0, rect.width, rect.height);
    this.ctx.filter = 'none';
  }

  public startRenderLoop(intervalMs: number = 100): void {
    const loop = (): void => {
      this.render();
      setTimeout(() => {
        this.animationFrameId = requestAnimationFrame(loop);
      }, intervalMs);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  public stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public clear(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);
  }
}
