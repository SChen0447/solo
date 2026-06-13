import {
  hexToRgba,
  easeOutElastic,
  easeOutCubic,
  triggerEffect,
  removePulseAt,
  renderEffects,
  updateEffects
} from './effects';

export type StoneState = 'dropping' | 'idle' | 'merging' | 'undoing';

export interface Stone {
  gridX: number;
  gridY: number;
  color: string;
  state: StoneState;
  animProgress: number;
  animDuration: number;
  offsetX: number;
  offsetY: number;
  targetOffsetX: number;
  targetOffsetY: number;
  hovered: boolean;
}

export interface MergeLine {
  aX: number;
  aY: number;
  bX: number;
  bY: number;
  colorA: string;
  colorB: string;
  mixedColor: string;
}

export interface RecentMove {
  color: string;
}

export interface BoardCallbacks {
  onClick: (gridX: number, gridY: number) => void;
  onHover: (gridX: number | null, gridY: number | null) => void;
}

const GRID_COUNT = 19;
const COLOR_PALETTE = [
  '#ff6b6b',
  '#ff9ff3',
  '#48dbfb',
  '#feca57',
  '#54a0ff',
  '#a29bfe'
];
const GOLD = '#d4af37';

export class Board {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number = 1;

  private canvasPixelSize: number = 0;
  private boardSize: number = 0;
  private boardOffset: number = 0;
  private cellSize: number = 0;
  private stoneRadius: number = 10;
  private scaleFactor: number = 1;

  public stones: Stone[] = [];
  public mergeLines: MergeLine[] = [];

  private turnCount: number = 0;
  private recentMoves: RecentMove[] = [];

  private callbacks: BoardCallbacks;
  private hoverGridX: number | null = null;
  private hoverGridY: number | null = null;
  private hoverStone: Stone | null = null;

  private starPoints: Array<[number, number]> = [
    [3, 3], [9, 3], [15, 3],
    [3, 9], [9, 9], [15, 9],
    [3, 15], [9, 15], [15, 15]
  ];

  constructor(canvas: HTMLCanvasElement, callbacks: BoardCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.bindEvents();
  }

  resize(viewportSize: number): void {
    this.dpr = window.devicePixelRatio || 1;
    const isMobile = window.innerWidth < 768;
    this.scaleFactor = isMobile ? 0.8 : 1;

    this.canvasPixelSize = Math.floor(viewportSize * this.dpr);
    this.canvas.width = this.canvasPixelSize;
    this.canvas.height = this.canvasPixelSize;
    this.canvas.style.width = viewportSize + 'px';
    this.canvas.style.height = viewportSize + 'px';

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.boardSize = viewportSize * 0.9;
    this.boardOffset = (viewportSize - this.boardSize) / 2;
    this.cellSize = this.boardSize / (GRID_COUNT - 1);
    this.stoneRadius = this.cellSize * 0.45;
  }

  getPixelSize(): number {
    return this.canvasPixelSize / this.dpr;
  }

  getBoardMetrics() {
    return {
      boardSize: this.boardSize,
      boardOffset: this.boardOffset,
      cellSize: this.cellSize,
      stoneRadius: this.stoneRadius,
      scaleFactor: this.scaleFactor
    };
  }

