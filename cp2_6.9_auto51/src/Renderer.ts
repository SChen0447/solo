import type { BrushPoint } from './BrushEngine';

interface WaterStain {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  createdAt: number;
  duration: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bgCanvas: HTMLCanvasElement;
  private bgCtx: CanvasRenderingContext2D;
  private strokeCanvas: HTMLCanvasElement;
  private strokeCtx: CanvasRenderingContext2D;
  private stainCanvas: HTMLCanvasElement;
  private stainCtx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private showTexture = true;
  private paperColor = '#F5F0E1';
  private waterStains: WaterStain[] = [];
  private animationId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.bgCanvas = document.createElement('canvas');
    const bgCtx = this.bgCanvas.getContext('2d');
    if (!bgCtx) throw new Error('Background canvas context not available');
    this.bgCtx = bgCtx;

    this.strokeCanvas = document.createElement('canvas');
    const strokeCtx = this.strokeCanvas.getContext('2d');
    if (!strokeCtx) throw new Error('Stroke canvas context not available');
    this.strokeCtx = strokeCtx;

    this.stainCanvas = document.createElement('canvas');
    const stainCtx = this.stainCanvas.getContext('2d');
    if (!stainCtx) throw new Error('Stain canvas context not available');
    this.stainCtx = stainCtx;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    const canvases = [
      [this.canvas, this.ctx],
      [this.bgCanvas, this.bgCtx],
      [this.strokeCanvas, this.strokeCtx],
      [this.stainCanvas, this.stainCtx]
    ] as const;

    canvases.forEach(([c]) => {
      c.width = width;
      c.height = height;
    });

