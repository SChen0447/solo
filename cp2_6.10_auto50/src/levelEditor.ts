export type BlockType = 'ground' | 'spike' | 'coin' | 'enemy' | null;

export interface GridCell {
  x: number;
  y: number;
  type: BlockType;
}

export interface LevelData {
  grid: GridCell[];
}

export interface EditorCallbacks {
  onStatusUpdate?: (tool: BlockType, x: number, y: number) => void;
}

const BLOCK_COLORS: Record<string, string> = {
  ground: '#8B4513',
  spike: '#FF4500',
  coin: '#FFD700',
  enemy: '#800080'
};

const BLOCK_NAMES: Record<string, string> = {
  ground: '地面砖块',
  spike: '尖刺',
  coin: '金币',
  enemy: '敌人出生点'
};

const GRID_COLS = 12;
const GRID_ROWS = 8;
const CELL_SIZE = 40;
const MAX_HISTORY = 20;
const GRID_LINE_COLOR = '#4a4a4a';
const BG_COLOR = '#2a2a2a';

interface FadeAnimation {
  x: number;
  y: number;
  startTime: number;
  color: string;
}

export class LevelEditor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private grid: BlockType[][];
  private selectedTool: BlockType = null;
  private hoverCell: { x: number; y: number } | null = null;
  private history: BlockType[][][] = [];
  private fadeAnimations: FadeAnimation[] = [];
  private animationFrameId: number | null = null;
  private callbacks: EditorCallbacks;
  private cellSize: number = CELL_SIZE;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvas: HTMLCanvasElement, callbacks: EditorCallbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.callbacks = callbacks;
    this.canvasWidth = GRID_COLS * CELL_SIZE;
    this.canvasHeight = GRID_ROWS * CELL_SIZE;

    this.grid = [];
    for (let y = 0; y < GRID_ROWS; y++) {
      this.grid[y] = [];
      for (let x = 0; x < GRID_COLS; x++) {
        this.grid[y][x] = null;
      }
    }

    this.setupCanvas();
    this.bindEvents();
    this.startRenderLoop();
  }

  private setupCanvas(): void {
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    this.canvas.style.width = `${this.canvasWidth}px`;
    this.canvas.style.height = `${this.canvasHeight}px`;
  }

  public resize(maxHeight: number): void {
    const maxCellSize = Math.floor((maxHeight * 0.7) / GRID_ROWS);
    this.cellSize = Math.min(CELL_SIZE, Math.max(20, maxCellSize));
    this.canvasWidth = GRID_COLS * this.cellSize;
    this.canvasHeight = GRID_ROWS * this.cellSize;
    this.setupCanvas();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / this.cellSize);
    const y = Math.floor((e.clientY - rect.top) / this.cellSize);

    if (x >= 0 && x < GRID_COLS && y >= 0 && y < GRID_ROWS) {
      this.hoverCell = { x, y };
      if (this.callbacks.onStatusUpdate) {
        this.callbacks.onStatusUpdate(this.selectedTool, x, y);
      }
    } else {
      this.hoverCell = null;
    }
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / this.cellSize);
    const y = Math.floor((e.clientY - rect.top) / this.cellSize);

    if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return;
    if (this.selectedTool === null) return;

    this.placeBlock(x, y);
  }

  private handleContextMenu(e: MouseEvent): void {
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / this.cellSize);
    const y = Math.floor((e.clientY - rect.top) / this.cellSize);

    if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return;

    this.removeBlock(x, y);
  }

  private handleMouseLeave(): void {
    this.hoverCell = null;
  }

  public setSelectedTool(type: BlockType): void {
    this.selectedTool = type;
    if (this.callbacks.onStatusUpdate && this.hoverCell) {
      this.callbacks.onStatusUpdate(type, this.hoverCell.x, this.hoverCell.y);
    } else if (this.callbacks.onStatusUpdate) {
      this.callbacks.onStatusUpdate(type, -1, -1);
    }
  }

  public getSelectedTool(): BlockType {
    return this.selectedTool;
  }

  public placeBlock(x: number, y: number): void {
    if (this.selectedTool === null) return;
    if (this.grid[y][x] === this.selectedTool) return;

    this.saveHistory();
    this.grid[y][x] = this.selectedTool;
  }

  public removeBlock(x: number, y: number): void {
    if (this.grid[y][x] === null) return;

    const blockType = this.grid[y][x];
    this.saveHistory();

    this.fadeAnimations.push({
      x,
      y,
      startTime: performance.now(),
      color: BLOCK_COLORS[blockType!]
    });

    this.grid[y][x] = null;
  }

  public clearAll(): void {
    this.saveHistory();
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        this.grid[y][x] = null;
      }
    }
    this.fadeAnimations = [];
  }

  private saveHistory(): void {
    const snapshot: BlockType[][] = [];
    for (let y = 0; y < GRID_ROWS; y++) {
      snapshot[y] = [...this.grid[y]];
    }
    this.history.push(snapshot);
    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    }
  }

  public undo(): void {
    if (this.history.length === 0) return;
    const previousState = this.history.pop()!;
    this.grid = previousState;
  }

  public canUndo(): boolean {
    return this.history.length > 0;
  }

  public exportToJSON(): string {
    const cells: GridCell[] = [];
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        if (this.grid[y][x] !== null) {
          cells.push({ x, y, type: this.grid[y][x] });
        }
      }
    }
    const data: LevelData = { grid: cells };
    return JSON.stringify(data, null, 2);
  }

  private startRenderLoop(): void {
    const render = () => {
      this.render();
      this.animationFrameId = requestAnimationFrame(render);
    };
    this.animationFrameId = requestAnimationFrame(render);
  }

  public render(): void {
    const now = performance.now();
    const ctx = this.ctx;
    const cellSize = this.cellSize;

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    this.drawGridLines();

    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const blockType = this.grid[y][x];
        if (blockType !== null) {
          this.drawBlock(x, y, blockType);
        }
      }
    }

    this.fadeAnimations = this.fadeAnimations.filter(anim => {
      const elapsed = now - anim.startTime;
      const duration = 300;
      if (elapsed >= duration) return false;

      const alpha = 1 - (elapsed / duration);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = anim.color;
      ctx.fillRect(
        anim.x * cellSize + 2,
        anim.y * cellSize + 2,
        cellSize - 4,
        cellSize - 4
      );
      ctx.globalAlpha = 1;
      return true;
    });

    if (this.hoverCell) {
      this.drawHoverHighlight();
    }
  }

  private drawGridLines(): void {
    const ctx = this.ctx;
    const cellSize = this.cellSize;

    ctx.strokeStyle = GRID_LINE_COLOR;
    ctx.lineWidth = 1;

    for (let x = 0; x <= GRID_COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize + 0.5, 0);
      ctx.lineTo(x * cellSize + 0.5, this.canvasHeight);
      ctx.stroke();
    }

    for (let y = 0; y <= GRID_ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize + 0.5);
      ctx.lineTo(this.canvasWidth, y * cellSize + 0.5);
      ctx.stroke();
    }
  }

  private drawBlock(x: number, y: number, type: string): void {
    const ctx = this.ctx;
    const cellSize = this.cellSize;
    const px = x * cellSize;
    const py = y * cellSize;

    ctx.fillStyle = BLOCK_COLORS[type];
    ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(px + 2, py + 2, cellSize - 4, 4);
    ctx.fillRect(px + 2, py + 2, 4, cellSize - 4);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(px + 2, py + cellSize - 6, cellSize - 4, 4);
    ctx.fillRect(px + cellSize - 6, py + 2, 4, cellSize - 4);
  }

  private drawHoverHighlight(): void {
    if (!this.hoverCell) return;

    const ctx = this.ctx;
    const cellSize = this.cellSize;
    const { x, y } = this.hoverCell;
    const px = x * cellSize;
    const py = y * cellSize;

    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
    ctx.restore();
  }

  public getHoverCell(): { x: number; y: number } | null {
    return this.hoverCell;
  }

  public getBlockAt(x: number, y: number): BlockType {
    if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return null;
    return this.grid[y][x];
  }

  public static getBlockName(type: BlockType): string {
    if (type === null) return '无';
    return BLOCK_NAMES[type] || type;
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu.bind(this));
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave.bind(this));
  }
}
