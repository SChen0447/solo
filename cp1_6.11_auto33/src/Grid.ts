export type Direction = 0 | 1 | 2 | 3;
export const DIR_UP: Direction = 0;
export const DIR_RIGHT: Direction = 1;
export const DIR_DOWN: Direction = 2;
export const DIR_LEFT: Direction = 3;

export type MoveEvent = 'core' | 'vent' | 'wall' | 'none';

export interface MoveResult {
  success: boolean;
  newX: number;
  newY: number;
  event: MoveEvent;
}

export interface GridNode {
  x: number;
  y: number;
  connections: Direction[];
  hasCore: boolean;
  hasVent: boolean;
}

export type LayoutType = 'straight' | 'detour' | 'cross';

export interface LevelConfig {
  id: number;
  name: string;
  coreCount: number;
  ventCount: number;
  layout: LayoutType;
}

export const GRID_COLS = 10;
export const GRID_ROWS = 8;
export const CELL_SIZE = 80;

const DIR_DELTA: Record<Direction, { dx: number; dy: number }> = {
  [DIR_UP]: { dx: 0, dy: -1 },
  [DIR_RIGHT]: { dx: 1, dy: 0 },
  [DIR_DOWN]: { dx: 0, dy: 1 },
  [DIR_LEFT]: { dx: -1, dy: 0 },
};

function opposite(d: Direction): Direction {
  return ((d + 2) % 4) as Direction;
}

export class Grid {
  cols: number;
  rows: number;
  nodes: GridNode[][];
  corePositions: Array<{ x: number; y: number }>;
  ventPositions: Array<{ x: number; y: number }>;
  coresRemaining: number;
  private _cachedCanvas: HTMLCanvasElement | null = null;

  constructor(cols: number = GRID_COLS, rows: number = GRID_ROWS) {
    this.cols = cols;
    this.rows = rows;
    this.nodes = [];
    this.corePositions = [];
    this.ventPositions = [];
    this.coresRemaining = 0;
    this._initEmptyNodes();
  }

  private _initEmptyNodes(): void {
    this.nodes = [];
    for (let y = 0; y < this.rows; y++) {
      const row: GridNode[] = [];
      for (let x = 0; x < this.cols; x++) {
        row.push({
          x,
          y,
          connections: [],
          hasCore: false,
          hasVent: false,
        });
      }
      this.nodes.push(row);
    }
  }

  generateLevel(config: LevelConfig): void {
    this._initEmptyNodes();
    this.corePositions = [];
    this.ventPositions = [];

    switch (config.layout) {
      case 'straight':
        this._generateStraightLayout();
        break;
      case 'detour':
        this._generateDetourLayout();
        break;
      case 'cross':
        this._generateCrossLayout();
        break;
    }

    this._placeCores(config.coreCount);
    this._placeVents(config.ventCount);
    this.coresRemaining = this.corePositions.length;
    this._cachedCanvas = null;
  }

  private _connect(a: { x: number; y: number }, b: { x: number; y: number }): void {
    if (!this._inBounds(a.x, a.y) || !this._inBounds(b.x, b.y)) return;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    let dirA: Direction | null = null;
    if (dx === 1) dirA = DIR_RIGHT;
    else if (dx === -1) dirA = DIR_LEFT;
    else if (dy === 1) dirA = DIR_DOWN;
    else if (dy === -1) dirA = DIR_UP;
    if (dirA === null) return;
    const dirB = opposite(dirA);
    const nodeA = this.nodes[a.y][a.x];
    const nodeB = this.nodes[b.y][b.x];
    if (!nodeA.connections.includes(dirA)) nodeA.connections.push(dirA);
    if (!nodeB.connections.includes(dirB)) nodeB.connections.push(dirB);
  }