    this.renderBackground();
    this.strokeCtx.clearRect(0, 0, width, height);
    this.stainCtx.clearRect(0, 0, width, height);
    this.composeLayers();
  }

  setShowTexture(show: boolean): void {
    this.showTexture = show;
    this.renderBackground();
    this.composeLayers();
  }

  private renderBackground(): void {
    const ctx = this.bgCtx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.fillStyle = this.paperColor;
    ctx.fillRect(0, 0, this.width, this.height);

    if (this.showTexture) {
      this.drawPaperFibers(ctx);
      this.drawPaperNoise(ctx);
    }
  }

  private drawPaperFibers(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 0.5;

    const fiberCount = Math.floor((this.width * this.height) / 3000);

    for (let i = 0; i < fiberCount; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      const length = 8 + Math.random() * 25;
      const angle = Math.random() * Math.PI * 2;

      ctx.beginPath();
      ctx.moveTo(x, y);
      const endX = x + Math.cos(angle) * length;
      const endY = y + Math.sin(angle) * length;
      const cp1x = x + Math.cos(angle + (Math.random() - 0.5) * 0.5) * length * 0.3;
      const cp1y = y + Math.sin(angle + (Math.random() - 0.5) * 0.5) * length * 0.3;
      ctx.quadraticCurveTo(cp1x, cp1y, endX, endY);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawPaperNoise(ctx: CanvasRenderingContext2D): void {
    const imageData = ctx.getImageData(0, 0, this.width, this.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 12;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }

    ctx.putImageData(imageData, 0, 0);
  }

  clear(): void {
    this.strokeCtx.clearRect(0, 0, this.width, this.height);
    this.stainCtx.clearRect(0, 0, this.width, this.height);
    this.waterStains = [];
    this.composeLayers();
  }

  addWaterStain(x: number, y: number, radius: number): void {
    this.waterStains.push({
      x,
      y,
      radius: radius * 1.5,
      opacity: 0.12,
      createdAt: performance.now(),
      duration: 2000 + Math.random() * 1500
    });
  }

  private renderWaterStains(): void {
    const now = performance.now();
    this.stainCtx.clearRect(0, 0, this.width, this.height);

    this.waterStains = this.waterStains.filter((stain) => {
      const elapsed = now - stain.createdAt;
      if (elapsed >= stain.duration) return false;

      const progress = elapsed / stain.duration;
      const currentOpacity = stain.opacity * (1 - progress);
      const currentRadius = stain.radius * (1 + progress * 0.3);

      this.stainCtx.save();
      this.stainCtx.globalAlpha = currentOpacity;

      const gradient = this.stainCtx.createRadialGradient(
        stain.x,
        stain.y,
        0,
        stain.x,
        stain.y,
        currentRadius
      );
      gradient.addColorStop(0, 'rgba(100, 90, 80, 0.6)');
      gradient.addColorStop(0.5, 'rgba(120, 110, 100, 0.3)');
      gradient.addColorStop(1, 'rgba(140, 130, 120, 0)');

      this.stainCtx.fillStyle = gradient;
      this.stainCtx.beginPath();
      this.stainCtx.arc(stain.x, stain.y, currentRadius, 0, Math.PI * 2);
      this.stainCtx.fill();
      this.stainCtx.restore();

      return true;
    });
  }

  private composeLayers(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(this.bgCanvas, 0, 0);
    this.ctx.drawImage(this.stainCanvas, 0, 0);
    this.ctx.drawImage(this.strokeCanvas, 0, 0);
  }

  renderStrokeSegment(
    points: BrushPoint[],
    inkColor: string
  ): void {
    if (points.length < 2) return;

    const [p1, p2] = points;
    const ctx = this.strokeCtx;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const baseOpacity = 0.7 + p2.inkAmount * 0.3;
    const dryness = 1 - p2.inkAmount;

    if (dryness > 0.3) {
      this.drawDryBrush(ctx, p1, p2, inkColor, baseOpacity, dryness);
    }

    this.drawMainStroke(ctx, p1, p2, inkColor, baseOpacity);
    this.drawInkBleed(ctx, p1, p2, inkColor, baseOpacity, dryness);

    ctx.restore();

    this.composeLayers();

    if (p2.width > 8 && Math.random() > 0.7) {
      this.addWaterStain(p2.x, p2.y, p2.width * 0.8);
    }
  }

  private drawMainStroke(
    ctx: CanvasRenderingContext2D,
    p1: BrushPoint,
    p2: BrushPoint,
    color: string,
    opacity: number
  ): void {
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = p2.width;
    ctx.beginPath();

    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    ctx.moveTo(p1.x, p1.y);
    ctx.quadraticCurveTo(
      p1.x + (p2.x - p1.x) * 0.5,
      p1.y + (p2.y - p1.y) * 0.5,
      midX,
      midY
    );
    ctx.stroke();

    ctx.lineWidth = p2.width * 0.6;
    ctx.globalAlpha = opacity * 0.8;
    ctx.beginPath();
    ctx.moveTo(midX, midY);
    ctx.quadraticCurveTo(
      midX + (p2.x - midX) * 0.5,
      midY + (p2.y - midY) * 0.5,
      p2.x,
      p2.y
    );
    ctx.stroke();
  }

  private drawDryBrush(
    ctx: CanvasRenderingContext2D,
    p1: BrushPoint,
    p2: BrushPoint,
    color: string,
    opacity: number,
    dryness: number
  ): void {
    const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    const steps = Math.max(2, Math.floor(dist / 3));

    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const x = p1.x + (p2.x - p1.x) * t;
      const y = p1.y + (p2.y - p1.y) * t;
      const jitterCount = Math.floor(2 + dryness * 6);

      for (let j = 0; j < jitterCount; j++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * p2.width * 0.6;
        const jx = x + Math.cos(angle) * dist;
        const jy = y + Math.sin(angle) * dist;
        const size = 0.5 + Math.random() * p2.width * 0.15;

        ctx.globalAlpha = opacity * (0.1 + Math.random() * 0.3) * dryness;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(jx, jy, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawInkBleed(
    ctx: CanvasRenderingContext2D,
    p1: BrushPoint,
    p2: BrushPoint,
    color: string,
    opacity: number,
    dryness: number
  ): void {
    if (dryness > 0.5) return;

    ctx.globalAlpha = opacity * 0.08 * (1 - dryness);
    ctx.strokeStyle = color;
    ctx.lineWidth = p2.width * 1.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.quadraticCurveTo(
      (p1.x + p2.x) / 2,
      (p1.y + p2.y) / 2,
      p2.x,
      p2.y
    );
    ctx.stroke();
  }

  startAnimationLoop(): void {
    const render = () => {
      const hasStains = this.waterStains.length > 0;
      if (hasStains) {
        this.renderWaterStains();
        this.composeLayers();
      }
      this.animationId = requestAnimationFrame(render);
    };
    this.animationId = requestAnimationFrame(render);
  }

  stopAnimationLoop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
