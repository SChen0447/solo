import type { MazeData, Cell } from './maze';

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export interface SparklePoint {
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  phase: number;
}

export interface RenderState {
  playerX: number;
  playerY: number;
  bounceOffset: number;
  isHitFlash: boolean;
  hitFlashTimer: number;
  deadEndFlashTimer: number;
  time: number;
  trail: TrailPoint[];
}

const WALL_COLOR_START = { r: 0xff, g: 0x45, b: 0x00 };
const WALL_COLOR_END = { r: 0x8b, g: 0x00, b: 0x00 };
const FLOOR_COLOR = { r: 0x2a, g: 0x2a, b: 0x2a };
const PLAYER_COLOR = '#ffff00';
const WALL_PULSE_PERIOD = 3000;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
  t: number
): string {
  const r = Math.round(lerp(c1.r, c2.r, t));
  const g = Math.round(lerp(c1.g, c2.g, t));
  const b = Math.round(lerp(c1.b, c2.b, t));
  return `rgb(${r}, ${g}, ${b})`;
}

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function generateSparkles(maze: MazeData, cellSize: number): SparklePoint[] {
  const sparkles: SparklePoint[] = [];
  for (let y = 0; y < maze.height; y++) {
    for (let x = 0; x < maze.width; x++) {
      if (Math.random() < 0.6) {
        sparkles.push({
          x,
          y,
          offsetX: Math.random() * cellSize,
          offsetY: Math.random() * cellSize,
          phase: Math.random() * Math.PI * 2
        });
      }
    }
  }
  return sparkles;
}

