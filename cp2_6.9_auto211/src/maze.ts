export const GRID_SIZE = 40;
export const GRID_COLS = 30;
export const GRID_ROWS = 30;
export const CANVAS_PADDING = 20;

export interface GridPoint {
  col: number;
  row: number;
  x: number;
  y: number;
}

export interface MazeConfig {
  cols: number;
  rows: number;
  gridSize: number;
  padding: number;
  powerSource: GridPoint;
  bulb: GridPoint;
}

export class Maze {
  private config: MazeConfig;
  private bgCanvas: HTMLCanvasElement | null = null;

  constructor() {
    this.config = {
      cols: GRID_COLS,
      rows: GRID_ROWS,
      gridSize: GRID_SIZE,
      padding: CANVAS_PADDING,
      powerSource: this.gridToPixel(0, 0),
      bulb: this.gridToPixel(Math.floor(GRID_COLS / 2), Math.floor(GRID_ROWS / 2)),
    };
  }

  getConfig(): MazeConfig {
    return this.config;
  }

  getWidth(): number {
    return this.config.cols * this.config.gridSize + this.config.padding * 2;
  }

  getHeight(): number {
    return this.config.rows * this.config.gridSize + this.config.padding * 2;
  }

  gridToPixel(col: number, row: number): GridPoint {
    return {
      col,
      row,
      x: this.config.padding + col * this.config.gridSize + this.config.gridSize / 2,
      y: this.config.padding + row * this.config.gridSize + this.config.gridSize / 2,
    };
  }

  pixelToGrid(px: number, py: number): GridPoint {
    const col = Math.round((px - this.config.padding - this.config.gridSize / 2) / this.config.gridSize);
    const row = Math.round((py - this.config.padding - this.config.gridSize / 2) / this.config.gridSize);
    const clampedCol = Math.max(0, Math.min(this.config.cols - 1, col));
    const clampedRow = Math.max(0, Math.min(this.config.rows - 1, row));
    return this.gridToPixel(clampedCol, clampedRow);
  }

  snapToGrid(px: number, py: number): GridPoint {
    return this.pixelToGrid(px, py);
  }

  isPowerPoint(point: GridPoint): boolean {
    return point.col === this.config.powerSource.col && point.row === this.config.powerSource.row;
  }

  isBulbPoint(point: GridPoint): boolean {
    return point.col === this.config.bulb.col && point.row === this.config.bulb.row;
  }

  private createBackgroundCache(): void {
    this.bgCanvas = document.createElement('canvas');
    this.bgCanvas.width = this.getWidth();
    this.bgCanvas.height = this.getHeight();
    const ctx = this.bgCanvas.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createRadialGradient(
      this.getWidth() / 2,
      this.getHeight() / 2,
      0,
      this.getWidth() / 2,
      this.getHeight() / 2,
      Math.max(this.getWidth(), this.getHeight()) * 0.7
    );
    gradient.addColorStop(0, '#1A1A2E');
    gradient.addColorStop(1, '#0D1117');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.getWidth(), this.getHeight());

    ctx.strokeStyle = 'rgba(31, 41, 55, 0.6)';
    ctx.lineWidth = 1;

    for (let c = 0; c <= this.config.cols; c++) {
      const x = this.config.padding + c * this.config.gridSize;
      ctx.beginPath();
      ctx.moveTo(x, this.config.padding);
      ctx.lineTo(x, this.config.padding + this.config.rows * this.config.gridSize);
      ctx.stroke();
    }

    for (let r = 0; r <= this.config.rows; r++) {
      const y = this.config.padding + r * this.config.gridSize;
      ctx.beginPath();
      ctx.moveTo(this.config.padding, y);
      ctx.lineTo(this.config.padding + this.config.cols * this.config.gridSize, y);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(31, 41, 55, 0.4)';
    for (let c = 0; c < this.config.cols; c++) {
      for (let r = 0; r < this.config.rows; r++) {
        const pt = this.gridToPixel(c, r);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  renderBackground(ctx: CanvasRenderingContext2D): void {
    if (!this.bgCanvas) {
      this.createBackgroundCache();
    }
    if (this.bgCanvas) {
      ctx.drawImage(this.bgCanvas, 0, 0);
    }
  }

  renderPowerSource(ctx: CanvasRenderingContext2D): void {
    const pt = this.config.powerSource;
    const radius = 18;

    ctx.save();
    const glow = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius * 2);
    glow.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
    glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, radius * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1A1A2E';
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+5V', pt.x, pt.y);
    ctx.restore();
  }

  renderBulb(ctx: CanvasRenderingContext2D, isLit: boolean, glowRadius: number): void {
    const pt = this.config.bulb;
    const baseRadius = 22;

    ctx.save();

    if (isLit && glowRadius > 0) {
      const glow = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, glowRadius);
      glow.addColorStop(0, 'rgba(255, 215, 0, 0.7)');
      glow.addColorStop(0.5, 'rgba(255, 215, 0, 0.25)');
      glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    const bulbColor = isLit ? '#FFD700' : '#555555';
    const bulbInner = isLit ? '#FFFACD' : '#6B6B6B';

    ctx.fillStyle = bulbColor;
    ctx.strokeStyle = isLit ? '#B8860B' : '#3A3A3A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, baseRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = bulbInner;
    ctx.beginPath();
    ctx.arc(pt.x - 5, pt.y - 5, baseRadius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    if (isLit) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.8;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const r1 = baseRadius + 3;
        const r2 = baseRadius + 8 + Math.sin(Date.now() / 200 + i) * 2;
        ctx.beginPath();
        ctx.moveTo(pt.x + Math.cos(angle) * r1, pt.y + Math.sin(angle) * r1);
        ctx.lineTo(pt.x + Math.cos(angle) * r2, pt.y + Math.sin(angle) * r2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = isLit ? '#8B7500' : '#3A3A3A';
    ctx.fillRect(pt.x - 10, pt.y + baseRadius - 2, 20, 6);
    ctx.fillRect(pt.x - 8, pt.y + baseRadius + 4, 16, 3);

    ctx.restore();
  }

  renderPulse(ctx: CanvasRenderingContext2D, opacity: number): void {
    if (opacity <= 0) return;
    const pt = this.config.bulb;
    const maxRadius = Math.max(this.getWidth(), this.getHeight());
    ctx.save();
    const gradient = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, maxRadius);
    gradient.addColorStop(0, `rgba(255, 215, 0, ${opacity * 0.3})`);
    gradient.addColorStop(1, `rgba(255, 215, 0, 0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.getWidth(), this.getHeight());
    ctx.restore();
  }
}
