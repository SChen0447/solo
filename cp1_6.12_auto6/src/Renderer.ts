import type { Player } from './GameBoard';
import type { Board, PlacedPiece } from './GameBoard';

interface Layout {
  boardSize: number;
  cellSize: number;
  offsetX: number;
  offsetY: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private board: Board;
  private dpr: number = 1;
  private layout: Layout = { boardSize: 0, cellSize: 0, offsetX: 0, offsetY: 0 };
  private hoverCell: { row: number; col: number } | null = null;
  private hoverPlayer: Player = 'red';
  private lastFrameTime: number = 0;

  private static readonly GRID_LINE_COLOR = '#3a5f8a';
  private static readonly GRID_HOVER_COLOR = 'rgba(77, 166, 255, 0.25)';
  private static readonly RED_COLOR = '#ff4d4d';
  private static readonly RED_GLOW = '#ff8a8a';
  private static readonly RED_DARK = '#cc3d3d';
  private static readonly BLUE_COLOR = '#4da6ff';
  private static readonly BLUE_GLOW = '#8acaff';
  private static readonly BLUE_DARK = '#3d85cc';
  private static readonly BG_START = '#0b0e14';
  private static readonly BG_END = '#1a2634';

  constructor(canvas: HTMLCanvasElement, board: Board) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas 2D上下文');
    this.ctx = ctx;
    this.board = board;
    this.resize();
  }

  public setHoverPlayer(player: Player): void {
    this.hoverPlayer = player;
  }

  public setHoverCell(row: number | null, col: number | null): void {
    if (row === null || col === null) {
      this.hoverCell = null;
    } else {
      this.hoverCell = { row, col };
    }
  }

  public resize(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    this.dpr = window.devicePixelRatio || 1;
    const cssWidth = container.clientWidth;
    const cssHeight = container.clientHeight;

    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
    this.canvas.width = Math.floor(cssWidth * this.dpr);
    this.canvas.height = Math.floor(cssHeight * this.dpr);

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.calculateLayout(cssWidth, cssHeight);
  }

  private calculateLayout(cssWidth: number, cssHeight: number): void {
    const availableHeight = cssHeight * 0.8;
    const availableWidth = cssWidth * 0.9;
    const boardSize = Math.min(availableHeight, availableWidth);
    const cellSize = boardSize / this.board.size;

    this.layout = {
      boardSize,
      cellSize,
      offsetX: (cssWidth - boardSize) / 2,
      offsetY: (cssHeight - boardSize) / 2
    };
  }

  public getCellFromPoint(clientX: number, clientY: number): { row: number; col: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left - this.layout.offsetX;
    const y = clientY - rect.top - this.layout.offsetY;

    if (x < 0 || x >= this.layout.boardSize || y < 0 || y >= this.layout.boardSize) {
      return null;
    }

    const col = Math.floor(x / this.layout.cellSize);
    const row = Math.floor(y / this.layout.cellSize);

    if (row < 0 || row >= this.board.size || col < 0 || col >= this.board.size) {
      return null;
    }

    return { row, col };
  }

  public render(now: number): void {
    const { offsetX, offsetY, boardSize, cellSize } = this.layout;

    this.drawBackground();
    this.drawHoverHighlight();
    this.drawGrid(offsetX, offsetY, boardSize, cellSize);

    for (let r = 0; r < this.board.size; r++) {
      for (let c = 0; c < this.board.size; c++) {
        const cell = this.board.getCell(r, c);
        if (cell) {
          this.drawPiece(r, c, cell, now, offsetX, offsetY, cellSize);
        }
      }
    }

    this.lastFrameTime = now;
  }

  private drawBackground(): void {
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    const grad = this.ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, Renderer.BG_START);
    grad.addColorStop(1, Renderer.BG_END);
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, w, h);
  }

  private drawGrid(ox: number, oy: number, size: number, cellSize: number): void {
    const ctx = this.ctx;

    ctx.save();
    ctx.strokeStyle = Renderer.GRID_LINE_COLOR;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    const padding = 4;
    const innerSize = size - padding * 2;
    const innerOx = ox + padding;
    const innerOy = oy + padding;

    for (let i = 0; i <= this.board.size; i++) {
      const pos = i * (innerSize / this.board.size);
      ctx.beginPath();
      ctx.moveTo(innerOx + pos, innerOy);
      ctx.lineTo(innerOx + pos, innerOy + innerSize);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(innerOx, innerOy + pos);
      ctx.lineTo(innerOx + innerSize, innerOy + pos);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(58, 95, 138, 0.7)';
    ctx.lineWidth = 3;
    ctx.strokeRect(innerOx, innerOy, innerSize, innerSize);

    ctx.restore();
  }

  private drawHoverHighlight(): void {
    if (!this.hoverCell) return;
    const { row, col } = this.hoverCell;
    if (!this.board.canPlace(row, col)) return;

    const { offsetX, offsetY, cellSize } = this.layout;
    const padding = 4;
    const innerSize = this.layout.boardSize - padding * 2;
    const cellInner = innerSize / this.board.size;
    const innerOx = offsetX + padding;
    const innerOy = offsetY + padding;

    const x = innerOx + col * cellInner;
    const y = innerOy + row * cellInner;

    this.ctx.save();
    this.ctx.fillStyle = Renderer.GRID_HOVER_COLOR;
    this.ctx.fillRect(x + 2, y + 2, cellInner - 4, cellInner - 4);
    this.ctx.restore();
  }

  private drawPiece(
    row: number,
    col: number,
    piece: PlacedPiece,
    now: number,
    ox: number,
    oy: number,
    cellSize: number
  ): void {
    const padding = 4;
    const innerSize = this.layout.boardSize - padding * 2;
    const cellInner = innerSize / this.board.size;
    const innerOx = ox + padding;
    const innerOy = oy + padding;

    const cx = innerOx + col * cellInner + cellInner / 2;
    const cy = innerOy + row * cellInner + cellInner / 2;

    let scale = piece.scale;
    const elapsedScale = now - piece.placedAt;
    const scaleDuration = 200;
    if (elapsedScale < scaleDuration) {
      scale = this.easeOutBack(elapsedScale / scaleDuration);
    } else {
      scale = 1;
    }

    let alpha = 1;
    let flashVisible = true;
    if (piece.isEliminating) {
      const elimElapsed = now - piece.eliminateStart;
      const elimDuration = 300;
      const flashes = 3;
      const flashDuration = elimDuration / (flashes * 2);
      const flashPhase = Math.floor(elimElapsed / flashDuration);
      flashVisible = flashPhase % 2 === 0;
      if (elimElapsed >= elimDuration) {
        alpha = 0;
      } else {
        alpha = 1 - (elimElapsed / elimDuration) * 0.5;
      }
      scale = 1 + (elimElapsed / elimDuration) * 0.1;
    }

    const baseRadius = (cellInner * 0.7) / 2;
    const radius = baseRadius * scale;

    if (radius <= 0 || alpha <= 0) return;
    if (!flashVisible && piece.isEliminating) return;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;

    const isRed = piece.player === 'red';
    const mainColor = isRed ? Renderer.RED_COLOR : Renderer.BLUE_COLOR;
    const glowColor = isRed ? Renderer.RED_GLOW : Renderer.BLUE_GLOW;
    const darkColor = isRed ? Renderer.RED_DARK : Renderer.BLUE_DARK;

    this.ctx.shadowColor = mainColor;
    this.ctx.shadowBlur = piece.isEliminating ? 20 : 12;

    const grad = this.ctx.createRadialGradient(
      cx - radius * 0.3,
      cy - radius * 0.3,
      radius * 0.1,
      cx,
      cy,
      radius
    );
    grad.addColorStop(0, glowColor);
    grad.addColorStop(0.5, mainColor);
    grad.addColorStop(1, darkColor);

    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = grad;
    this.ctx.fill();

    this.ctx.shadowBlur = 0;
    this.ctx.beginPath();
    this.ctx.arc(cx - radius * 0.25, cy - radius * 0.25, radius * 0.3, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius - 2, 0, Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();

    this.ctx.restore();
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
}
