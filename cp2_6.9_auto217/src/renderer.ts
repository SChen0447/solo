import { Sandpile, Cell } from './sandpile';

const HEIGHT_COLORS: Record<number, string> = {
  0: '#000000',
  1: '#1A237E',
  2: '#00BCD4',
  3: '#FFC107'
};

const COLOR_HEIGHT_4 = '#F44336';
const HIGHLIGHT_COLOR = '#FFD700';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sandpile: Sandpile;
  private cellSize: number;
  private highlightCells: Map<string, number>;
  private hoverCell: Cell | null;
  private currentAvalancheSize: number;

  constructor(canvas: HTMLCanvasElement, sandpile: Sandpile, cellSize: number = 50) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;
    this.sandpile = sandpile;
    this.cellSize = cellSize;
    this.highlightCells = new Map();
    this.hoverCell = null;
    this.currentAvalancheSize = 0;

    this.resize();
  }

  public resize(): void {
    const width = this.sandpile.size * this.cellSize;
    const height = this.sandpile.size * this.cellSize;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  public setCellSize(size: number): void {
    this.cellSize = size;
    this.resize();
  }

  public setHoverCell(cell: Cell | null): void {
    this.hoverCell = cell;
  }

  public getHoverCell(): Cell | null {
    return this.hoverCell;
  }

  public addHighlightCells(cells: Cell[]): void {
    const now = performance.now();
    for (const c of cells) {
      this.highlightCells.set(`${c.x},${c.y}`, now);
    }
  }

  public clearHighlights(): void {
    this.highlightCells.clear();
  }

  public setAvalancheSize(size: number): void {
    this.currentAvalancheSize = size;
  }

  public getCellFromPosition(clientX: number, clientY: number): Cell | null {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = Math.floor((clientX - rect.left) * scaleX / this.cellSize);
    const y = Math.floor((clientY - rect.top) * scaleY / this.cellSize);

    if (x >= 0 && x < this.sandpile.size && y >= 0 && y < this.sandpile.size) {
      return { x, y };
    }
    return null;
  }

  private getHeightColor(height: number): string {
    if (height <= 0) return HEIGHT_COLORS[0];
    if (height >= 4) return COLOR_HEIGHT_4;
    return HEIGHT_COLORS[height];
  }

  public render(): void {
    const now = performance.now();
    const highlightDuration = 200;

    for (const [key, startTime] of this.highlightCells.entries()) {
      if (now - startTime > highlightDuration) {
        this.highlightCells.delete(key);
      }
    }

    const ctx = this.ctx;
    const grid = this.sandpile.getGrid();
    const size = this.sandpile.size;
    const cs = this.cellSize;

    ctx.fillStyle = '#2D2D2D';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const key = `${x},${y}`;
        const isHighlighted = this.highlightCells.has(key);
        const height = grid[y][x];

        if (isHighlighted) {
          ctx.fillStyle = HIGHLIGHT_COLOR;
        } else {
          ctx.fillStyle = this.getHeightColor(height);
        }
        ctx.fillRect(x * cs, y * cs, cs, cs);
      }
    }

    ctx.strokeStyle = 'rgba(68, 68, 68, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= size; x++) {
      ctx.moveTo(x * cs + 0.5, 0);
      ctx.lineTo(x * cs + 0.5, size * cs);
    }
    for (let y = 0; y <= size; y++) {
      ctx.moveTo(0, y * cs + 0.5);
      ctx.lineTo(size * cs, y * cs + 0.5);
    }
    ctx.stroke();

    if (this.hoverCell) {
      const { x, y } = this.hoverCell;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.strokeRect(x * cs + 1, y * cs + 1, cs - 2, cs - 2);
      ctx.setLineDash([]);
    }

    this.renderAvalancheCounter();
  }

  private renderAvalancheCounter(): void {
    const ctx = this.ctx;
    const text = `崩塌格子数: ${this.currentAvalancheSize}`;
    const fontSize = 14;

    ctx.font = `${fontSize}px 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(text, 10, 10);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 10, 10);
  }

  public updateHoverInfo(hoverInfoEl: HTMLElement): void {
    if (!this.hoverCell) {
      hoverInfoEl.classList.add('hidden');
      return;
    }

    const { x, y } = this.hoverCell;
    const height = this.sandpile.getHeight(x, y);

    hoverInfoEl.textContent = `坐标: (${x}, ${y})  高度: ${height}`;
    hoverInfoEl.classList.remove('hidden');

    const rect = this.canvas.getBoundingClientRect();
    const containerRect = (hoverInfoEl.parentElement as HTMLElement).getBoundingClientRect();
    const cs = rect.width / this.sandpile.size;

    const left = (x + 1) * cs + (rect.left - containerRect.left);
    const top = y * cs + (rect.top - containerRect.top);

    hoverInfoEl.style.left = `${left}px`;
    hoverInfoEl.style.top = `${top}px`;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