  gridToPixel(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: this.boardOffset + gridX * this.cellSize,
      y: this.boardOffset + gridY * this.cellSize
    };
  }

  pixelToGrid(px: number, py: number): { gridX: number; gridY: number } | null {
    const gx = (px - this.boardOffset) / this.cellSize;
    const gy = (py - this.boardOffset) / this.cellSize;
    const rx = Math.round(gx);
    const ry = Math.round(gy);
    const dx = gx - rx;
    const dy = gy - ry;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0.5) return null;
    if (rx < 0 || rx >= GRID_COUNT || ry < 0 || ry >= GRID_COUNT) return null;
    return { gridX: rx, gridY: ry };
  }

  getRandomColor(): string {
    return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
  }

  findStone(gridX: number, gridY: number): Stone | undefined {
    return this.stones.find(s => s.gridX === gridX && s.gridY === gridY && s.state !== 'undoing');
  }

  addStone(gridX: number, gridY: number, color: string): Stone {
    const stone: Stone = {
      gridX,
      gridY,
      color,
      state: 'dropping',
      animProgress: 0,
      animDuration: 0.3,
      offsetX: 0,
      offsetY: 0,
      targetOffsetX: 0,
      targetOffsetY: 0,
      hovered: false
    };
    this.stones.push(stone);
    return stone;
  }

  removeStone(gridX: number, gridY: number): Stone | null {
    const idx = this.stones.findIndex(s => s.gridX === gridX && s.gridY === gridY);
    if (idx < 0) return null;
    const stone = this.stones[idx];
    stone.state = 'undoing';
    stone.animProgress = 0;
    stone.animDuration = 0.3;
    return stone;
  }

  setStoneOffset(gridX: number, gridY: number, ox: number, oy: number): void {
    const s = this.findStone(gridX, gridY);
    if (s) {
      s.targetOffsetX = ox;
      s.targetOffsetY = oy;
      s.state = 'merging';
    }
  }

  addMergeLine(
    ax: number, ay: number, bx: number, by: number,
    colorA: string, colorB: string, mixedColor: string
  ): void {
    const existing = this.mergeLines.find(l =>
      (l.aX === ax && l.aY === ay && l.bX === bx && l.bY === by) ||
      (l.aX === bx && l.aY === by && l.bX === ax && l.bY === ay)
    );
    if (!existing) {
      this.mergeLines.push({ aX: ax, aY: ay, bX: bx, bY: by, colorA, colorB, mixedColor });
    }
  }

  removeMergeLine(ax: number, ay: number, bx: number, by: number): void {
    const idx = this.mergeLines.findIndex(l =>
      (l.aX === ax && l.aY === ay && l.bX === bx && l.bY === by) ||
      (l.aX === bx && l.aY === by && l.bX === ax && l.bY === ay)
    );
    if (idx >= 0) {
      const line = this.mergeLines[idx];
      const midX = (ax + bx) / 2;
      const midY = (ay + by) / 2;
      const mid = this.gridToPixel(midX, midY);
      removePulseAt(mid.x, mid.y);
      this.mergeLines.splice(idx, 1);
    }
  }

  clearAllMergeLines(): void {
    for (const line of this.mergeLines) {
      const midX = (line.aX + line.bX) / 2;
      const midY = (line.aY + line.bY) / 2;
      const mid = this.gridToPixel(midX, midY);
      removePulseAt(mid.x, mid.y);
    }
    this.mergeLines.length = 0;
  }

  updateTurnCount(n: number): void {
    this.turnCount = n;
  }

  updateRecentMoves(moves: RecentMove[]): void {
    this.recentMoves = moves.slice(-5);
  }

  updateStones(deltaTime: number): void {
    for (let i = this.stones.length - 1; i >= 0; i--) {
      const s = this.stones[i];

      const lerpSpeed = Math.min(1, deltaTime * 10);
      s.offsetX += (s.targetOffsetX - s.offsetX) * lerpSpeed;
      s.offsetY += (s.targetOffsetY - s.offsetY) * lerpSpeed;

      if (s.state === 'dropping' || s.state === 'undoing') {
        s.animProgress += deltaTime / s.animDuration;
        if (s.animProgress >= 1) {
          s.animProgress = 1;
          if (s.state === 'dropping') {
            s.state = Math.abs(s.targetOffsetX) > 0.01 || Math.abs(s.targetOffsetY) > 0.01 ? 'merging' : 'idle';
          } else if (s.state === 'undoing') {
            this.stones.splice(i, 1);
          }
        }
      } else if (s.state === 'merging') {
        if (Math.abs(s.targetOffsetX - s.offsetX) < 0.05 && Math.abs(s.targetOffsetY - s.offsetY) < 0.05) {
          s.state = 'idle';
        }
      }

      if (this.hoverGridX === s.gridX && this.hoverGridY === s.gridY) {
        s.hovered = true;
        this.hoverStone = s;
      } else {
        s.hovered = false;
      }
    }
  }

  private bindEvents(): void {
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const pos = this.pixelToGrid(px, py);
      if (pos) {
        this.callbacks.onClick(pos.gridX, pos.gridY);
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const pos = this.pixelToGrid(px, py);
      if (pos) {
        this.hoverGridX = pos.gridX;
        this.hoverGridY = pos.gridY;
        this.callbacks.onHover(pos.gridX, pos.gridY);
      } else {
        this.hoverGridX = null;
        this.hoverGridY = null;
        this.hoverStone = null;
        this.callbacks.onHover(null, null);
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoverGridX = null;
      this.hoverGridY = null;
      this.hoverStone = null;
      this.callbacks.onHover(null, null);
    });
  }

  triggerHoverTrail(stone: Stone): void {
    const pos = this.gridToPixel(stone.gridX, stone.gridY);
    const centerX = this.canvasPixelSize / this.dpr / 2;
    const centerY = this.canvasPixelSize / this.dpr / 2;
    const dx = pos.x - centerX;
    const dy = pos.y - centerY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    const farX = pos.x + (dx / len) * 400;
    const farY = pos.y + (dy / len) * 400;
    triggerEffect('trail', {
      startX: pos.x + stone.offsetX,
      startY: pos.y + stone.offsetY,
      endX: farX,
      endY: farY,
      color: stone.color,
      duration: 0.3
    });
  }

  render(deltaTime: number): void {
    const ctx = this.ctx;
    const size = this.canvasPixelSize / this.dpr;

    updateEffects(deltaTime);
    this.updateStones(deltaTime);

    ctx.clearRect(0, 0, size, size);
    this.drawBoardBackground(ctx, size);
    this.drawGrid(ctx);
    this.drawMergeLines(ctx);
    this.drawStones(ctx);
    this.drawUI(ctx, size);
    renderEffects(ctx);
  }

  private drawBoardBackground(ctx: CanvasRenderingContext2D, size: number): void {
    const pad = this.boardOffset * 0.4;
    const x = this.boardOffset - pad;
    const y = this.boardOffset - pad;
    const w = this.boardSize + pad * 2;
    const h = this.boardSize + pad * 2;

    const bgGrad = ctx.createLinearGradient(x, y, x + w, y + h);
    bgGrad.addColorStop(0, '#1a0f1e');
    bgGrad.addColorStop(1, '#2d1b3a');
    ctx.fillStyle = bgGrad;
    this.roundRect(ctx, x, y, w, h, 12);
    ctx.fill();

    ctx.strokeStyle = hexToRgba(GOLD, 0.2);
    ctx.lineWidth = 1;
    this.roundRect(ctx, x, y, w, h, 12);
    ctx.stroke();

    ctx.save();
    ctx.globalAlpha = 0.06;
    for (let i = 0; i < 30; i++) {
      const lx = x + (i * 37 % w);
      const ly = y + (i * 71 % h);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + 30 + (i % 10) * 5, ly + 10);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = hexToRgba(GOLD, 0.4);
    ctx.lineWidth = 1;

    for (let i = 0; i < GRID_COUNT; i++) {
      const p1 = this.gridToPixel(i, 0);
      const p2 = this.gridToPixel(i, GRID_COUNT - 1);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      const p3 = this.gridToPixel(0, i);
      const p4 = this.gridToPixel(GRID_COUNT - 1, i);
      ctx.beginPath();
      ctx.moveTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.stroke();
    }

    ctx.fillStyle = hexToRgba(GOLD, 0.5);
    for (const [gx, gy] of this.starPoints) {
      const p = this.gridToPixel(gx, gy);
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.cellSize * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawMergeLines(ctx: CanvasRenderingContext2D): void {
    for (const line of this.mergeLines) {
      const stoneA = this.findStone(line.aX, line.aY);
      const stoneB = this.findStone(line.bX, line.bY);
      if (!stoneA || !stoneB) continue;

      const pA = this.gridToPixel(line.aX, line.aY);
      const pB = this.gridToPixel(line.bX, line.bY);
      const ax = pA.x + stoneA.offsetX;
      const ay = pA.y + stoneA.offsetY;
      const bx = pB.x + stoneB.offsetX;
      const by = pB.y + stoneB.offsetY;

      const grad = ctx.createLinearGradient(ax, ay, bx, by);
      grad.addColorStop(0, hexToRgba(line.colorA, 0.9));
      grad.addColorStop(0.5, hexToRgba(line.mixedColor, 1));
      grad.addColorStop(1, hexToRgba(line.colorB, 0.9));

      ctx.save();
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.shadowColor = hexToRgba(line.mixedColor, 0.8);
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawStones(ctx: CanvasRenderingContext2D): void {
    for (const s of this.stones) {
      const pos = this.gridToPixel(s.gridX, s.gridY);
      let radius = this.stoneRadius;
      let drawY = pos.y + s.offsetY;
      let scale = 1;
      let alpha = 1;
      const glowMul = s.hovered ? 1.5 : 1;

      if (s.state === 'dropping') {
        const t = Math.min(1, s.animProgress);
        const eased = easeOutElastic(t);
        scale = eased;
        const bounce = Math.sin(t * Math.PI * 2) * (1 - t) * radius * 2;
        drawY = pos.y + s.offsetY - bounce;
      } else if (s.state === 'undoing') {
        const t = Math.min(1, s.animProgress);
        const eased = easeOutCubic(t);
        scale = 1 - eased;
        alpha = 1 - eased;
      }

      const r = Math.max(0.5, radius * scale);
      const cx = pos.x + s.offsetX;
      const cy = drawY;

      ctx.save();
      ctx.globalAlpha = alpha;

      const glowR = r + 3 * glowMul;
      const glowGrad = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, glowR * 2);
      glowGrad.addColorStop(0, hexToRgba(s.color, 0.35 * glowMul));
      glowGrad.addColorStop(0.5, hexToRgba(s.color, 0.12 * glowMul));
      glowGrad.addColorStop(1, hexToRgba(s.color, 0));
      ctx.beginPath();
      ctx.arc(cx, cy, glowR * 2, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();

      const bodyGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
      bodyGrad.addColorStop(0, hexToRgba(s.color, 0.95));
      bodyGrad.addColorStop(0.6, hexToRgba(s.color, 0.65));
      bodyGrad.addColorStop(1, hexToRgba(s.color, 0.35));
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = bodyGrad;
      ctx.shadowColor = hexToRgba(s.color, 0.5);
      ctx.shadowBlur = 10 * glowMul;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(cx - r * 0.35, cy - r * 0.35, r * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fill();

      ctx.restore();
    }
  }

  private drawUI(ctx: CanvasRenderingContext2D, size: number): void {
    const isMobile = window.innerWidth < 768;
    const fontSize = (isMobile ? 19.2 : 24);
    const pad = this.boardOffset * 0.5;

    ctx.save();
    ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = GOLD;
    ctx.shadowBlur = 10;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText(`回合 ${this.turnCount}`, pad, pad);
    ctx.restore();

    const dotSize = isMobile ? 6.4 : 8;
    const dotGap = isMobile ? 3.2 : 4;
    const totalW = this.recentMoves.length * dotSize + Math.max(0, this.recentMoves.length - 1) * dotGap;
    let startX = size - pad - totalW;

    for (let i = 0; i < this.recentMoves.length; i++) {
      const move = this.recentMoves[i];
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.arc(startX + dotSize / 2, pad + dotSize / 2 + (fontSize - dotSize) / 2, dotSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = move.color;
      ctx.shadowColor = hexToRgba(move.color, 0.6);
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.restore();
      startX += dotSize + dotGap;
    }
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
}
