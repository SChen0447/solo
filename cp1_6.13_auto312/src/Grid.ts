export type FeatherColor = 'red' | 'blue' | 'green' | 'purple';

export const FEATHER_COLORS: Record<FeatherColor, string> = {
  red: '#ff6b6b',
  blue: '#48dbfb',
  green: '#00b894',
  purple: '#a29bfe'
};

export interface Cell {
  row: number;
  col: number;
  x: number;
  y: number;
  size: number;
  erupting: boolean;
  flashTimer: number;
  flashVisible: boolean;
}

export class Grid {
  readonly rows: number = 7;
  readonly cols: number = 7;
  readonly cellSize: number = 40;
  cells: Cell[][] = [];
  offsetX: number = 0;
  offsetY: number = 0;
  centerX: number = 0;
  centerY: number = 0;

  private eruptionTimer: number = 0;
  private eruptionInterval: number = 5000;

  constructor() {
    this.initCells();
  }

  private initCells(): void {
    for (let r = 0; r < this.rows; r++) {
      this.cells[r] = [];
      for (let c = 0; c < this.cols; c++) {
        this.cells[r][c] = {
          row: r,
          col: c,
          x: 0,
          y: 0,
          size: this.cellSize,
          erupting: false,
          flashTimer: 0,
          flashVisible: false
        };
      }
    }
  }

  updatePosition(canvasWidth: number, canvasHeight: number, scale: number = 1): void {
    const gridWidth = this.cols * this.cellSize * scale;
    const gridHeight = this.rows * this.cellSize * scale;
    this.offsetX = (canvasWidth - gridWidth) / 2;
    this.offsetY = (canvasHeight - gridHeight) / 2;
    this.centerX = canvasWidth / 2;
    this.centerY = canvasHeight / 2;

    const scaledSize = this.cellSize * scale;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.cells[r][c].x = this.offsetX + c * scaledSize;
        this.cells[r][c].y = this.offsetY + r * scaledSize;
        this.cells[r][c].size = scaledSize;
      }
    }
  }

  update(deltaTime: number, eruptionInterval: number): void {
    this.eruptionInterval = eruptionInterval;
    this.eruptionTimer += deltaTime;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[r][c];
        if (cell.erupting) {
          cell.flashTimer += deltaTime;
          if (cell.flashTimer >= 100) {
            cell.flashVisible = !cell.flashVisible;
            cell.flashTimer = 0;
          }
        }
      }
    }

    if (this.eruptionTimer >= this.eruptionInterval) {
      this.eruptionTimer = 0;
      this.triggerRandomEruption();
    }
  }

  private triggerRandomEruption(): void {
    const r = Math.floor(Math.random() * this.rows);
    const c = Math.floor(Math.random() * this.cols);
    const cell = this.cells[r][c];
    cell.erupting = true;
    cell.flashTimer = 0;
    cell.flashVisible = true;

    setTimeout(() => {
      cell.erupting = false;
      cell.flashVisible = false;
    }, 500);
  }

  getCellAt(x: number, y: number): Cell | null {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[r][c];
        if (x >= cell.x && x < cell.x + cell.size &&
            y >= cell.y && y < cell.y + cell.size) {
          return cell;
        }
      }
    }
    return null;
  }

  getRandomFeatherColor(): FeatherColor {
    const colors: FeatherColor[] = ['red', 'blue', 'green', 'purple'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private getDistanceFromCenter(row: number, col: number): number {
    const centerRow = (this.rows - 1) / 2;
    const centerCol = (this.cols - 1) / 2;
    const dr = row - centerRow;
    const dc = col - centerCol;
    return Math.sqrt(dr * dr + dc * dc);
  }

  private interpolateColor(t: number): string {
    const r1 = 254, g1 = 202, b1 = 87;
    const r2 = 162, g2 = 155, b2 = 254;
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const maxDist = Math.sqrt(18);

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[r][c];
        const dist = this.getDistanceFromCenter(r, c);
        const t = dist / maxDist;
        const borderColor = this.interpolateColor(t);

        if (cell.erupting && cell.flashVisible) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fillRect(cell.x, cell.y, cell.size, cell.size);
        }

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(cell.x, cell.y, cell.size, cell.size);
      }
    }
  }

  renderLightRails(ctx: CanvasRenderingContext2D, time: number, scale: number = 1): void {
    const colors = ['#ff6b6b', '#feca57', '#00b894', '#48dbfb', '#a29bfe', '#ff9ff3', '#54a0ff'];
    const cx = this.centerX;
    const cy = this.centerY;
    const maxLen = Math.max(ctx.canvas.width, ctx.canvas.height);

    for (let i = 0; i < 7; i++) {
      const angle = (Math.PI * 2 * i) / 7;
      const endX = cx + Math.cos(angle) * maxLen;
      const endY = cy + Math.sin(angle) * maxLen;

      ctx.strokeStyle = colors[i];
      ctx.lineWidth = 2 * scale;
      ctx.shadowColor = colors[i];
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      const dotProgress = (time % 2000) / 2000;
      const dotX = cx + (endX - cx) * dotProgress;
      const dotY = cy + (endY - cy) * dotProgress;

      ctx.fillStyle = colors[i];
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  renderBackground(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(0, 0, ctx.canvas.width, ctx.canvas.height);
    gradient.addColorStop(0, '#0b0e27');
    gradient.addColorStop(1, '#1f1042');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
}
