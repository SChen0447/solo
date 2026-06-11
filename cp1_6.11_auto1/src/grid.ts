export interface HistoryState {
  pixels: string[][];
}

export interface GridOptions {
  width: number;
  height: number;
  cellSize?: number;
  bgColor?: string;
  gridColor?: string;
  hoverColor?: string;
  maxHistory?: number;
}

interface CellAnimation {
  startTime: number;
  type: 'bounce' | 'fade';
}

export class PixelGrid {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private cellSize: number;
  private pixels: string[][];
  private bgColor: string;
  private gridColor: string;
  private hoverColor: string;
  private currentColor: string = '#000000';
  private isDrawing: boolean = false;
  private isErasing: boolean = false;
  private hoverCell: { x: number; y: number } | null = null;
  private history: HistoryState[] = [];
  private historyIndex: number = -1;
  private maxHistory: number;
  private animatingCells: Map<string, CellAnimation> = new Map();
  private animationFrameId: number | null = null;
  private lastMoveTime: number = 0;
  private readonly MOVE_THROTTLE_MS: number = 16;

  constructor(canvas: HTMLCanvasElement, options: GridOptions) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = options.width;
    this.height = options.height;
    this.cellSize = options.cellSize || 10;
    this.bgColor = options.bgColor || '#1a1a2e';
    this.gridColor = options.gridColor || 'rgba(255, 255, 255, 0.1)';
    this.hoverColor = options.hoverColor || 'rgba(255, 255, 255, 0.15)';
    this.maxHistory = options.maxHistory || 20;
    this.pixels = this.createEmptyPixels();
    this.saveState();
    this.setupCanvas();
    this.bindEvents();
    this.startAnimationLoop();
  }

  private createEmptyPixels(): string[][] {
    const pixels: string[][] = [];
    for (let y = 0; y < this.height; y++) {
      pixels[y] = [];
      for (let x = 0; x < this.width; x++) {
        pixels[y][x] = '';
      }
    }
    return pixels;
  }

  private setupCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = this.width * this.cellSize;
    const displayHeight = this.height * this.cellSize;

    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;
    this.canvas.width = displayWidth * dpr;
    this.canvas.height = displayHeight * dpr;
    this.ctx.scale(dpr, dpr);
    this.ctx.imageSmoothingEnabled = false;
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this.isDrawing = true;
      this.isErasing = false;
    } else if (e.button === 2) {
      this.isErasing = true;
      this.isDrawing = false;
    } else {
      return;
    }

    this.saveState();
    this.applyToolAtEvent(e);
  }

  private handleMouseMove(e: MouseEvent): void {
    const now = performance.now();
    if (now - this.lastMoveTime < this.MOVE_THROTTLE_MS) {
      return;
    }
    this.lastMoveTime = now;

    const cell = this.getCellFromEvent(e);
    this.hoverCell = cell;

    if (this.isDrawing || this.isErasing) {
      this.applyToolAtEvent(e);
    }
  }

  private handleMouseUp(_e: MouseEvent): void {
    this.isDrawing = false;
    this.isErasing = false;
  }

  private handleMouseLeave(_e: MouseEvent): void {
    this.hoverCell = null;
    this.isDrawing = false;
    this.isErasing = false;
  }

  private handleContextMenu(e: MouseEvent): void {
    e.preventDefault();
  }

  private getCellFromEvent(e: MouseEvent): { x: number; y: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / this.cellSize);
    const y = Math.floor((e.clientY - rect.top) / this.cellSize);

    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      return { x, y };
    }
    return null;
  }

  private applyToolAtEvent(e: MouseEvent): void {
    const cell = this.getCellFromEvent(e);
    if (!cell) return;

    if (this.isDrawing) {
      this.setPixel(cell.x, cell.y, this.currentColor);
      this.addBounceAnimation(cell.x, cell.y);
    } else if (this.isErasing) {
      this.erasePixel(cell.x, cell.y);
      this.addBounceAnimation(cell.x, cell.y);
    }
  }

  private addBounceAnimation(x: number, y: number): void {
    const key = `${x},${y}`;
    this.animatingCells.set(key, {
      startTime: performance.now(),
      type: 'bounce'
    });
  }

  private startAnimationLoop(): void {
    const loop = () => {
      this.updateAnimations();
      this.render();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    loop();
  }

  private updateAnimations(): void {
    const now = performance.now();
    const toRemove: string[] = [];

    this.animatingCells.forEach((anim, key) => {
      const elapsed = now - anim.startTime;
      if (elapsed > 200) {
        toRemove.push(key);
      }
    });

    toRemove.forEach(key => this.animatingCells.delete(key));
  }

  private getBounceScale(elapsed: number): number {
    const duration = 200;
    const t = Math.min(elapsed / duration, 1);
    
    if (t < 0.3) {
      return 1 - 0.1 * (t / 0.3);
    } else if (t < 0.6) {
      return 0.9 + 0.15 * ((t - 0.3) / 0.3);
    } else {
      return 1.05 - 0.05 * ((t - 0.6) / 0.4);
    }
  }

  setCurrentColor(color: string): void {
    this.currentColor = color;
  }

  getCurrentColor(): string {
    return this.currentColor;
  }

  getPixel(x: number, y: number): string {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return '';
    }
    return this.pixels[y][x];
  }

  setPixel(x: number, y: number, color: string): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    if (this.pixels[y][x] === color) return;
    this.pixels[y][x] = color;
  }

  fillPixel(x: number, y: number, color: string): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.pixels[y][x] = color;
  }

  erasePixel(x: number, y: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.pixels[y][x] = '';
  }

  private render(): void {
    const ctx = this.ctx;
    const displayWidth = this.width * this.cellSize;
    const displayHeight = this.height * this.cellSize;

    ctx.fillStyle = this.bgColor;
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const color = this.pixels[y][x];
        if (color) {
          const key = `${x},${y}`;
          const anim = this.animatingCells.get(key);
          
          if (anim) {
            const elapsed = performance.now() - anim.startTime;
            const scale = this.getBounceScale(elapsed);
            const offset = (this.cellSize * (1 - scale)) / 2;
            const size = this.cellSize * scale;
            ctx.fillStyle = color;
            ctx.fillRect(
              x * this.cellSize + offset,
              y * this.cellSize + offset,
              size,
              size
            );
          } else {
            ctx.fillStyle = color;
            ctx.fillRect(
              x * this.cellSize,
              y * this.cellSize,
              this.cellSize,
              this.cellSize
            );
          }
        }
      }
    }

    this.renderGridLines();
    this.renderHover();
  }

  private renderGridLines(): void {
    const ctx = this.ctx;
    ctx.strokeStyle = this.gridColor;
    ctx.lineWidth = 1;

    for (let x = 0; x <= this.width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * this.cellSize + 0.5, 0);
      ctx.lineTo(x * this.cellSize + 0.5, this.height * this.cellSize);
      ctx.stroke();
    }

    for (let y = 0; y <= this.height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * this.cellSize + 0.5);
      ctx.lineTo(this.width * this.cellSize, y * this.cellSize + 0.5);
      ctx.stroke();
    }
  }

  private renderHover(): void {
    if (!this.hoverCell) return;

    const ctx = this.ctx;
    const { x, y } = this.hoverCell;

    ctx.fillStyle = this.hoverColor;
    ctx.fillRect(
      x * this.cellSize,
      y * this.cellSize,
      this.cellSize,
      this.cellSize
    );
  }

  setCellSize(size: number): void {
    this.cellSize = size;
    this.setupCanvas();
  }

  getCellSize(): number {
    return this.cellSize;
  }

  getGridWidth(): number {
    return this.width;
  }

  getGridHeight(): number {
    return this.height;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  resize(maxWidth: number, maxHeight: number): void {
    const cellByWidth = Math.floor(maxWidth / this.width);
    const cellByHeight = Math.floor(maxHeight / this.height);
    const newCellSize = Math.max(1, Math.min(cellByWidth, cellByHeight));
    this.setCellSize(newCellSize);
  }

  saveState(): void {
    const snapshot = this.pixels.map(row => [...row]);
    const state: HistoryState = { pixels: snapshot };

    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    this.history.push(state);

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  undo(): boolean {
    if (!this.canUndo()) return false;

    this.historyIndex--;
    const state = this.history[this.historyIndex];
    if (state) {
      this.pixels = state.pixels.map(row => [...row]);
    }
    return true;
  }

  redo(): boolean {
    if (!this.canRedo()) return false;

    this.historyIndex++;
    const state = this.history[this.historyIndex];
    if (state) {
      this.pixels = state.pixels.map(row => [...row]);
    }
    return true;
  }

  canUndo(): boolean {
    return this.historyIndex > 0;
  }

  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.animatingCells.clear();
  }
}