function getWallPulseColor(time: number): string {
  const t = easeInOutSine(
    (Math.sin((time / WALL_PULSE_PERIOD) * Math.PI * 2) + 1) / 2
  );
  return lerpColor(WALL_COLOR_START, WALL_COLOR_END, t);
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private maze: MazeData;
  private cellSize: number = 0;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private sparkles: SparklePoint[] = [];
  private wallThickness: number = 4;

  constructor(canvas: HTMLCanvasElement, maze: MazeData) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.maze = maze;
    this.resize();
    this.sparkles = generateSparkles(maze, this.cellSize);
  }

  setMaze(maze: MazeData): void {
    this.maze = maze;
    this.resize();
    this.sparkles = generateSparkles(maze, this.cellSize);
  }

  resize(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const maxSize = Math.min(rect.width, rect.height);
    this.cellSize = Math.floor(maxSize / this.maze.width);

    const canvasSize = this.cellSize * this.maze.width;
    this.canvas.width = canvasSize;
    this.canvas.height = canvasSize;

    this.offsetX = 0;
    this.offsetY = 0;
    this.wallThickness = Math.max(2, Math.floor(this.cellSize * 0.08));
  }

  private drawFloor(time: number): void {
    const { ctx, cellSize, maze } = this;
    const stripeWidth = Math.max(4, cellSize * 0.15);
    const stripeOffset = (time / 40) % (stripeWidth * 2);

    ctx.fillStyle = `rgb(${FLOOR_COLOR.r}, ${FLOOR_COLOR.g}, ${FLOOR_COLOR.b})`;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.globalAlpha = 0.35;

    for (let y = 0; y < maze.height; y++) {
      for (let x = 0; x < maze.width; x++) {
        const cellX = x * cellSize;
        const cellY = y * cellSize;

        ctx.save();
        ctx.beginPath();
        ctx.rect(cellX, cellY, cellSize, cellSize);
        ctx.clip();

        const seed = (x * 7 + y * 13) % 4;
        const angle = (seed * Math.PI) / 4;

        ctx.translate(cellX + cellSize / 2, cellY + cellSize / 2);
        ctx.rotate(angle);

        const gradient = ctx.createLinearGradient(-cellSize, 0, cellSize, 0);
        gradient.addColorStop(0, 'rgba(139, 0, 0, 0)');
        gradient.addColorStop(0.3, 'rgba(255, 69, 0, 0.6)');
        gradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.8)');
        gradient.addColorStop(0.7, 'rgba(255, 69, 0, 0.6)');
        gradient.addColorStop(1, 'rgba(139, 0, 0, 0)');

        ctx.fillStyle = gradient;

        const totalWidth = cellSize * 3;
        for (let sx = -totalWidth + stripeOffset; sx < totalWidth; sx += stripeWidth * 2) {
          ctx.fillRect(sx, -cellSize, stripeWidth, cellSize * 2);
        }

        ctx.restore();
      }
    }

    ctx.restore();
  }

  private drawWalls(time: number, deadEndFlash: boolean): void {
    const { ctx, cellSize, maze, wallThickness } = this;
    const wallColor = getWallPulseColor(time);

    let actualColor = wallColor;
    if (deadEndFlash) {
      const flashIntensity = Math.sin(time / 50) * 0.5 + 0.5;
      actualColor = lerpColor(
        WALL_COLOR_START,
        { r: 0xff, g: 0x00, b: 0x00 },
        flashIntensity
      );
    }

    ctx.strokeStyle = actualColor;
    ctx.lineWidth = wallThickness;
    ctx.lineCap = 'square';

    ctx.shadowColor = actualColor;
    ctx.shadowBlur = wallThickness * 2;

    ctx.beginPath();

    for (let y = 0; y < maze.height; y++) {
      for (let x = 0; x < maze.width; x++) {
        const cell: Cell = maze.grid[y][x];
        const px = x * cellSize;
        const py = y * cellSize;

        if (cell.walls.top) {
          ctx.moveTo(px, py);
          ctx.lineTo(px + cellSize, py);
        }
        if (cell.walls.left) {
          ctx.moveTo(px, py);
          ctx.lineTo(px, py + cellSize);
        }
        if (y === maze.height - 1 && cell.walls.bottom) {
          ctx.moveTo(px, py + cellSize);
          ctx.lineTo(px + cellSize, py + cellSize);
        }
        if (x === maze.width - 1 && cell.walls.right) {
          ctx.moveTo(px + cellSize, py);
          ctx.lineTo(px + cellSize, py + cellSize);
        }
      }
    }

    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  private drawSparkles(time: number): void {
    const { ctx, cellSize, sparkles } = this;

    for (const sparkle of sparkles) {
      const px = sparkle.x * cellSize + sparkle.offsetX;
      const py = sparkle.y * cellSize + sparkle.offsetY;

      const pulse = (Math.sin(time / 300 + sparkle.phase) + 1) / 2;
      const alpha = pulse * 0.6 + 0.2;
      const size = 1.5 + pulse * 1.5;

      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 200, 100, ${alpha})`;
      ctx.shadowColor = 'rgba(255, 200, 100, 0.8)';
      ctx.shadowBlur = 4;
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  private drawStartEnd(): void {
    const { ctx, cellSize, maze } = this;

    const startX = maze.start.x * cellSize + cellSize / 2;
    const startY = maze.start.y * cellSize + cellSize / 2;
    const startRadius = cellSize * 0.25;

    ctx.beginPath();
    ctx.arc(startX, startY, startRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 255, 100, 0.3)';
    ctx.shadowColor = '#00ff64';
    ctx.shadowBlur = 15;
    ctx.fill();

    ctx.fillStyle = '#00ff64';
    ctx.font = `bold ${Math.floor(cellSize * 0.35)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 10;
    ctx.fillText('起', startX, startY);

    const endX = maze.end.x * cellSize + cellSize / 2;
    const endY = maze.end.y * cellSize + cellSize / 2;
    const endRadius = cellSize * 0.3;

    const endGrad = ctx.createRadialGradient(endX, endY, 0, endX, endY, endRadius);
    endGrad.addColorStop(0, 'rgba(255, 0, 100, 0.8)');
    endGrad.addColorStop(1, 'rgba(255, 0, 100, 0)');

    ctx.beginPath();
    ctx.arc(endX, endY, endRadius, 0, Math.PI * 2);
    ctx.fillStyle = endGrad;
    ctx.shadowColor = '#ff0064';
    ctx.shadowBlur = 25;
    ctx.fill();

    ctx.fillStyle = '#ff0064';
    ctx.font = `bold ${Math.floor(cellSize * 0.35)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 10;
    ctx.fillText('终', endX, endY);

    ctx.shadowBlur = 0;
  }

  private drawTrail(trail: TrailPoint[]): void {
    const { ctx, cellSize } = this;

    for (let i = 0; i < trail.length; i++) {
      const point = trail[i];
      const px = point.x * cellSize + cellSize / 2;
      const py = point.y * cellSize + cellSize / 2;
      const size = (cellSize * 0.2) * point.alpha;

      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 0, ${point.alpha * 0.5})`;
      ctx.shadowColor = '#ffff00';
      ctx.shadowBlur = 10 * point.alpha;
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  private drawPlayer(state: RenderState): void {
    const { ctx, cellSize } = this;

    const px = state.playerX * cellSize + cellSize / 2;
    const py = state.playerY * cellSize + cellSize / 2 + state.bounceOffset * cellSize * 0.1;
    const baseRadius = cellSize * 0.3;

    let color = PLAYER_COLOR;
    let glowColor = 'rgba(255, 255, 0, 0.8)';
    if (state.isHitFlash) {
      const t = Math.sin(state.hitFlashTimer / 30) * 0.5 + 0.5;
      color = lerpColor({ r: 0xff, g: 0xff, b: 0 }, { r: 0xff, g: 0, b: 0 }, t);
      glowColor = `rgba(255, ${Math.round(255 * (1 - t))}, 0, 0.8)`;
    }

    const glowRadius = baseRadius * 2.5;
    const grad = ctx.createRadialGradient(px, py, 0, px, py, glowRadius);
    grad.addColorStop(0, glowColor);
    grad.addColorStop(0.4, 'rgba(255, 255, 0, 0.3)');
    grad.addColorStop(1, 'rgba(255, 255, 0, 0)');

    ctx.beginPath();
    ctx.arc(px, py, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(px, py, baseRadius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(px - baseRadius * 0.3, py - baseRadius * 0.3, baseRadius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.shadowBlur = 0;
    ctx.fill();
  }

  render(state: RenderState): void {
    const { ctx } = this;
    const deadEndFlash = state.deadEndFlashTimer > 0;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawFloor(state.time);
    this.drawWalls(state.time, deadEndFlash);
    this.drawSparkles(state.time);
    this.drawStartEnd();
    this.drawTrail(state.trail);
    this.drawPlayer(state);
  }
}