  private _generateStraightLayout(): void {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols - 1; x++) {
        this._connect({ x, y }, { x: x + 1, y });
      }
    }
    for (let x = 0; x < this.cols; x += 3) {
      for (let y = 0; y < this.rows - 1; y++) {
        this._connect({ x, y }, { x, y: y + 1 });
      }
    }
  }

  private _generateDetourLayout(): void {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols - 1; x++) {
        if (!(y === 3 && x >= 2 && x <= 6)) {
          this._connect({ x, y }, { x: x + 1, y });
        }
      }
    }
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows - 1; y++) {
        if (!(x === 5 && y >= 1 && y <= 5)) {
          this._connect({ x, y }, { x, y: y + 1 });
        }
      }
    }
    for (let y = 1; y <= 6; y += 2) {
      this._connect({ x: 0, y }, { x: 1, y });
    }
    this._ensureConnectivity();
  }

  private _generateCrossLayout(): void {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols - 1; x++) {
        this._connect({ x, y }, { x: x + 1, y });
      }
    }
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows - 1; y++) {
        this._connect({ x, y }, { x, y: y + 1 });
      }
    }
    const removePairs: Array<[number, number, Direction]> = [
      [2, 2, DIR_RIGHT],
      [7, 5, DIR_LEFT],
      [4, 1, DIR_DOWN],
      [5, 6, DIR_UP],
      [1, 4, DIR_RIGHT],
      [8, 3, DIR_LEFT],
    ];
    for (const [x, y, d] of removePairs) {
      this._removeConnection(x, y, d);
    }
    this._ensureConnectivity();
  }

  private _removeConnection(x: number, y: number, d: Direction): void {
    if (!this._inBounds(x, y)) return;
    const node = this.nodes[y][x];
    node.connections = node.connections.filter((c) => c !== d);
    const delta = DIR_DELTA[d];
    const nx = x + delta.dx;
    const ny = y + delta.dy;
    if (this._inBounds(nx, ny)) {
      const nb = this.nodes[ny][nx];
      nb.connections = nb.connections.filter((c) => c !== opposite(d));
    }
  }

  private _ensureConnectivity(): void {
    const visited = Array.from({ length: this.rows }, () =>
      Array(this.cols).fill(false),
    );
    const queue: Array<{ x: number; y: number }> = [{ x: 0, y: 0 }];
    visited[0][0] = true;
    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      const node = this.nodes[cur.y][cur.x];
      for (const d of node.connections) {
        const delta = DIR_DELTA[d];
        const nx = cur.x + delta.dx;
        const ny = cur.y + delta.dy;
        if (this._inBounds(nx, ny) && !visited[ny][nx]) {
          visited[ny][nx] = true;
          queue.push({ x: nx, y: ny });
        }
      }
    }
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (!visited[y][x]) {
          if (x > 0 && visited[y][x - 1]) {
            this._connect({ x: x - 1, y }, { x, y });
            visited[y][x] = true;
          } else if (y > 0 && visited[y - 1][x]) {
            this._connect({ x, y: y - 1 }, { x, y });
            visited[y][x] = true;
          }
        }
      }
    }
  }

  private _placeCores(count: number): void {
    const candidates: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (x === 0 && y === 0) continue;
        if (this.nodes[y][x].connections.length >= 2) {
          candidates.push({ x, y });
        }
      }
    }
    this._shuffle(candidates);
    for (let i = 0; i < Math.min(count, candidates.length); i++) {
      const pos = candidates[i];
      this.nodes[pos.y][pos.x].hasCore = true;
      this.corePositions.push(pos);
    }
  }

  private _placeVents(count: number): void {
    const candidates: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (x === 0 && y === 0) continue;
        if (this.nodes[y][x].hasCore) continue;
        if (this.nodes[y][x].connections.length >= 1) {
          candidates.push({ x, y });
        }
      }
    }
    this._shuffle(candidates);
    for (let i = 0; i < Math.min(count, candidates.length); i++) {
      const pos = candidates[i];
      this.nodes[pos.y][pos.x].hasVent = true;
      this.ventPositions.push(pos);
    }
  }

  private _shuffle<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  private _inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.cols && y >= 0 && y < this.rows;
  }

  getNode(x: number, y: number): GridNode | null {
    if (!this._inBounds(x, y)) return null;
    return this.nodes[y][x];
  }

  validateMove(fromX: number, fromY: number, direction: Direction): MoveResult {
    const fromNode = this.getNode(fromX, fromY);
    if (!fromNode) {
      return { success: false, newX: fromX, newY: fromY, event: 'wall' };
    }
    if (!fromNode.connections.includes(direction)) {
      return { success: false, newX: fromX, newY: fromY, event: 'wall' };
    }
    const delta = DIR_DELTA[direction];
    const nx = fromX + delta.dx;
    const ny = fromY + delta.dy;
    if (!this._inBounds(nx, ny)) {
      return { success: false, newX: fromX, newY: fromY, event: 'wall' };
    }
    const toNode = this.nodes[ny][nx];
    if (!toNode.connections.includes(opposite(direction))) {
      return { success: false, newX: fromX, newY: fromY, event: 'wall' };
    }
    let event: MoveEvent = 'none';
    if (toNode.hasCore) event = 'core';
    else if (toNode.hasVent) event = 'vent';
    return { success: true, newX: nx, newY: ny, event };
  }

  collectCore(x: number, y: number): boolean {
    const node = this.getNode(x, y);
    if (node && node.hasCore) {
      node.hasCore = false;
      this.corePositions = this.corePositions.filter(
        (p) => !(p.x === x && p.y === y),
      );
      this.coresRemaining = Math.max(0, this.coresRemaining - 1);
      return true;
    }
    return false;
  }

  render(
    ctx: CanvasRenderingContext2D,
    offsetX: number,
    offsetY: number,
    cellSize: number,
    time: number,
  ): void {
    if (this._cachedCanvas) {
      ctx.drawImage(this._cachedCanvas, offsetX, offsetY);
    } else {
      this._buildCache(cellSize);
      if (this._cachedCanvas) {
        ctx.drawImage(this._cachedCanvas, offsetX, offsetY);
      }
    }
    for (const pos of this.corePositions) {
      this._drawCore(
        ctx,
        offsetX + pos.x * cellSize + cellSize / 2,
        offsetY + pos.y * cellSize + cellSize / 2,
        cellSize * 0.28,
        time,
      );
    }
    for (const pos of this.ventPositions) {
      this._drawVent(
        ctx,
        offsetX + pos.x * cellSize + cellSize / 2,
        offsetY + pos.y * cellSize + cellSize / 2,
        cellSize * 0.25,
        time,
      );
    }
  }

  private _buildCache(cellSize: number): void {
    const canvas = document.createElement('canvas');
    canvas.width = this.cols * cellSize;
    canvas.height = this.rows * cellSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const node = this.nodes[y][x];
        const cx = x * cellSize + cellSize / 2;
        const cy = y * cellSize + cellSize / 2;

        for (const d of node.connections) {
          if (d === DIR_UP || d === DIR_LEFT) continue;
          const delta = DIR_DELTA[d];
          const nx = cx + delta.dx * cellSize;
          const ny = cy + delta.dy * cellSize;
          this._drawPipe(ctx, cx, cy, nx, ny, cellSize * 0.18);
        }

        this._drawNode(ctx, cx, cy, cellSize * 0.12);
      }
    }
    this._cachedCanvas = canvas;
  }

  private _drawPipe(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    width: number,
  ): void {
    ctx.save();
    ctx.strokeStyle = '#5a3a1d';
    ctx.lineWidth = width + 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const grad = ctx.createLinearGradient(x1, y1 - width, x1, y1 + width);
    grad.addColorStop(0, '#d49a5a');
    grad.addColorStop(0.5, '#b87333');
    grad.addColorStop(1, '#7a4a20');
    ctx.strokeStyle = grad;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 220, 160, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  private _drawNode(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
  ): void {
    ctx.save();
    ctx.fillStyle = '#3a2410';
    ctx.beginPath();
    ctx.arc(x, y, r + 3, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createRadialGradient(x - r / 3, y - r / 3, r / 4, x, y, r);
    grad.addColorStop(0, '#e0b070');
    grad.addColorStop(1, '#8a5a28');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2a1a0e';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private _drawCore(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    time: number,
  ): void {
    const pulse = 0.8 + 0.2 * Math.sin(time * 0.005);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(time * 0.002);
    ctx.globalAlpha = pulse;
    const teeth = 8;
    const inner = size * 0.55;
    const outer = size;
    ctx.fillStyle = '#ffb300';
    ctx.beginPath();
    for (let i = 0; i < teeth * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (i / (teeth * 2)) * Math.PI * 2;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, inner);
    grad.addColorStop(0, '#fff59d');
    grad.addColorStop(1, '#ffd700');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, inner * 0.85, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 18 * pulse;
    ctx.strokeStyle = '#fff176';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  private _drawVent(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    time: number,
  ): void {
    const pulse = 0.75 + 0.25 * Math.sin(time * 0.008);
    ctx.save();
    const grad = ctx.createRadialGradient(x, y, 0, x, y, size * 1.4);
    grad.addColorStop(0, 'rgba(255, 80, 80, 0.85)');
    grad.addColorStop(0.6, 'rgba(220, 20, 60, 0.7)');
    grad.addColorStop(1, 'rgba(220, 20, 60, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, size * 1.4 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#8b0000';
    ctx.beginPath();
    ctx.arc(x, y, size * 0.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#dc143c';
    ctx.beginPath();
    ctx.arc(x, y, size * 0.6 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffcdd2';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + time * 0.001;
      const rr = size * 0.35;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
