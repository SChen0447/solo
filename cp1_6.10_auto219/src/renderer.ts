import { Maze, MazeCell } from './maze';

export interface PathPoint {
  row: number;
  col: number;
  timestamp: number;
}

export interface AnimationState {
  pathProgress: number;
  cellAnimations: Map<string, number>;
}

interface Color {
  r: number;
  g: number;
  b: number;
}

const START_COLOR: Color = { r: 66, g: 165, b: 245 };
const END_COLOR: Color = { r: 171, g: 71, b: 188 };
const CELL_GAP = 2;
const WALL_WIDTH = 2;
const PATH_WIDTH = 3;
const MARKER_RADIUS = 4;
const MARKER_GLOW = 3;

function hexToRgb(hex: string): Color {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  };
}

function lerpColor(c1: Color, c2: Color, t: number): Color {
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t)
  };
}

function colorToRgba(color: Color, alpha: number = 1): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

function getVisitColor(progress: number): Color {
  return lerpColor(START_COLOR, END_COLOR, Math.min(1, Math.max(0, progress)));
}

function getCellAlpha(visitOrder: number, totalCells: number, animationProgress: number): number {
  const baseProgress = totalCells > 1 ? visitOrder / (totalCells - 1) : 0;
  const baseAlpha = 0.3 + baseProgress * 0.4;
  return baseAlpha * animationProgress;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cellSize: number = 20;
  private offsetX: number = 0;
  private offsetY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取 Canvas 2D 上下文');
    this.ctx = ctx;
  }

  resize(width: number, height: number, cellSize: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.cellSize = cellSize;
    this.offsetX = (width - this.cellSize * 21 - CELL_GAP * 20) / 2;
    this.offsetY = (height - this.cellSize * 21 - CELL_GAP * 20) / 2;
  }

  getCellAtPixel(px: number, py: number): { row: number; col: number } | null {
    const totalCellSize = this.cellSize + CELL_GAP;
    const x = px - this.offsetX;
    const y = py - this.offsetY;

    if (x < 0 || y < 0) return null;

    const col = Math.floor(x / totalCellSize);
    const row = Math.floor(y / totalCellSize);

    const cellX = col * totalCellSize;
    const cellY = row * totalCellSize;

    if (
      x >= cellX && x < cellX + this.cellSize &&
      y >= cellY && y < cellY + this.cellSize &&
      row >= 0 && row < 21 && col >= 0 && col < 21
    ) {
      return { row, col };
    }

    return null;
  }

  private getCellCenter(row: number, col: number): { x: number; y: number } {
    const totalCellSize = this.cellSize + CELL_GAP;
    return {
      x: this.offsetX + col * totalCellSize + this.cellSize / 2,
      y: this.offsetY + row * totalCellSize + this.cellSize / 2
    };
  }

  private getCellBounds(row: number, col: number): { x: number; y: number; w: number; h: number } {
    const totalCellSize = this.cellSize + CELL_GAP;
    return {
      x: this.offsetX + col * totalCellSize,
      y: this.offsetY + row * totalCellSize,
      w: this.cellSize,
      h: this.cellSize
    };
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawGrid(): void {
    const rows = 21;
    const cols = 21;
    const totalCellSize = this.cellSize + CELL_GAP;

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(42, 42, 74, 0.3)';
    this.ctx.lineWidth = 0.5;

    for (let r = 0; r <= rows; r++) {
      const y = this.offsetY + r * totalCellSize - CELL_GAP / 2;
      this.ctx.beginPath();
      this.ctx.moveTo(this.offsetX, y);
      this.ctx.lineTo(this.offsetX + cols * totalCellSize - CELL_GAP, y);
      this.ctx.stroke();
    }

    for (let c = 0; c <= cols; c++) {
      const x = this.offsetX + c * totalCellSize - CELL_GAP / 2;
      this.ctx.beginPath();
      this.ctx.moveTo(x, this.offsetY);
      this.ctx.lineTo(x, this.offsetY + rows * totalCellSize - CELL_GAP);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  drawWalls(maze: Maze): void {
    this.ctx.save();
    this.ctx.strokeStyle = '#4a4a6a';
    this.ctx.lineWidth = WALL_WIDTH;
    this.ctx.lineCap = 'round';

    const rows = maze.length;
    const cols = maze[0].length;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (maze[r][c].isWall) {
          const bounds = this.getCellBounds(r, c);
          this.ctx.fillStyle = '#4a4a6a';
          this.ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
        }
      }
    }

    this.ctx.restore();
  }

  drawVisitedCells(
    visitedCells: Map<string, { order: number; cell: MazeCell }>,
    totalVisited: number,
    animationState: AnimationState
  ): void {
    visitedCells.forEach((value, key) => {
      const { order, cell } = value;
      const animProgress = animationState.cellAnimations.get(key) ?? 1;
      const bounds = this.getCellBounds(cell.row, cell.col);
      const color = getVisitColor(totalVisited > 1 ? order / (totalVisited - 1) : 0);
      const alpha = getCellAlpha(order, totalVisited, animProgress);

      this.ctx.save();

      this.ctx.fillStyle = colorToRgba(color, alpha);
      this.ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);

      this.ctx.globalAlpha = alpha * 0.3;
      for (let i = 0; i < 3; i++) {
        this.ctx.strokeStyle = colorToRgba(lerpColor(color, { r: 255, g: 255, b: 255 }, 0.3), 1);
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        const offset = (cell.row + cell.col + i * 3) % 7;
        this.ctx.moveTo(bounds.x, bounds.y + (bounds.h / 4) * (i + 0.5) + offset);
        this.ctx.quadraticCurveTo(
          bounds.x + bounds.w / 2,
          bounds.y + (bounds.h / 4) * (i + 0.5) - offset,
          bounds.x + bounds.w,
          bounds.y + (bounds.h / 4) * (i + 0.5) + offset
        );
        this.ctx.stroke();
      }

      this.ctx.restore();
    });
  }

  drawPath(path: PathPoint[], animationProgress: number): void {
    if (path.length < 2) return;

    this.ctx.save();
    this.ctx.lineWidth = PATH_WIDTH;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    const gradient = this.ctx.createLinearGradient(
      this.getCellCenter(path[0].row, path[0].col).x,
      this.getCellCenter(path[0].row, path[0].col).y,
      this.getCellCenter(path[path.length - 1].row, path[path.length - 1].col).x,
      this.getCellCenter(path[path.length - 1].row, path[path.length - 1].col).y
    );
    gradient.addColorStop(0, '#ff8a65');
    gradient.addColorStop(1, '#ff7043');
    this.ctx.strokeStyle = gradient;

    const totalSegments = path.length - 1;
    const visibleSegments = Math.floor(animationProgress * totalSegments);
    const segmentProgress = (animationProgress * totalSegments) - visibleSegments;

    this.ctx.beginPath();

    for (let i = 0; i <= visibleSegments && i < path.length; i++) {
      const { x, y } = this.getCellCenter(path[i].row, path[i].col);
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.drawSmoothSegment(i, path, x, y);
      }
    }

    if (visibleSegments < totalSegments && segmentProgress > 0) {
      const currentIdx = visibleSegments;
      const nextIdx = visibleSegments + 1;
      const current = this.getCellCenter(path[currentIdx].row, path[currentIdx].col);
      const next = this.getCellCenter(path[nextIdx].row, path[nextIdx].col);

      const midX = current.x + (next.x - current.x) * 0.5;
      const midY = current.y + (next.y - current.y) * 0.5;

      if (visibleSegments === 0) {
        this.ctx.moveTo(current.x, current.y);
      }

      const cp1X = current.x + (midX - current.x) * 0.5;
      const cp1Y = current.y;
      const cp2X = midX + (next.x - midX) * 0.5;
      const cp2Y = next.y;

      const endX = current.x + (next.x - current.x) * segmentProgress;
      const endY = current.y + (next.y - current.y) * segmentProgress;

      if (segmentProgress <= 0.5) {
        const t = segmentProgress * 2;
        const cx = (1 - t) * (1 - t) * current.x + 2 * (1 - t) * t * cp1X + t * t * midX;
        const cy = (1 - t) * (1 - t) * current.y + 2 * (1 - t) * t * cp1Y + t * t * midY;
        this.ctx.lineTo(cx, cy);
      } else {
        this.ctx.lineTo(midX, midY);
        const t = (segmentProgress - 0.5) * 2;
        const cx = (1 - t) * (1 - t) * midX + 2 * (1 - t) * t * cp2X + t * t * next.x;
        const cy = (1 - t) * (1 - t) * midY + 2 * (1 - t) * t * cp2Y + t * t * next.y;
        this.ctx.lineTo(cx, cy);
      }
    }

    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawSmoothSegment(i: number, path: PathPoint[], x: number, y: number): void {
    if (i < 2) {
      this.ctx.lineTo(x, y);
      return;
    }

    const prev = this.getCellCenter(path[i - 2].row, path[i - 2].col);
    const curr = this.getCellCenter(path[i - 1].row, path[i - 1].col);

    const cp1x = curr.x + (curr.x - prev.x) * 0.2;
    const cp1y = curr.y + (curr.y - prev.y) * 0.2;
    const cp2x = curr.x + (x - curr.x) * 0.2;
    const cp2y = curr.y + (y - curr.y) * 0.2;

    this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
  }

  drawMarkers(): void {
    this.ctx.save();

    const startCenter = this.getCellCenter(0, 0);
    this.ctx.shadowColor = '#4caf50';
    this.ctx.shadowBlur = MARKER_GLOW * 2;
    this.ctx.fillStyle = '#4caf50';
    this.ctx.beginPath();
    this.ctx.arc(startCenter.x, startCenter.y, MARKER_RADIUS, 0, Math.PI * 2);
    this.ctx.fill();

    const endCenter = this.getCellCenter(20, 20);
    this.ctx.shadowColor = '#e53935';
    this.ctx.shadowBlur = MARKER_GLOW * 2;
    this.ctx.fillStyle = '#e53935';
    this.ctx.beginPath();
    this.ctx.arc(endCenter.x, endCenter.y, MARKER_RADIUS, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  drawHeatmap(
    heatmapCanvas: HTMLCanvasElement,
    maze: Maze,
    visitedCells: Map<string, { order: number; cell: MazeCell }>
  ): void {
    const ctx = heatmapCanvas.getContext('2d');
    if (!ctx) return;

    const w = heatmapCanvas.width;
    const h = heatmapCanvas.height;
    const rows = maze.length;
    const cols = maze[0].length;
    const cellW = w / cols;
    const cellH = h / rows;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#121224';
    ctx.fillRect(0, 0, w, h);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!maze[r][c].isWall) {
          ctx.fillStyle = '#2a2a4a';
          ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
        }
      }
    }

    visitedCells.forEach(({ cell }) => {
      ctx.fillStyle = '#ffab91';
      ctx.fillRect(cell.col * cellW, cell.row * cellH, cellW, cellH);
    });
  }

  render(
    maze: Maze,
    path: PathPoint[],
    visitedCells: Map<string, { order: number; cell: MazeCell }>,
    animationState: AnimationState
  ): void {
    this.clear();
    this.drawGrid();
    this.drawVisitedCells(visitedCells, visitedCells.size, animationState);
    this.drawWalls(maze);
    this.drawPath(path, animationState.pathProgress);
    this.drawMarkers();
  }
}
