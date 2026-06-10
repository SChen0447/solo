import {
  GRID_SIZE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GRID_COLS,
  GRID_ROWS,
  Tower,
  TowerType,
  TOWER_CONFIGS,
  gridToPixel
} from './layoutManager';
import { PathPoint } from './pathSimulator';

const BG_COLOR = '#2d3436';
const GRID_LINE_COLOR = '#636e72';
const PATH_CELL_COLOR = '#add8e6';
const PATH_LINE_COLOR = '#3498db';
const RANGE_ALPHA = 0.3;
const PLACE_ANIM_DURATION = 200;
const PULSE_PERIOD = 1500;

interface DragState {
  towerId: string;
  mouseX: number;
  mouseY: number;
  targetGridX: number | null;
  targetGridY: number | null;
  towerType: TowerType;
}

export interface RenderState {
  towers: Tower[];
  selectedTowerId: string | null;
  currentTime: number;
  path: PathPoint[] | null;
  pathStartCell: { gridX: number; gridY: number } | null;
  pathEndCell: { gridX: number; gridY: number } | null;
  isSelectingPathStart: boolean;
  isSelectingPathEnd: boolean;
  dragState: DragState | null;
  hoverCell: { gridX: number; gridY: number } | null;
  selectedTowerType: TowerType;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private bgCanvas: HTMLCanvasElement;
  private bgCtx: CanvasRenderingContext2D;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;

    this.bgCanvas = document.createElement('canvas');
    this.bgCanvas.width = CANVAS_WIDTH;
    this.bgCanvas.height = CANVAS_HEIGHT;
    const bgCtx = this.bgCanvas.getContext('2d');
    if (!bgCtx) throw new Error('Failed to get bg canvas context');
    this.bgCtx = bgCtx;

