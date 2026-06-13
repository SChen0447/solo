import type { WeaveSystem, Thread, Ripple, Stardust } from './weave';
import type { InteractionData } from './input';

const GRID_SPACING = 6;
const GRID_OPACITY = 0.1;
const TARGET_FPS = 60;
const FRAME_DURATION = 1000 / TARGET_FPS;

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private deltaTime: number = 0;
  private fps: number = TARGET_FPS;
  private isRunning: boolean = false;
  private gridCanvas: HTMLCanvasElement | null = null;
  private gridCtx: CanvasRenderingContext2D | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = ctx;
    this.setupCanvas();
    this.createGridCache();
  }

  private setupCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width * dpr;
    this.height = rect.height * dpr;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx.scale(dpr, dpr);
  }

  private createGridCache(): void {
    this.gridCanvas = document.createElement('canvas');
    this.gridCtx = this.gridCanvas.getContext('2d');
    if (!this.gridCtx) return;

    const rect = this.canvas.getBoundingClientRect();
    this.gridCanvas.width = rect.width;
    this.gridCanvas.height = rect.height;

    this.gridCtx.strokeStyle = `rgba(200, 200, 200, ${GRID_OPACITY})`;
    this.gridCtx.lineWidth = 0.5;

    for (let x = 0; x <= rect.width; x += GRID_SPACING) {
      this.gridCtx.beginPath();
      this.gridCtx.moveTo(x, 0);
      this.gridCtx.lineTo(x, rect.height);
      this.gridCtx.stroke();
    }

    for (let y = 0; y <= rect.height; y += GRID_SPACING) {
      this.gridCtx.beginPath();
      this.gridCtx.moveTo(0, y);
      this.gridCtx.lineTo(rect.width, y);
      this.gridCtx.stroke();
    }
  }

  private drawBackground(): void {
    const rect = this.canvas.getBoundingClientRect();
    const gradient = this.ctx.createLinearGradient(0, 0, 0, rect.height);
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(1, '#1a0a3e');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, rect.width, rect.height);
  }

  private drawGrid(): void {
    if (this.gridCanvas) {
      const rect = this.canvas.getBoundingClientRect();
      this.ctx.drawImage(this.gridCanvas, 0, 0, rect.width, rect.height);
    }
  }

  private drawThreads(threads: Thread[]): void {
    for (const thread of threads) {
      if (thread.points.length < 2) continue;

      this.ctx.beginPath();
      this.ctx.lineWidth = 1.5;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      const firstPoint = thread.points[0];
      const startX = firstPoint.x + firstPoint.offsetX;
      const startY = firstPoint.y + firstPoint.offsetY;
      this.ctx.moveTo(startX, startY);

      for (let i = 1; i < thread.points.length - 2; i++) {
        const p0 = thread.points[i - 1];
        const p1 = thread.points[i];
        const p2 = thread.points[i + 1];
        const p3 = thread.points[i + 2];

        const x0 = p0.x + p0.offsetX;
        const y0 = p0.y + p0.offsetY;
        const x1 = p1.x + p1.offsetX;
        const y1 = p1.y + p1.offsetY;
        const x2 = p2.x + p2.offsetX;
        const y2 = p2.y + p2.offsetY;
        const x3 = p3.x + p3.offsetX;
        const y3 = p3.y + p3.offsetY;

        const cp1x = x1 + (x2 - x0) / 6;
        const cp1y = y1 + (y2 - y0) / 6;
        const cp2x = x2 - (x3 - x1) / 6;
        const cp2y = y2 - (y3 - y1) / 6;

        this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
      }

      const secondLast = thread.points[thread.points.length - 2];
      const last = thread.points[thread.points.length - 1];
      this.ctx.lineTo(secondLast.x + secondLast.offsetX, secondLast.y + secondLast.offsetY);
      this.ctx.lineTo(last.x + last.offsetX, last.y + last.offsetY);

      const gradient = this.ctx.createLinearGradient(
        firstPoint.x + firstPoint.offsetX,
        firstPoint.y + firstPoint.offsetY,
        last.x + last.offsetX,
        last.y + last.offsetY
      );

      const colorCount = Math.min(thread.points.length, 8);
      for (let i = 0; i < colorCount; i++) {
        const ratio = i / (colorCount - 1);
        const pointIndex = Math.floor((i / (colorCount - 1)) * (thread.points.length - 1));
        const color = thread.points[pointIndex].color;
        gradient.addColorStop(ratio, color);
      }

      this.ctx.strokeStyle = gradient;
      this.ctx.shadowColor = thread.baseColor;
      this.ctx.shadowBlur = 8;
      this.ctx.stroke();

      this.ctx.shadowBlur = 0;
      this.ctx.globalCompositeOperation = 'lighter';
      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = 0.5;
      this.ctx.globalAlpha = 0.5;
      this.ctx.stroke();
      this.ctx.globalAlpha = 1;
      this.ctx.globalCompositeOperation = 'source-over';
    }
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 255, g: 255, b: 255 };
  }

  private drawRipples(ripples: Ripple[]): void {
    const now = performance.now();
    const radii = [8, 16, 24, 32, 40, 48];

    for (const ripple of ripples) {
      const elapsed = now - ripple.startTime;
      const progress = elapsed / ripple.duration;
      if (progress >= 1) continue;

      const easedProgress = 1 - Math.pow(1 - progress, 3);

      for (let i = 0; i < 6; i++) {
        const baseRadius = radii[i];
        const currentRadius = baseRadius + easedProgress * ripple.speed * (ripple.duration / 1000);
        const opacity = 0.8 * (1 - i * 0.116) * (1 - progress);
        const color = ripple.colors[i % ripple.colors.length];
        const rgb = this.hexToRgb(color);

        this.ctx.beginPath();
        this.ctx.arc(ripple.x, ripple.y, currentRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
        this.ctx.lineWidth = 2;
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 12;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        this.ctx.globalCompositeOperation = 'lighter';
        this.ctx.beginPath();
        this.ctx.arc(ripple.x, ripple.y, currentRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.3})`;
        this.ctx.lineWidth = 4;
        this.ctx.stroke();
        this.ctx.globalCompositeOperation = 'source-over';
      }
    }
  }

  private drawStardust(stardust: Stardust[]): void {
    for (const dust of stardust) {
      const rgb = this.hexToRgb('#ffe082');
      const opacity = dust.isFlashing ? 1 : dust.opacity;

      const gradient = this.ctx.createRadialGradient(
        dust.x,
        dust.y,
        0,
        dust.x,
        dust.y,
        dust.size * 2
      );
      gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`);
      gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.5})`);
      gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

      this.ctx.beginPath();
      this.ctx.arc(dust.x, dust.y, dust.size * 2, 0, Math.PI * 2);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(dust.x, dust.y, dust.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
      this.ctx.shadowColor = '#ffe082';
      this.ctx.shadowBlur = dust.isFlashing ? 15 : 8;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }
  }

  public render(weave: WeaveSystem, _interaction: InteractionData): void {
    this.drawBackground();
    this.drawGrid();
    this.drawThreads(weave.getThreads());
    this.drawRipples(weave.getRipples());
    this.drawStardust(weave.getStardust());
  }

  public startLoop(
    weave: WeaveSystem,
    getInteraction: () => InteractionData,
    updateUI: (interaction: InteractionData) => void
  ): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();

    const loop = (currentTime: number) => {
      if (!this.isRunning) return;

      this.animationFrameId = requestAnimationFrame(loop);

      const elapsed = currentTime - this.lastFrameTime;
      if (elapsed < FRAME_DURATION * 0.8) return;

      this.deltaTime = elapsed;
      this.lastFrameTime = currentTime;
      this.fps = 1000 / this.deltaTime;

      const interaction = getInteraction();
      weave.update(this.deltaTime, interaction);
      this.render(weave, interaction);
      updateUI(interaction);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  public stopLoop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public setFPS(fps: number): void {
    this.fps = fps;
  }

  public getFPS(): number {
    return this.fps;
  }

  public getDeltaTime(): number {
    return this.deltaTime;
  }

  public resize(): void {
    this.setupCanvas();
    this.createGridCache();
  }

  public destroy(): void {
    this.stopLoop();
    this.gridCanvas = null;
    this.gridCtx = null;
  }
}
