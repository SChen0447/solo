export type DrawingMode = 'drawing' | 'paused';

export interface BrushSettings {
  size: number;
  colorHue: number;
}

export class CanvasController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private brushSize: number = 4;
  private colorHue: number = 60;
  private mode: DrawingMode = 'drawing';
  private lastPoint: { x: number; y: number } | null = null;
  private flashTimeout: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  setBrushSize(size: number): void {
    this.brushSize = Math.max(2, Math.min(20, size));
  }

  getBrushSize(): number {
    return this.brushSize;
  }

  setColorHue(hue: number): void {
    this.colorHue = ((hue % 360) + 360) % 360;
  }

  getColorHue(): number {
    return this.colorHue;
  }

  getColorString(): string {
    return `hsl(${this.colorHue}, 80%, 55%)`;
  }

  setMode(mode: DrawingMode): void {
    if (this.mode !== mode) {
      this.mode = mode;
      this.lastPoint = null;
      this.flashBorder();
    }
  }

  getMode(): DrawingMode {
    return this.mode;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.lastPoint = null;
  }

  drawPoint(x: number, y: number): void {
    if (this.mode !== 'drawing') {
      this.lastPoint = null;
      return;
    }

    const clampedX = Math.max(0, Math.min(this.canvas.width, x));
    const clampedY = Math.max(0, Math.min(this.canvas.height, y));

    if (this.lastPoint) {
      this.ctx.beginPath();
      this.ctx.strokeStyle = this.getColorString();
      this.ctx.lineWidth = this.brushSize;
      this.ctx.moveTo(this.lastPoint.x, this.lastPoint.y);
      this.ctx.lineTo(clampedX, clampedY);
      this.ctx.stroke();
    }

    this.lastPoint = { x: clampedX, y: clampedY };
  }

  flashBorder(): void {
    this.canvas.classList.remove('flash-border');
    void this.canvas.offsetWidth;
    this.canvas.classList.add('flash-border');

    if (this.flashTimeout !== null) {
      window.clearTimeout(this.flashTimeout);
    }
    this.flashTimeout = window.setTimeout(() => {
      this.canvas.classList.remove('flash-border');
      this.flashTimeout = null;
    }, 200);
  }

  resetLastPoint(): void {
    this.lastPoint = null;
  }
}
