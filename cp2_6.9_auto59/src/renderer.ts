import { Grid, Cell, GRID_SIZE, MAX_HEIGHT, INITIAL_TEMP, SOLIDIFY_TEMP } from './grid';

const TERRAIN_LOW = { r: 0x2D, g: 0x5A, b: 0x27 };
const TERRAIN_HIGH = { r: 0x8B, g: 0x5A, b: 0x2B };

const LAVA_HOT = { r: 0xFF, g: 0x69, b: 0x00 };
const LAVA_COOL = { r: 0x8B, g: 0x00, b: 0x00 };

const SOLID_LOW = { r: 0x2F, g: 0x2F, b: 0x2F };
const SOLID_HIGH = { r: 0x1A, g: 0x0A, b: 0x2E };

const VENT_COLOR = { r: 0xFF, g: 0x45, b: 0x00 };

function lerpColor(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }, t: number): string {
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r},${g},${bl})`;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private grid: Grid;
  private cellSize: number = 10;

  private scale: number = 1;
  private targetScale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private targetOffsetX: number = 0;
  private targetOffsetY: number = 0;

  private MIN_SCALE = 0.5;
  private MAX_SCALE = 3;

  constructor(canvas: HTMLCanvasElement, grid: Grid) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.grid = grid;
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.computeOptimalCellSize();
  }

  private computeOptimalCellSize(): void {
    const maxWidth = this.canvas.width - 40;
    const maxHeight = this.canvas.height - 40;
    const sizeByWidth = Math.floor(maxWidth / GRID_SIZE);
    const sizeByHeight = Math.floor(maxHeight / GRID_SIZE);
    this.cellSize = Math.max(4, Math.min(sizeByWidth, sizeByHeight, 16));
  }

  public getGridCellAt(clientX: number, clientY: number): { x: number; y: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    const totalSize = this.cellSize * GRID_SIZE;
    const originX = centerX + this.offsetX - (totalSize * this.scale) / 2;
    const originY = centerY + this.offsetY - (totalSize * this.scale) / 2;

    const gridX = Math.floor((canvasX - originX) / (this.cellSize * this.scale));
    const gridY = Math.floor((canvasY - originY) / (this.cellSize * this.scale));

    if (gridX >= 0 && gridX < GRID_SIZE && gridY >= 0 && gridY < GRID_SIZE) {
      return { x: gridX, y: gridY };
    }
    return null;
  }

  public zoomAt(clientX: number, clientY: number, delta: number): void {
    const zoomFactor = delta < 0 ? 1.1 : 0.9;
    const newScale = Math.max(this.MIN_SCALE, Math.min(this.MAX_SCALE, this.targetScale * zoomFactor));

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    const totalSize = this.cellSize * GRID_SIZE;
    const originX = centerX + this.targetOffsetX - (totalSize * this.targetScale) / 2;
    const originY = centerY + this.targetOffsetY - (totalSize * this.targetScale) / 2;

    const gridRelativeX = (mouseX - originX) / (this.cellSize * this.targetScale);
    const gridRelativeY = (mouseY - originY) / (this.cellSize * this.targetScale);

    const newOriginX = mouseX - gridRelativeX * this.cellSize * newScale;
    const newOriginY = mouseY - gridRelativeY * this.cellSize * newScale;

    this.targetOffsetX = newOriginX + (totalSize * newScale) / 2 - centerX;
    this.targetOffsetY = newOriginY + (totalSize * newScale) / 2 - centerY;
    this.targetScale = newScale;
  }

  public pan(dx: number, dy: number): void {
    this.targetOffsetX += dx;
    this.targetOffsetY += dy;
  }

  public resetView(): void {
    this.targetScale = 1;
    this.targetOffsetX = 0;
    this.targetOffsetY = 0;
  }

  public render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.scale += (this.targetScale - this.scale) * 0.15;
    this.offsetX += (this.targetOffsetX - this.offsetX) * 0.15;
    this.offsetY += (this.targetOffsetY - this.offsetY) * 0.15;

    ctx.fillStyle = '#0A0A14';
    ctx.fillRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2;
    const totalSize = this.cellSize * GRID_SIZE;
    const originX = centerX + this.offsetX - (totalSize * this.scale) / 2;
    const originY = centerY + this.offsetY - (totalSize * this.scale) / 2;
    const cs = this.cellSize * this.scale;

    ctx.save();
    ctx.beginPath();
    ctx.rect(originX, originY, totalSize * this.scale, totalSize * this.scale);
    ctx.clip();

    this.drawTerrain(ctx, originX, originY, cs);
    this.drawLavaAndSolid(ctx, originX, originY, cs);
    this.drawVents(ctx, originX, originY, cs);
    this.drawGridLines(ctx, originX, originY, cs);

    ctx.restore();

    ctx.strokeStyle = '#E94560';
    ctx.lineWidth = 2;
    ctx.strokeRect(originX, originY, totalSize * this.scale, totalSize * this.scale);
  }

  private drawTerrain(ctx: CanvasRenderingContext2D, originX: number, originY: number, cs: number): void {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = this.grid.getCell(x, y);
        if (!cell) continue;
        if (cell.hasLava || cell.isSolidified) continue;

        const t = Math.min(1, Math.max(0, cell.height / MAX_HEIGHT));
        ctx.fillStyle = lerpColor(TERRAIN_LOW, TERRAIN_HIGH, t);
        ctx.fillRect(originX + x * cs, originY + y * cs, cs + 0.5, cs + 0.5);
      }
    }
  }

  private drawLavaAndSolid(ctx: CanvasRenderingContext2D, originX: number, originY: number, cs: number): void {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = this.grid.getCell(x, y);
        if (!cell) continue;

        if (cell.isSolidified) {
          const t = Math.min(1, Math.max(0, (cell.height - MAX_HEIGHT) / 3));
          ctx.fillStyle = lerpColor(SOLID_LOW, SOLID_HIGH, t);
          ctx.fillRect(originX + x * cs, originY + y * cs, cs + 0.5, cs + 0.5);
        } else if (cell.hasLava) {
          const tempRange = INITIAL_TEMP - SOLIDIFY_TEMP;
          const t = Math.min(1, Math.max(0, (cell.temperature - SOLIDIFY_TEMP) / tempRange));
          ctx.fillStyle = lerpColor(LAVA_COOL, LAVA_HOT, t);
          ctx.fillRect(originX + x * cs, originY + y * cs, cs + 0.5, cs + 0.5);

          if (t > 0.5) {
            const glowAlpha = (t - 0.5) * 0.6;
            ctx.fillStyle = `rgba(255, 200, 0, ${glowAlpha})`;
            ctx.fillRect(originX + x * cs, originY + y * cs, cs + 0.5, cs + 0.5);
          }
        }
      }
    }
  }

  private drawVents(ctx: CanvasRenderingContext2D, originX: number, originY: number, cs: number): void {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = this.grid.getCell(x, y);
        if (!cell || !cell.isVent) continue;

        const cx = originX + x * cs + cs / 2;
        const cy = originY + y * cs + cs / 2;
        const pulse = 0.8 + 0.2 * Math.sin(Date.now() / 150);

        ctx.beginPath();
        ctx.arc(cx, cy, cs * 0.5 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${VENT_COLOR.r},${VENT_COLOR.g},${VENT_COLOR.b})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, cs * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#FFD700';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, cs * 0.6 * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 69, 0, ${0.5 * pulse})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  private drawGridLines(ctx: CanvasRenderingContext2D, originX: number, originY: number, cs: number): void {
    if (cs < 3) return;

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 0.5;

    const totalSize = GRID_SIZE * cs;
    ctx.beginPath();
    for (let i = 0; i <= GRID_SIZE; i++) {
      const p = i * cs;
      ctx.moveTo(originX + p, originY);
      ctx.lineTo(originX + p, originY + totalSize);
      ctx.moveTo(originX, originY + p);
      ctx.lineTo(originX + totalSize, originY + p);
    }
    ctx.stroke();
  }
}
