import { cloneDeep } from 'lodash';
import {
  EntityType,
  LevelEntity,
  LevelData,
  GRID_COLS,
  GRID_ROWS,
  CELL_SIZE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  COLORS
} from './types';

const MAX_HISTORY = 30;
const MAX_JUMP_GAP_CELLS = 3;

export class LevelEditor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private entities: LevelEntity[] = [];
  private selectedTool: EntityType | null = null;
  private historyStack: LevelData[] = [{ entities: [] }];
  private historyIndex = 0;
  private hoverGridX = -1;
  private hoverGridY = -1;
  private dirty = true;
  private onStatusChange?: (hasGap: boolean) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
  }

  setStatusCallback(cb: (hasGap: boolean) => void): void {
    this.onStatusChange = cb;
  }

  getEntities(): LevelEntity[] {
    return this.entities;
  }

  setSelectedTool(tool: EntityType | null): void {
    this.selectedTool = tool;
    this.dirty = true;
  }

  getSelectedTool(): EntityType | null {
    return this.selectedTool;
  }

  handleCanvasClick(canvasX: number, canvasY: number): void {
    const gridX = Math.floor(canvasX / CELL_SIZE);
    const gridY = Math.floor(canvasY / CELL_SIZE);
    if (gridX < 0 || gridX >= GRID_COLS || gridY < 0 || gridY >= GRID_ROWS) return;

    const existingIdx = this.entities.findIndex(
      e => e.gridX === gridX && e.gridY === gridY
    );

    if (existingIdx >= 0) {
      this.entities.splice(existingIdx, 1);
      this.pushHistory();
      this.dirty = true;
      this.checkGaps();
      return;
    }

    if (this.selectedTool) {
      this.entities.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: this.selectedTool,
        gridX,
        gridY
      });
      this.pushHistory();
      this.dirty = true;
      this.checkGaps();
    }
  }

  handleCanvasMove(canvasX: number, canvasY: number): void {
    const gridX = Math.floor(canvasX / CELL_SIZE);
    const gridY = Math.floor(canvasY / CELL_SIZE);
    if (gridX !== this.hoverGridX || gridY !== this.hoverGridY) {
      this.hoverGridX = gridX;
      this.hoverGridY = gridY;
      this.dirty = true;
    }
  }

  undo(): void {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.entities = cloneDeep(this.historyStack[this.historyIndex].entities);
      this.dirty = true;
      this.checkGaps();
    }
  }

  redo(): void {
    if (this.historyIndex < this.historyStack.length - 1) {
      this.historyIndex++;
      this.entities = cloneDeep(this.historyStack[this.historyIndex].entities);
      this.dirty = true;
      this.checkGaps();
    }
  }

  private pushHistory(): void {
    this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
    this.historyStack.push({ entities: cloneDeep(this.entities) });
    if (this.historyStack.length > MAX_HISTORY) {
      this.historyStack.shift();
    } else {
      this.historyIndex++;
    }
  }

  exportLevel(): LevelData {
    return { entities: cloneDeep(this.entities) };
  }

  importLevel(data: LevelData): void {
    if (!data || !Array.isArray(data.entities)) return;
    this.entities = cloneDeep(data.entities.filter(e =>
      e && typeof e.gridX === 'number' && typeof e.gridY === 'number' &&
      e.gridX >= 0 && e.gridX < GRID_COLS && e.gridY >= 0 && e.gridY < GRID_ROWS &&
      ['platform', 'enemy', 'spike', 'goal'].includes(e.type)
    ));
    this.pushHistory();
    this.dirty = true;
    this.checkGaps();
  }

  private checkGaps(): void {
    const platformRows = new Set<number>();
    this.entities.forEach(e => { if (e.type === 'platform') platformRows.add(e.gridY); });

    let hasUnpassable = false;
    for (const row of platformRows) {
      const platformsInRow = this.entities
        .filter(e => e.type === 'platform' && e.gridY === row)
        .map(e => e.gridX)
        .sort((a, b) => a - b);

      for (let i = 1; i < platformsInRow.length; i++) {
        const gap = platformsInRow[i] - platformsInRow[i - 1] - 1;
        if (gap > MAX_JUMP_GAP_CELLS) {
          hasUnpassable = true;
          break;
        }
      }
      if (hasUnpassable) break;
    }
    this.onStatusChange?.(hasUnpassable);
  }

  render(): void {
    if (!this.dirty) return;
    this.dirty = false;

    const ctx = this.ctx;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    for (let x = 0; x <= GRID_COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL_SIZE, 0);
      ctx.lineTo(x * CELL_SIZE, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= GRID_ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL_SIZE);
      ctx.lineTo(CANVAS_WIDTH, y * CELL_SIZE);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    this.entities.forEach(e => this.drawEntity(e));

    if (this.selectedTool && this.hoverGridX >= 0 && this.hoverGridX < GRID_COLS &&
        this.hoverGridY >= 0 && this.hoverGridY < GRID_ROWS) {
      const occupied = this.entities.some(
        e => e.gridX === this.hoverGridX && e.gridY === this.hoverGridY
      );
      if (!occupied) {
        ctx.save();
        ctx.globalAlpha = 0.4;
        this.drawEntityShape(this.selectedTool, this.hoverGridX, this.hoverGridY);
        ctx.restore();
      }
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        this.hoverGridX * CELL_SIZE + 1,
        this.hoverGridY * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2
      );
    }
  }

  private drawEntity(entity: LevelEntity): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
    this.drawEntityShape(entity.type, entity.gridX, entity.gridY);
    ctx.restore();
  }

  drawEntityShape(type: EntityType, gridX: number, gridY: number): void {
    const ctx = this.ctx;
    const cx = gridX * CELL_SIZE + CELL_SIZE / 2;
    const cy = gridY * CELL_SIZE + CELL_SIZE / 2;

    switch (type) {
      case 'platform':
        ctx.fillStyle = COLORS.platform;
        ctx.fillRect(gridX * CELL_SIZE + 2, gridY * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(gridX * CELL_SIZE + 2, gridY * CELL_SIZE + 2, CELL_SIZE - 4, 4);
        break;
      case 'enemy':
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = COLORS.enemy;
        ctx.fillRect(-14, -14, 28, 28);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-8, -6, 4, 4);
        ctx.fillRect(4, -6, 4, 4);
        ctx.restore();
        break;
      case 'spike':
        ctx.fillStyle = COLORS.spike;
        ctx.beginPath();
        ctx.moveTo(gridX * CELL_SIZE + 4, gridY * CELL_SIZE + CELL_SIZE - 4);
        ctx.lineTo(cx, gridY * CELL_SIZE + 4);
        ctx.lineTo(gridX * CELL_SIZE + CELL_SIZE - 4, gridY * CELL_SIZE + CELL_SIZE - 4);
        ctx.closePath();
        ctx.fill();
        break;
      case 'goal':
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(cx - 2, gridY * CELL_SIZE + 4, 3, CELL_SIZE - 8);
        ctx.fillStyle = COLORS.goal;
        ctx.beginPath();
        ctx.moveTo(cx + 1, gridY * CELL_SIZE + 4);
        ctx.lineTo(cx + 16, gridY * CELL_SIZE + 10);
        ctx.lineTo(cx + 1, gridY * CELL_SIZE + 16);
        ctx.closePath();
        ctx.fill();
        break;
    }
  }

  drawEntityIcon(iconCanvas: HTMLCanvasElement, type: EntityType): void {
    const ctx = iconCanvas.getContext('2d');
    if (!ctx) return;
    const w = iconCanvas.width;
    const h = iconCanvas.height;
    ctx.clearRect(0, 0, w, h);

    switch (type) {
      case 'platform':
        ctx.fillStyle = COLORS.platform;
        ctx.fillRect(2, 8, w - 4, h - 16);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(2, 8, w - 4, 3);
        break;
      case 'enemy':
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = COLORS.enemy;
        ctx.fillRect(-9, -9, 18, 18);
        ctx.fillStyle = '#fff';
        ctx.fillRect(-5, -4, 3, 3);
        ctx.fillRect(2, -4, 3, 3);
        ctx.restore();
        break;
      case 'spike':
        ctx.fillStyle = COLORS.spike;
        ctx.beginPath();
        ctx.moveTo(3, h - 3);
        ctx.lineTo(w / 2, 3);
        ctx.lineTo(w - 3, h - 3);
        ctx.closePath();
        ctx.fill();
        break;
      case 'goal':
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(w / 2 - 1, 3, 2, h - 6);
        ctx.fillStyle = COLORS.goal;
        ctx.beginPath();
        ctx.moveTo(w / 2 + 1, 3);
        ctx.lineTo(w - 3, 8);
        ctx.lineTo(w / 2 + 1, 13);
        ctx.closePath();
        ctx.fill();
        break;
    }
  }

  forceDirty(): void {
    this.dirty = true;
  }
}
