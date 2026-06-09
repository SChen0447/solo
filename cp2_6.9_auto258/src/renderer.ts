export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private backBuffer: HTMLCanvasElement;
  private backCtx: CanvasRenderingContext2D;
  private gridCols: number;
  private gridRows: number;
  private cellSize: number;
  private colorCache: string[] = [];
  private colorCacheSteps: number = 256;

  constructor(canvas: HTMLCanvasElement, gridCols: number, gridRows: number, cellSize: number) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.backBuffer = document.createElement('canvas');
    const backCtx = this.backBuffer.getContext('2d');
    if (!backCtx) throw new Error('Back buffer 2D context not available');
    this.backCtx = backCtx;

    this.gridCols = gridCols;
    this.gridRows = gridRows;
    this.cellSize = cellSize;

    this.buildColorCache();
    this.resize();
  }

  private buildColorCache(): void {
    const bgColor: [number, number, number] = [13, 27, 42];
    const highlightHigh: [number, number, number] = [79, 195, 247];
    const highlightLow: [number, number, number] = [0, 188, 212];
    const shadowHigh: [number, number, number] = [21, 101, 192];
    const shadowLow: [number, number, number] = [13, 71, 161];

    this.colorCache = [];
    const half = this.colorCacheSteps / 2;

    for (let i = 0; i < this.colorCacheSteps; i++) {
      const normalized = (i - half) / half;
      const absH = Math.abs(normalized);
      const t = Math.min(1, absH);

      let r: number, g: number, b: number;

      if (absH < 0.001) {
        r = bgColor[0];
        g = bgColor[1];
        b = bgColor[2];
      } else if (normalized > 0) {
        const c1 = this.lerpColor(bgColor, highlightHigh, t);
        const c2 = this.lerpColor(highlightLow, highlightHigh, t);
        r = Math.round(c1[0] * 0.5 + c2[0] * 0.5);
        g = Math.round(c1[1] * 0.5 + c2[1] * 0.5);
        b = Math.round(c1[2] * 0.5 + c2[2] * 0.5);
      } else {
        const c1 = this.lerpColor(bgColor, shadowHigh, t);
        const c2 = this.lerpColor(shadowLow, shadowHigh, t);
        r = Math.round(c1[0] * 0.5 + c2[0] * 0.5);
        g = Math.round(c1[1] * 0.5 + c2[1] * 0.5);
        b = Math.round(c1[2] * 0.5 + c2[2] * 0.5);
      }

      this.colorCache.push(`rgb(${r},${g},${b})`);
    }
  }

  private lerpColor(color1: [number, number, number], color2: [number, number, number], t: number): [number, number, number] {
    return [
      color1[0] + (color2[0] - color1[0]) * t,
      color1[1] + (color2[1] - color1[1]) * t,
      color1[2] + (color2[2] - color1[2]) * t
    ];
  }

  resize(): void {
    const width = this.gridCols * this.cellSize;
    const height = this.gridRows * this.cellSize;

    this.canvas.width = width;
    this.canvas.height = height;
    this.backBuffer.width = width;
    this.backBuffer.height = height;
  }

  render(heightMap: Float32Array): void {
    const ctx = this.backCtx;
    const cs = this.cellSize;
    const cols = this.gridCols;
    const rows = this.gridRows;
    const half = this.colorCacheSteps / 2;

    ctx.fillStyle = '#0D1B2A';
    ctx.fillRect(0, 0, cols * cs, rows * cs);

    for (let row = 0; row < rows; row++) {
      const rowOffset = row * cols;
      const py = row * cs;

      for (let col = 0; col < cols; col++) {
        const h = heightMap[rowOffset + col];
        if (Math.abs(h) < 0.005) continue;

        const clamped = Math.max(-1, Math.min(1, h));
        const cacheIdx = Math.round(clamped * half + half);
        const safeIdx = Math.max(0, Math.min(this.colorCacheSteps - 1, cacheIdx));

        ctx.fillStyle = this.colorCache[safeIdx];
        ctx.fillRect(col * cs, py, cs, cs);
      }
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let col = 0; col <= cols; col++) {
      const x = col * cs + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rows * cs);
    }

    for (let row = 0; row <= rows; row++) {
      const y = row * cs + 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(cols * cs, y);
    }

    ctx.stroke();

    this.ctx.drawImage(this.backBuffer, 0, 0);
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
