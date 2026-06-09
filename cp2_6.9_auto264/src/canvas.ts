export type PixelColor = string | null;
export type PixelMatrix = PixelColor[][];

export type ToolType = 'pencil' | 'eraser' | 'fill' | 'picker';
export type BrushSize = 1 | 3 | 5;

export interface CanvasState {
  currentTool: ToolType;
  currentColor: string;
  brushSize: BrushSize;
}

export interface CanvasCallbacks {
  onPixelChange?: () => void;
  onColorPick?: (color: string) => void;
}

const GRID_SIZE = 32;
const DEFAULT_CANVAS_SIZE = 640;
const PIXEL_SIZE = DEFAULT_CANVAS_SIZE / GRID_SIZE;
const GRID_LINE_COLOR = '#333333';
const BG_COLOR = '#000000';
const HOVER_HIGHLIGHT = 'rgba(255, 255, 255, 0.25)';

function createEmptyMatrix(): PixelMatrix {
  const matrix: PixelMatrix = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    matrix.push(new Array(GRID_SIZE).fill(null));
  }
  return matrix;
}

function cloneMatrix(matrix: PixelMatrix): PixelMatrix {
  return matrix.map(row => [...row]);
}

export class PixelCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private pixels: PixelMatrix;
  private state: CanvasState;
  private callbacks: CanvasCallbacks;
  private isDrawing = false;
  private hoverX = -1;
  private hoverY = -1;
  private pixelSize: number;
  private needsRender = false;
  private transformTransition = false;

  constructor(canvas: HTMLCanvasElement, callbacks: CanvasCallbacks = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas 2D上下文');
    this.ctx = ctx;
    this.pixels = createEmptyMatrix();
    this.pixelSize = PIXEL_SIZE;
    this.state = {
      currentTool: 'pencil',
      currentColor: '#FF0000',
      brushSize: 1
    };
    this.callbacks = callbacks;
    this.bindEvents();
    this.resize();
    this.scheduleRender();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));

    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const size = Math.min(parent.clientWidth, parent.clientHeight, 640);
    const dpr = window.devicePixelRatio || 1;
    this.canvas.style.width = size + 'px';
    this.canvas.style.height = size + 'px';
    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.pixelSize = size / GRID_SIZE;
    this.scheduleRender();
  }

  private getPixelCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) / this.pixelSize);
    const y = Math.floor((clientY - rect.top) / this.pixelSize);
    return { x, y };
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    const { x, y } = this.getPixelCoords(e.clientX, e.clientY);
    this.applyTool(x, y);
    this.isDrawing = true;
  }

  private handleMouseMove(e: MouseEvent): void {
    const { x, y } = this.getPixelCoords(e.clientX, e.clientY);
    this.hoverX = x;
    this.hoverY = y;
    if (this.isDrawing && this.state.currentTool !== 'fill' && this.state.currentTool !== 'picker') {
      this.applyTool(x, y);
    }
    this.scheduleRender();
  }

  private handleMouseUp(): void {
    this.isDrawing = false;
  }

  private handleMouseLeave(): void {
    this.isDrawing = false;
    this.hoverX = -1;
    this.hoverY = -1;
    this.scheduleRender();
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.touches[0];
    const { x, y } = this.getPixelCoords(touch.clientX, touch.clientY);
    this.applyTool(x, y);
    this.isDrawing = true;
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.touches[0];
    const { x, y } = this.getPixelCoords(touch.clientX, touch.clientY);
    this.hoverX = x;
    this.hoverY = y;
    if (this.isDrawing && this.state.currentTool !== 'fill' && this.state.currentTool !== 'picker') {
      this.applyTool(x, y);
    }
    this.scheduleRender();
  }

  private handleTouchEnd(): void {
    this.isDrawing = false;
    this.hoverX = -1;
    this.hoverY = -1;
    this.scheduleRender();
  }

  private applyTool(x: number, y: number): void {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;

    switch (this.state.currentTool) {
      case 'pencil':
        this.drawBrush(x, y, this.state.currentColor);
        break;
      case 'eraser':
        this.drawBrush(x, y, null);
        break;
      case 'fill':
        this.floodFill(x, y, this.state.currentColor);
        break;
      case 'picker':
        this.pickColor(x, y);
        break;
    }
  }

  private drawBrush(cx: number, cy: number, color: PixelColor): void {
    const half = Math.floor(this.state.brushSize / 2);
    let changed = false;
    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
          if (this.pixels[y][x] !== color) {
            this.pixels[y][x] = color;
            changed = true;
          }
        }
      }
    }
    if (changed) {
      this.scheduleRender();
      this.callbacks.onPixelChange?.();
    }
  }

  private floodFill(startX: number, startY: number, newColor: string): void {
    const targetColor = this.pixels[startY][startX];
    if (targetColor === newColor) return;

    const stack: Array<[number, number]> = [[startX, startY]];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) continue;
      if (this.pixels[y][x] !== targetColor) continue;

      visited.add(key);
      this.pixels[y][x] = newColor;

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    this.scheduleRender();
    this.callbacks.onPixelChange?.();
  }

  private pickColor(x: number, y: number): void {
    const color = this.pixels[y][x];
    if (color) {
      this.state.currentColor = color;
      this.callbacks.onColorPick?.(color);
    }
  }

  private scheduleRender(): void {
    if (this.needsRender) return;
    this.needsRender = true;
    requestAnimationFrame(() => this.render());
  }

  private render(): void {
    this.needsRender = false;
    const size = this.pixelSize * GRID_SIZE;

    this.ctx.save();

    if (this.transformTransition) {
      this.ctx.globalAlpha = 0.3;
    }

    this.ctx.fillStyle = BG_COLOR;
    this.ctx.fillRect(0, 0, size, size);

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const color = this.pixels[y][x];
        if (color) {
          this.ctx.fillStyle = color;
          this.ctx.fillRect(x * this.pixelSize, y * this.pixelSize, this.pixelSize, this.pixelSize);
        }
      }
    }

    this.ctx.globalAlpha = 1;
    this.ctx.strokeStyle = GRID_LINE_COLOR;
    this.ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(i * this.pixelSize, 0);
      this.ctx.lineTo(i * this.pixelSize, size);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.moveTo(0, i * this.pixelSize);
      this.ctx.lineTo(size, i * this.pixelSize);
      this.ctx.stroke();
    }

    if (this.hoverX >= 0 && this.hoverX < GRID_SIZE && this.hoverY >= 0 && this.hoverY < GRID_SIZE) {
      const half = Math.floor(this.state.brushSize / 2);
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          const px = this.hoverX + dx;
          const py = this.hoverY + dy;
          if (px >= 0 && px < GRID_SIZE && py >= 0 && py < GRID_SIZE) {
            if (this.state.currentTool === 'pencil' || this.state.currentTool === 'eraser') {
              this.ctx.fillStyle = this.state.currentTool === 'eraser'
                ? 'rgba(0, 0, 0, 0.3)'
                : this.hexToRgba(this.state.currentColor, 0.5);
              this.ctx.fillRect(px * this.pixelSize, py * this.pixelSize, this.pixelSize, this.pixelSize);
            }
            this.ctx.strokeStyle = HOVER_HIGHLIGHT;
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(
              px * this.pixelSize + 1,
              py * this.pixelSize + 1,
              this.pixelSize - 2,
              this.pixelSize - 2
            );
          }
        }
      }
    }

    this.ctx.restore();

    if (this.transformTransition) {
      setTimeout(() => {
        this.transformTransition = false;
        this.scheduleRender();
      }, 150);
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  setTool(tool: ToolType): void {
    this.state.currentTool = tool;
  }

  setColor(color: string): void {
    this.state.currentColor = color;
  }

  setBrushSize(size: BrushSize): void {
    this.state.brushSize = size;
  }

  getPixels(): PixelMatrix {
    return cloneMatrix(this.pixels);
  }

  setPixels(matrix: PixelMatrix): void {
    this.pixels = cloneMatrix(matrix);
    this.scheduleRender();
  }

  getState(): CanvasState {
    return { ...this.state };
  }

  flipHorizontal(): void {
    this.transformTransition = true;
    for (let y = 0; y < GRID_SIZE; y++) {
      this.pixels[y].reverse();
    }
    this.scheduleRender();
    this.callbacks.onPixelChange?.();
  }

  flipVertical(): void {
    this.transformTransition = true;
    this.pixels.reverse();
    this.scheduleRender();
    this.callbacks.onPixelChange?.();
  }

  rotate90(): void {
    this.transformTransition = true;
    const rotated: PixelMatrix = createEmptyMatrix();
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        rotated[x][GRID_SIZE - 1 - y] = this.pixels[y][x];
      }
    }
    this.pixels = rotated;
    this.scheduleRender();
    this.callbacks.onPixelChange?.();
  }

  clear(): void {
    this.pixels = createEmptyMatrix();
    this.scheduleRender();
    this.callbacks.onPixelChange?.();
  }
}
