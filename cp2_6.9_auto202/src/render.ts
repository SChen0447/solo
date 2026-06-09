import type { InkRenderCommand } from './ink';

const PAPER_COLOR = '#F5F0E8';

export class RenderEngine {
  private mainCanvas: HTMLCanvasElement;
  private mainCtx: CanvasRenderingContext2D;
  private dryCanvas: HTMLCanvasElement;
  private dryCtx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;

  constructor(mainCanvas: HTMLCanvasElement) {
    this.mainCanvas = mainCanvas;
    const mainCtx = mainCanvas.getContext('2d', { alpha: false });
    if (!mainCtx) throw new Error('Failed to get main canvas context');
    this.mainCtx = mainCtx;

    this.dryCanvas = document.createElement('canvas');
    const dryCtx = this.dryCanvas.getContext('2d', { alpha: true });
    if (!dryCtx) throw new Error('Failed to get dry canvas context');
    this.dryCtx = dryCtx;
  }

  resize(width: number, height: number): void {
    const prevDry = document.createElement('canvas');
    prevDry.width = this.width;
    prevDry.height = this.height;
    if (this.width > 0 && this.height > 0) {
      const prevCtx = prevDry.getContext('2d');
      prevCtx?.drawImage(this.dryCanvas, 0, 0);
    }

    this.width = width;
    this.height = height;

    this.mainCanvas.width = width;
    this.mainCanvas.height = height;
    this.dryCanvas.width = width;
    this.dryCanvas.height = height;

    if (this.width > 0 && this.height > 0) {
      this.dryCtx.fillStyle = PAPER_COLOR;
      this.dryCtx.fillRect(0, 0, width, height);
      if (prevDry.width > 0 && prevDry.height > 0) {
        this.dryCtx.drawImage(prevDry, 0, 0, prevDry.width, prevDry.height, 0, 0, width, height);
      }
    }
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  render(wetInks: InkRenderCommand[]): void {
    this.mainCtx.drawImage(this.dryCanvas, 0, 0);

    for (const ink of wetInks) {
      if (ink.completed) continue;
      this.drawInkBlob(ink);
    }
  }

  drawInkBlob(ink: InkRenderCommand): void {
    const ctx = this.mainCtx;
    const gray = Math.round(ink.currentGray);
    const alpha = this.calculateAlpha(ink);

    if (ink.currentRadius < 1) return;

    const gradient = ctx.createRadialGradient(
      ink.x, ink.y, 0,
      ink.x, ink.y, ink.currentRadius
    );

    const centerColor = `rgba(${gray},${gray},${gray},${alpha})`;
    const midColor = `rgba(${gray},${gray},${gray},${alpha * 0.5})`;
    const edgeColor = `rgba(${gray},${gray},${gray},0)`;

    gradient.addColorStop(0, centerColor);
    gradient.addColorStop(0.6, midColor);
    gradient.addColorStop(1, edgeColor);

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(ink.x, ink.y, ink.currentRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  commitDryInks(inks: InkRenderCommand[]): void {
    for (const ink of inks) {
      const gray = Math.round(ink.currentGray);
      const alpha = this.calculateAlpha(ink) * 0.9;

      if (ink.finalRadius < 1) continue;

      const gradient = this.dryCtx.createRadialGradient(
        ink.x, ink.y, 0,
        ink.x, ink.y, ink.finalRadius
      );

      const centerColor = `rgba(${gray},${gray},${gray},${alpha})`;
      const midColor = `rgba(${gray},${gray},${gray},${alpha * 0.5})`;
      const edgeColor = `rgba(${gray},${gray},${gray},0)`;

      gradient.addColorStop(0, centerColor);
      gradient.addColorStop(0.6, midColor);
      gradient.addColorStop(1, edgeColor);

      this.dryCtx.save();
      this.dryCtx.globalCompositeOperation = 'source-over';
      this.dryCtx.fillStyle = gradient;
      this.dryCtx.beginPath();
      this.dryCtx.arc(ink.x, ink.y, ink.finalRadius, 0, Math.PI * 2);
      this.dryCtx.fill();
      this.dryCtx.restore();
    }
  }

  private calculateAlpha(ink: InkRenderCommand): number {
    const elapsed = performance.now() - ink.createdAt;
    const progress = Math.min(elapsed / ink.duration, 1);
    const baseAlpha = 0.85 - progress * 0.15;
    return Math.max(baseAlpha, 0.4);
  }

  clear(): void {
    this.dryCtx.fillStyle = PAPER_COLOR;
    this.dryCtx.fillRect(0, 0, this.width, this.height);
    this.mainCtx.fillStyle = PAPER_COLOR;
    this.mainCtx.fillRect(0, 0, this.width, this.height);
  }

  exportPNG(): string {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.width;
    exportCanvas.height = this.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return '';
    ctx.fillStyle = PAPER_COLOR;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.drawImage(this.dryCanvas, 0, 0);
    return exportCanvas.toDataURL('image/png');
  }

  getDryCanvas(): HTMLCanvasElement {
    return this.dryCanvas;
  }
}
