import type { BandPosition } from './colorBand';

export class ParticleTexture {
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private density: number = 50;
  private lastRegenerateTime: number = 0;
  private regenerateInterval: number = 5000;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.offscreenCanvas = document.createElement('canvas');
    const offCtx = this.offscreenCanvas.getContext('2d');
    if (!offCtx) throw new Error('Failed to create offscreen canvas context');
    this.offscreenCtx = offCtx;
    this.resizeOffscreen(800, 100);
    this.regenerate();
  }

  setDensity(densityPercent: number): void {
    const newDensity = Math.max(0, Math.min(100, densityPercent));
    if (Math.abs(newDensity - this.density) > 1) {
      this.density = newDensity;
      this.regenerate();
    } else {
      this.density = newDensity;
    }
  }

  private resizeOffscreen(width: number, height: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.offscreenCanvas.width = Math.max(1, Math.floor(width * dpr));
    this.offscreenCanvas.height = Math.max(1, Math.floor(height * dpr));
  }

  regenerate(): void {
    const ctx = this.offscreenCtx;
    const w = this.offscreenCanvas.width;
    const h = this.offscreenCanvas.height;
    ctx.clearRect(0, 0, w, h);

    if (this.density <= 0 || w <= 0 || h <= 0) return;

    const densityFactor = this.density / 100;
    const pixelCount = Math.floor(w * h * 0.15 * densityFactor);
    const imageData = ctx.createImageData(w, h);
    const data = imageData.data;

    for (let i = 0; i < pixelCount; i++) {
      const px = Math.floor(Math.random() * w);
      const py = Math.floor(Math.random() * h);
      const idx = (py * w + px) * 4;
      const alpha = (0.02 + Math.random() * 0.06) * densityFactor;
      const shade = 200 + Math.floor(Math.random() * 55);
      data[idx] = shade;
      data[idx + 1] = shade;
      data[idx + 2] = shade + 20;
      data[idx + 3] = Math.floor(alpha * 255);
    }

    ctx.putImageData(imageData, 0, 0);
    this.lastRegenerateTime = performance.now();
  }

  private maybeRegenerate(now: number): void {
    if (now - this.lastRegenerateTime > this.regenerateInterval) {
      this.regenerate();
    }
  }

  render(bandPos: BandPosition, now: number): void {
    const { x, y, width, height } = bandPos;
    if (width <= 0 || height <= 0) return;

    if (
      Math.abs(this.offscreenCanvas.width - width) > 100 ||
      Math.abs(this.offscreenCanvas.height - height) > 20
    ) {
      this.resizeOffscreen(width, height);
      this.regenerate();
    }

    this.maybeRegenerate(now);

    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.6 + (this.density / 100) * 0.4;
    ctx.drawImage(this.offscreenCanvas, x, y, width, height);
    ctx.restore();
  }
}
