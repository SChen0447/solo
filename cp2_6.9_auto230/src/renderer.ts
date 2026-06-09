import {
  PlantType,
  Cell,
  GRID_COLS,
  GRID_ROWS,
  CELL_SIZE,
  SimulationState,
} from './simulation';

const GRID_BG = '#3A5F40';
const GRID_LINE = 'rgba(45, 74, 51, 0.5)';
const WITHER_COLOR = '#FF4444';
const SELECTION_COLOR = 'rgba(74, 144, 217, 0.5)';
const SELECTION_BORDER = 'rgba(74, 144, 217, 0.9)';

const COLORS: Record<string, string> = {
  grass: '#8BC34A',
  grass_seed: '#8BC34A',
  shrub: '#4CAF50',
  shrub_seed: '#4CAF50',
  tree: '#2E7D32',
  tree_seed: '#2E7D32',
  tree_trunk: '#5D4037',
};

export interface Ripple {
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

export interface Selection {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export class EcosystemRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gridCanvas: HTMLCanvasElement;
  private gridCtx: CanvasRenderingContext2D;
  private ripples: Ripple[];
  private selection: Selection | null;
  private width: number;
  private height: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;

    this.gridCanvas = document.createElement('canvas');
    const gctx = this.gridCanvas.getContext('2d');
    if (!gctx) throw new Error('Failed to get offscreen 2D context');
    this.gridCtx = gctx;

    this.ripples = [];
    this.selection = null;
    this.width = GRID_COLS * CELL_SIZE;
    this.height = GRID_ROWS * CELL_SIZE;

    this.resize();
    this.cacheGrid();
  }

  resize(): void {
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.cacheGrid();
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  private cacheGrid(): void {
    this.gridCanvas.width = this.width;
    this.gridCanvas.height = this.height;
    this.gridCtx.fillStyle = GRID_BG;
    this.gridCtx.fillRect(0, 0, this.width, this.height);
    this.gridCtx.strokeStyle = GRID_LINE;
    this.gridCtx.lineWidth = 1;
    this.gridCtx.beginPath();
    for (let x = 0; x <= GRID_COLS; x++) {
      const px = x * CELL_SIZE + 0.5;
      this.gridCtx.moveTo(px, 0);
      this.gridCtx.lineTo(px, this.height);
    }
    for (let y = 0; y <= GRID_ROWS; y++) {
      const py = y * CELL_SIZE + 0.5;
      this.gridCtx.moveTo(0, py);
      this.gridCtx.lineTo(this.width, py);
    }
    this.gridCtx.stroke();
  }

  addRipple(gridX: number, gridY: number): void {
    this.ripples.push({
      x: gridX * CELL_SIZE + CELL_SIZE / 2,
      y: gridY * CELL_SIZE + CELL_SIZE / 2,
      startTime: performance.now(),
      duration: 500,
    });
  }

  setSelection(sel: Selection | null): void {
    this.selection = sel;
  }

  getSelection(): Selection | null {
    return this.selection;
  }

  screenToGrid(screenX: number, screenY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((screenX - rect.left) / CELL_SIZE);
    const y = Math.floor((screenY - rect.top) / CELL_SIZE);
    return { x, y };
  }

  render(state: SimulationState): void {
    const ctx = this.ctx;
    ctx.drawImage(this.gridCanvas, 0, 0);
    this.drawPlants(state.grid);
    this.drawRipples();
    this.drawSelection();
  }

  private drawPlants(grid: Cell[][]): void {
    const ctx = this.ctx;
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const cell = grid[y][x];
        if (cell.withering) {
          ctx.fillStyle = WITHER_COLOR;
          ctx.globalAlpha = 0.3 + 0.4 * Math.random();
          ctx.fillRect(
            x * CELL_SIZE + 2,
            y * CELL_SIZE + 2,
            CELL_SIZE - 4,
            CELL_SIZE - 4
          );
          ctx.globalAlpha = 1;
        }
        this.drawPlant(x, y, cell.plantType);
      }
    }
  }

  private drawPlant(gx: number, gy: number, type: PlantType): void {
    const ctx = this.ctx;
    const cx = gx * CELL_SIZE + CELL_SIZE / 2;
    const cy = gy * CELL_SIZE + CELL_SIZE / 2;

    switch (type) {
      case PlantType.GRASS_SEED:
      case PlantType.SHRUB_SEED:
      case PlantType.TREE_SEED:
        ctx.fillStyle = COLORS[type];
        ctx.beginPath();
        ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
        ctx.fill();
        break;

      case PlantType.GRASS:
        ctx.fillStyle = COLORS.grass;
        ctx.fillRect(cx - 2, cy - 2, 4, 4);
        break;

      case PlantType.SHRUB:
        ctx.fillStyle = COLORS.shrub;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        break;

      case PlantType.TREE:
        ctx.fillStyle = COLORS.tree_trunk;
        ctx.fillRect(cx - 1, cy + 1, 2, 7);
        ctx.fillStyle = COLORS.tree;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 8);
        ctx.lineTo(cx - 5, cy + 2);
        ctx.lineTo(cx + 5, cy + 2);
        ctx.closePath();
        ctx.fill();
        break;

      default:
        break;
    }
  }

  private drawRipples(): void {
    const ctx = this.ctx;
    const now = performance.now();
    this.ripples = this.ripples.filter((r) => {
      const elapsed = now - r.startTime;
      if (elapsed >= r.duration) return false;
      const t = elapsed / r.duration;
      const radius = 4 + t * 16;
      const alpha = 1 - t;
      ctx.strokeStyle = `rgba(168, 230, 163, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      return true;
    });
  }

  private drawSelection(): void {
    if (!this.selection) return;
    const ctx = this.ctx;
    const { startX, startY, endX, endY } = this.selection;
    const xs = Math.min(startX, endX);
    const xe = Math.max(startX, endX);
    const ys = Math.min(startY, endY);
    const ye = Math.max(startY, endY);
    const px = xs * CELL_SIZE;
    const py = ys * CELL_SIZE;
    const pw = (xe - xs + 1) * CELL_SIZE;
    const ph = (ye - ys + 1) * CELL_SIZE;

    ctx.fillStyle = SELECTION_COLOR;
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = SELECTION_BORDER;
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
  }

  exportCanvas(): string {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.width;
    exportCanvas.height = this.height;
    const ectx = exportCanvas.getContext('2d');
    if (!ectx) return '';
    ectx.drawImage(this.canvas, 0, 0);
    return exportCanvas.toDataURL('image/png');
  }
}