    this.renderBackground();
  }

  private renderBackground(): void {
    this.bgCtx.fillStyle = BG_COLOR;
    this.bgCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.bgCtx.strokeStyle = GRID_LINE_COLOR;
    this.bgCtx.lineWidth = 1;

    for (let x = 0; x <= GRID_COLS; x++) {
      this.bgCtx.beginPath();
      this.bgCtx.moveTo(x * GRID_SIZE + 0.5, 0);
      this.bgCtx.lineTo(x * GRID_SIZE + 0.5, CANVAS_HEIGHT);
      this.bgCtx.stroke();
    }

    for (let y = 0; y <= GRID_ROWS; y++) {
      this.bgCtx.beginPath();
      this.bgCtx.moveTo(0, y * GRID_SIZE + 0.5);
      this.bgCtx.lineTo(CANVAS_WIDTH, y * GRID_SIZE + 0.5);
      this.bgCtx.stroke();
    }
  }

  render(state: RenderState): void {
    this.ctx.drawImage(this.bgCanvas, 0, 0);

    if (state.hoverCell && !state.dragState) {
      this.drawHoverCell(state.hoverCell.gridX, state.hoverCell.gridY);
    }

    if (state.path) {
      this.drawPathCells(state.path);
    }

    if (state.pathStartCell) {
      this.drawPathEndpoint(state.pathStartCell.gridX, state.pathStartCell.gridY, '#27ae60', '起');
    }
    if (state.pathEndCell) {
      this.drawPathEndpoint(state.pathEndCell.gridX, state.pathEndCell.gridY, '#e74c3c', '终');
    }

    this.drawAttackRanges(state.towers, state.currentTime);

    if (state.path && state.path.length > 1) {
      this.drawPathLine(state.path);
    }

    for (const tower of state.towers) {
      if (state.dragState && state.dragState.towerId === tower.id) {
        continue;
      }
      this.drawTower(tower, state.currentTime, tower.id === state.selectedTowerId);
    }

    if (state.dragState) {
      this.drawDragPreview(state.dragState, state.currentTime);
    }
  }

  private drawHoverCell(gridX: number, gridY: number): void {
    if (gridX < 0 || gridX >= GRID_COLS || gridY < 0 || gridY >= GRID_ROWS) return;
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    this.ctx.fillRect(gridX * GRID_SIZE, gridY * GRID_SIZE, GRID_SIZE, GRID_SIZE);
  }

  private drawPathCells(path: PathPoint[]): void {
    this.ctx.fillStyle = PATH_CELL_COLOR;
    for (const point of path) {
      this.ctx.globalAlpha = 0.3;
      this.ctx.fillRect(
        point.gridX * GRID_SIZE + 2,
        point.gridY * GRID_SIZE + 2,
        GRID_SIZE - 4,
        GRID_SIZE - 4
      );
    }
    this.ctx.globalAlpha = 1;
  }

  private drawPathEndpoint(gridX: number, gridY: number, color: string, label: string): void {
    const { x, y } = gridToPixel(gridX, gridY);
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 14, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 12px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(label, x, y);
  }

  private drawPathLine(path: PathPoint[]): void {
    if (path.length < 2) return;

    this.ctx.save();
    this.ctx.strokeStyle = PATH_LINE_COLOR;
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.lineDashOffset = 0;

    this.ctx.beginPath();
    this.ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      this.ctx.lineTo(path[i].x, path[i].y);
    }
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawAttackRanges(towers: Tower[], _currentTime: number): void {
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';

    for (const tower of towers) {
      const config = TOWER_CONFIGS[tower.type];
      const { x, y } = gridToPixel(tower.gridX, tower.gridY);

      this.ctx.globalAlpha = RANGE_ALPHA;
      this.ctx.fillStyle = config.color;
      this.ctx.beginPath();
      this.ctx.arc(x, y, config.range, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : null;
  }

  private drawTower(tower: Tower, currentTime: number, isSelected: boolean): void {
    const config = TOWER_CONFIGS[tower.type];
    const { x, y } = gridToPixel(tower.gridX, tower.gridY);

    const elapsed = currentTime - tower.placedAt;
    const scaleProgress = Math.min(elapsed / PLACE_ANIM_DURATION, 1);
    const scale = 0.8 + 0.2 * (1 - Math.pow(1 - scaleProgress, 3));
    const size = 14 * scale;

    if (isSelected) {
      const pulsePhase = (currentTime % PULSE_PERIOD) / PULSE_PERIOD;
      const pulseScale = 1 + 0.15 * Math.sin(pulsePhase * Math.PI * 2);
      const rgb = this.hexToRgb(config.color);
      if (rgb) {
        const glowAlpha = 0.3 + 0.3 * Math.sin(pulsePhase * Math.PI * 2);
        this.ctx.save();
        this.ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${glowAlpha})`;
        this.ctx.shadowBlur = 20 * pulseScale;
      }
    }

    this.ctx.fillStyle = config.color;

    if (tower.type === 'machinegun') {
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fill();
    } else if (tower.type === 'cannon') {
      this.ctx.fillRect(x - size, y - size, size * 2, size * 2);
    } else if (tower.type === 'laser') {
      this.ctx.beginPath();
      this.ctx.moveTo(x, y - size);
      this.ctx.lineTo(x + size, y);
      this.ctx.lineTo(x, y + size);
      this.ctx.lineTo(x - size, y);
      this.ctx.closePath();
      this.ctx.fill();
    }

    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;

    if (tower.type === 'machinegun') {
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.stroke();
    } else if (tower.type === 'cannon') {
      this.ctx.strokeRect(x - size, y - size, size * 2, size * 2);
    } else if (tower.type === 'laser') {
      this.ctx.beginPath();
      this.ctx.moveTo(x, y - size);
      this.ctx.lineTo(x + size, y);
      this.ctx.lineTo(x, y + size);
      this.ctx.lineTo(x - size, y);
      this.ctx.closePath();
      this.ctx.stroke();
    }

    if (isSelected) {
      this.ctx.restore();
    }
  }

  private drawDragPreview(dragState: DragState, currentTime: number): void {
    const tower = dragState.towerId ? null : null;
    if (dragState.targetGridX !== null && dragState.targetGridY !== null) {
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([4, 4]);
      this.ctx.strokeRect(
        dragState.targetGridX * GRID_SIZE + 2,
        dragState.targetGridY * GRID_SIZE + 2,
        GRID_SIZE - 4,
        GRID_SIZE - 4
      );
      this.ctx.restore();
    }

    this.ctx.save();
    this.ctx.globalAlpha = 0.7;

    const tempTower: Tower = {
      id: dragState.towerId,
      type: 'machinegun',
      gridX: 0,
      gridY: 0,
      placedAt: 0
    };

    this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
    this.ctx.beginPath();
    this.ctx.arc(dragState.mouseX, dragState.mouseY, 14, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawTowerPreviewAtMouse(mouseX: number, mouseY: number, towerType: TowerType, valid: boolean): void {
    const config = TOWER_CONFIGS[towerType];

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    this.ctx.globalAlpha = 0.2;
    this.ctx.fillStyle = valid ? config.color : '#e74c3c';
    this.ctx.beginPath();
    this.ctx.arc(mouseX, mouseY, config.range, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    this.ctx.save();
    this.ctx.globalAlpha = valid ? 0.7 : 0.4;
    this.ctx.fillStyle = config.color;
    this.ctx.beginPath();
    this.ctx.arc(mouseX, mouseY, 14, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = valid ? '#ffffff' : '#e74c3c';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    this.ctx.restore();
  }
}
