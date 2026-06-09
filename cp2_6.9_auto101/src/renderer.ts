import { Board, BOARD_SIZE, BLACK, WHITE } from './board';

const BASE_CANVAS_WIDTH = 640;
const BASE_CANVAS_HEIGHT = 600;
const GRID_SIZE = 40;
const BOARD_PADDING = 20;
const STONE_RADIUS = 16;
const HIGHLIGHT_RADIUS = 20;
const LINE_COLOR = '#5D4037';
const BOARD_BG = '#E8D5B7';

export interface AnimatingStone {
  x: number;
  y: number;
  player: 1 | 2;
  startTime: number;
  duration: number;
}

export interface Highlight {
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scale: number = 1;
  private animatingStones: AnimatingStone[] = [];
  private highlights: Highlight[] = [];
  private hoverPos: { x: number; y: number } | null = null;
  private hoverPlayer: 1 | 2 = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
  }

  resize(): void {
    const containerWidth = Math.min(window.innerWidth - 40, 640);
    const clampedWidth = Math.max(400, Math.min(640, containerWidth));
    this.scale = clampedWidth / BASE_CANVAS_WIDTH;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = BASE_CANVAS_WIDTH * dpr * this.scale;
    this.canvas.height = BASE_CANVAS_HEIGHT * dpr * this.scale;
    this.canvas.style.width = `${BASE_CANVAS_WIDTH * this.scale}px`;
    this.canvas.style.height = `${BASE_CANVAS_HEIGHT * this.scale}px`;

    this.ctx.setTransform(dpr * this.scale, 0, 0, dpr * this.scale, 0, 0);
  }

  setHover(pos: { x: number; y: number } | null, player: 1 | 2 = 1): void {
    this.hoverPos = pos;
    this.hoverPlayer = player;
  }

  addAnimatingStone(x: number, y: number, player: 1 | 2): void {
    this.animatingStones.push({
      x,
      y,
      player,
      startTime: performance.now(),
      duration: 200
    });
  }

  addHighlight(x: number, y: number): void {
    this.highlights.push({
      x,
      y,
      startTime: performance.now(),
      duration: 500
    });
  }

  clearHighlights(): void {
    this.highlights = [];
  }

  clearAnimations(): void {
    this.animatingStones = [];
  }

  screenToGrid(clientX: number, clientY: number): { x: number; y: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / this.scale;
    const y = (clientY - rect.top) / this.scale;

    const gridX = Math.round((x - BOARD_PADDING) / GRID_SIZE);
    const gridY = Math.round((y - BOARD_PADDING) / GRID_SIZE);

    if (gridX < 0 || gridX >= BOARD_SIZE || gridY < 0 || gridY >= BOARD_SIZE) {
      return null;
    }

    const cellCenterX = BOARD_PADDING + gridX * GRID_SIZE;
    const cellCenterY = BOARD_PADDING + gridY * GRID_SIZE;
    const dist = Math.sqrt((x - cellCenterX) ** 2 + (y - cellCenterY) ** 2);

    if (dist > GRID_SIZE / 2) {
      return null;
    }

    return { x: gridX, y: gridY };
  }

  render(board: Board): void {
    const now = performance.now();

    this.animatingStones = this.animatingStones.filter(
      s => now - s.startTime < s.duration
    );
    this.highlights = this.highlights.filter(
      h => now - h.startTime < h.duration
    );

    this.drawBoard();
    this.drawGridLines();
    this.drawStones(board, now);
    this.drawHoverPreview();
    this.drawHighlights(now);
  }

  private drawBoard(): void {
    this.ctx.fillStyle = BOARD_BG;
    this.ctx.fillRect(0, 0, BASE_CANVAS_WIDTH, BASE_CANVAS_HEIGHT);
  }

  private drawGridLines(): void {
    this.ctx.strokeStyle = LINE_COLOR;
    this.ctx.lineWidth = 1;

    for (let i = 0; i < BOARD_SIZE; i++) {
      const pos = BOARD_PADDING + i * GRID_SIZE;

      this.ctx.beginPath();
      this.ctx.moveTo(BOARD_PADDING, pos);
      this.ctx.lineTo(BOARD_PADDING + (BOARD_SIZE - 1) * GRID_SIZE, pos);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(pos, BOARD_PADDING);
      this.ctx.lineTo(pos, BOARD_PADDING + (BOARD_SIZE - 1) * GRID_SIZE);
      this.ctx.stroke();
    }

    const starPoints = [
      [3, 3], [11, 3], [3, 11], [11, 11], [7, 7]
    ];
    this.ctx.fillStyle = LINE_COLOR;
    for (const [sx, sy] of starPoints) {
      const cx = BOARD_PADDING + sx * GRID_SIZE;
      const cy = BOARD_PADDING + sy * GRID_SIZE;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawStones(board: Board, now: number): void {
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const cell = board[y][x];
        if (cell !== 0) {
          const anim = this.animatingStones.find(
            s => s.x === x && s.y === y
          );
          let radius = STONE_RADIUS;
          if (anim) {
            const progress = Math.min(1, (now - anim.startTime) / anim.duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            radius = STONE_RADIUS * eased;
          }
          this.drawStone(x, y, cell as 1 | 2, radius);
        }
      }
    }
  }

  private drawStone(gridX: number, gridY: number, player: 1 | 2, radius: number): void {
    const cx = BOARD_PADDING + gridX * GRID_SIZE;
    const cy = BOARD_PADDING + gridY * GRID_SIZE;

    this.ctx.save();
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 2;
    this.ctx.shadowBlur = 3;

    if (player === BLACK) {
      const gradient = this.ctx.createRadialGradient(
        cx - 3, cy - 3, 2,
        cx, cy, radius
      );
      gradient.addColorStop(0, '#666666');
      gradient.addColorStop(0.3, '#333333');
      gradient.addColorStop(1, '#000000');
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = '#CCCCCC';
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private drawHoverPreview(): void {
    if (!this.hoverPos) return;

    const cx = BOARD_PADDING + this.hoverPos.x * GRID_SIZE;
    const cy = BOARD_PADDING + this.hoverPos.y * GRID_SIZE;

    this.ctx.save();
    this.ctx.globalAlpha = 0.3;

    if (this.hoverPlayer === BLACK) {
      const gradient = this.ctx.createRadialGradient(
        cx - 3, cy - 3, 2,
        cx, cy, STONE_RADIUS
      );
      gradient.addColorStop(0, '#666666');
      gradient.addColorStop(0.3, '#333333');
      gradient.addColorStop(1, '#000000');
      this.ctx.fillStyle = gradient;
    } else {
      this.ctx.fillStyle = '#FFFFFF';
    }

    this.ctx.beginPath();
    this.ctx.arc(cx, cy, STONE_RADIUS, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  private drawHighlights(now: number): void {
    for (const hl of this.highlights) {
      const cx = BOARD_PADDING + hl.x * GRID_SIZE;
      const cy = BOARD_PADDING + hl.y * GRID_SIZE;
      const progress = (now - hl.startTime) / hl.duration;
      const alpha = Math.sin(progress * Math.PI) * 0.8;
      const pulseRadius = HIGHLIGHT_RADIUS * (0.8 + progress * 0.4);

      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.strokeStyle = '#FFD54F';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  getScale(): number {
    return this.scale;
  }
}
