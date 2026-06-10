import { MazeGrid, CELL_WALL, CELL_PATH } from './mazeGenerator';
import { Point } from './pathFinder';

export interface CharacterData {
  id: number;
  gridX: number;
  gridY: number;
  pixelX: number;
  pixelY: number;
  color: string;
  targetGridX: number | null;
  targetGridY: number | null;
  isSelected: boolean;
  path: Point[];
  pathIndex: number;
  isMoving: boolean;
  name: string;
}

const COLOR_WALL = '#333333';
const COLOR_PATH = '#ffffff';
const COLOR_TARGET = '#2ecc71';
const COLOR_SELECTION_RING = '#f1c40f';
const COLOR_PATH_LINE = '#e67e22';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  public cellSize: number;
  private mazeWidth: number;
  private mazeHeight: number;
  private dashOffset: number = 0;

  constructor(canvas: HTMLCanvasElement, cellSize: number = 32) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取Canvas 2D上下文');
    }
    this.ctx = ctx;
    this.cellSize = cellSize;
    this.mazeWidth = 0;
    this.mazeHeight = 0;
  }

  resize(mazeWidth: number, mazeHeight: number): void {
    this.mazeWidth = mazeWidth;
    this.mazeHeight = mazeHeight;
    this.canvas.width = mazeWidth * this.cellSize;
    this.canvas.height = mazeHeight * this.cellSize;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawMaze(grid: MazeGrid): void {
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const px = x * this.cellSize;
        const py = y * this.cellSize;
        if (grid[y][x] === CELL_WALL) {
          this.ctx.fillStyle = COLOR_WALL;
        } else {
          this.ctx.fillStyle = COLOR_PATH;
        }
        this.ctx.fillRect(px, py, this.cellSize, this.cellSize);
      }
    }
  }

  drawTargets(characters: CharacterData[], time: number): void {
    for (const char of characters) {
      if (char.targetGridX !== null && char.targetGridY !== null) {
        const px = char.targetGridX * this.cellSize + this.cellSize / 2;
        const py = char.targetGridY * this.cellSize + this.cellSize / 2;
        const flash = Math.sin(time * 0.004 * Math.PI) * 0.5 + 0.5;
        const radius = 6 + flash * 2;

        this.ctx.beginPath();
        this.ctx.arc(px, py, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = COLOR_TARGET;
        this.ctx.globalAlpha = 0.6 + flash * 0.4;
        this.ctx.fill();
        this.ctx.globalAlpha = 1;

        this.ctx.beginPath();
        this.ctx.arc(px, py, radius + 2, 0, Math.PI * 2);
        this.ctx.strokeStyle = COLOR_TARGET;
        this.ctx.lineWidth = 1.5;
        this.ctx.globalAlpha = flash * 0.8;
        this.ctx.stroke();
        this.ctx.globalAlpha = 1;
      }
    }
  }

  drawPath(path: Point[], time: number): void {
    if (path.length < 2) return;

    this.dashOffset = (this.dashOffset + 0.5) % 16;

    this.ctx.save();
    this.ctx.beginPath();
    const startX = path[0].x * this.cellSize + this.cellSize / 2;
    const startY = path[0].y * this.cellSize + this.cellSize / 2;
    this.ctx.moveTo(startX, startY);

    for (let i = 1; i < path.length; i++) {
      const px = path[i].x * this.cellSize + this.cellSize / 2;
      const py = path[i].y * this.cellSize + this.cellSize / 2;
      this.ctx.lineTo(px, py);
    }

    this.ctx.strokeStyle = COLOR_PATH_LINE;
    this.ctx.globalAlpha = 0.8;
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([8, 8]);
    this.ctx.lineDashOffset = -this.dashOffset;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    this.ctx.globalAlpha = 1;
    this.ctx.restore();
  }

  drawCharacter(char: CharacterData, time: number): void {
    const px = char.pixelX;
    const py = char.pixelY;
    const radius = 12;

    if (char.isSelected) {
      const pulse = Math.sin(time * 0.006) * 0.5 + 0.5;
      this.ctx.beginPath();
      this.ctx.arc(px, py, radius + 5 + pulse * 2, 0, Math.PI * 2);
      this.ctx.strokeStyle = COLOR_SELECTION_RING;
      this.ctx.lineWidth = 2;
      this.ctx.globalAlpha = 0.6 + pulse * 0.4;
      this.ctx.stroke();
      this.ctx.globalAlpha = 1;
    }

    this.ctx.beginPath();
    this.ctx.arc(px, py, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = char.color;
    this.ctx.globalAlpha = 0.9;
    this.ctx.fill();
    this.ctx.globalAlpha = 1;

    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.stroke();

    if (char.isSelected) {
      this.ctx.font = 'bold 11px Segoe UI, Tahoma, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      this.ctx.lineWidth = 3;
      this.ctx.textBaseline = 'top';
      const textY = py + radius + 6;
      this.ctx.strokeText(char.name, px, textY);
      this.ctx.fillText(char.name, px, textY);
    }
  }

  render(
    grid: MazeGrid,
    characters: CharacterData[],
    activePaths: Map<number, Point[]>,
    time: number
  ): void {
    this.clear();
    this.drawMaze(grid);

    for (const [, path] of activePaths) {
      this.drawPath(path, time);
    }

    this.drawTargets(characters, time);

    for (const char of characters) {
      this.drawCharacter(char, time);
    }
  }

  getGridCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) / this.cellSize);
    const y = Math.floor((clientY - rect.top) / this.cellSize);
    return { x, y };
  }

  getPixelCenter(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: gridX * this.cellSize + this.cellSize / 2,
      y: gridY * this.cellSize + this.cellSize / 2
    };
  }

  hitTestCharacter(
    clientX: number,
    clientY: number,
    characters: CharacterData[]
  ): CharacterData | null {
    const rect = this.canvas.getBoundingClientRect();
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;

    for (let i = characters.length - 1; i >= 0; i--) {
      const char = characters[i];
      const dx = cx - char.pixelX;
      const dy = cy - char.pixelY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= 14) {
        return char;
      }
    }
    return null;
  }
}
