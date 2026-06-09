export type ToolType = 'brush' | 'eraser' | 'picker';

export interface PixelBoardOptions {
  gridSize: number;
  pixelSize: number;
  onPixelChange?: (x: number, y: number, color: string) => void;
  onColorPick?: (color: string) => void;
}

export class PixelBoard {
  private canvas: HTMLCanvasElement;
  private overlayCanvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private overlayCtx: CanvasRenderingContext2D;
  private gridSize: number;
  private pixelSize: number;
  private pixels: string[][];
  private currentColor: string;
  private currentTool: ToolType;
  private isDrawing: boolean;
  private lastPixel: { x: number; y: number } | null;
  private hoveredPixel: { x: number; y: number } | null;
  private onPixelChange?: (x: number, y: number, color: string) => void;
  private onColorPick?: (color: string) => void;

  public static readonly DEFAULT_COLORS: string[] = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00',
    '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
    '#FF8800', '#8800FF', '#0088FF', '#00FF88',
    '#FF8888', '#88FF88', '#8888FF', '#888888'
  ];

  constructor(
    canvas: HTMLCanvasElement,
    overlayCanvas: HTMLCanvasElement,
    options: PixelBoardOptions
  ) {
    this.canvas = canvas;
    this.overlayCanvas = overlayCanvas;
    const ctx = canvas.getContext('2d');
    const overlayCtx = overlayCanvas.getContext('2d');
    if (!ctx || !overlayCtx) {
      throw new Error('Failed to get canvas contexts');
    }
    this.ctx = ctx;
    this.overlayCtx = overlayCtx;
    this.gridSize = options.gridSize;
    this.pixelSize = options.pixelSize;
    this.currentColor = '#000000';
    this.currentTool = 'brush';
    this.isDrawing = false;
    this.lastPixel = null;
    this.hoveredPixel = null;
    this.onPixelChange = options.onPixelChange;
    this.onColorPick = options.onColorPick;
    this.pixels = this.createEmptyPixels();
    this.resize();
    this.bindEvents();
    this.render();
  }

  private createEmptyPixels(): string[][] {
    const pixels: string[][] = [];
    for (let y = 0; y < this.gridSize; y++) {
      pixels[y] = [];
      for (let x = 0; x < this.gridSize; x++) {
        pixels[y][x] = '#FFFFFF';
      }
    }
    return pixels;
  }

  public resize(): void {
    const totalSize = this.gridSize * this.pixelSize;
    this.canvas.width = totalSize;
    this.canvas.height = totalSize;
    this.overlayCanvas.width = totalSize;
    this.overlayCanvas.height = totalSize;
    this.canvas.style.width = totalSize + 'px';
    this.canvas.style.height = totalSize + 'px';
    this.overlayCanvas.style.width = totalSize + 'px';
    this.overlayCanvas.style.height = totalSize + 'px';
    this.render();
  }

  public setPixelSize(size: number): void {
    this.pixelSize = size;
    this.resize();
  }

  public setColor(color: string): void {
    this.currentColor = color;
  }

  public getColor(): string {
    return this.currentColor;
  }

  public setTool(tool: ToolType): void {
    this.currentTool = tool;
    this.updateCursor();
  }

  public getTool(): ToolType {
    return this.currentTool;
  }

  private updateCursor(): void {
    switch (this.currentTool) {
      case 'brush':
        this.canvas.style.cursor = 'crosshair';
        break;
      case 'eraser':
        this.canvas.style.cursor = 'crosshair';
        break;
      case 'picker':
        this.canvas.style.cursor = 'pointer';
        break;
    }
  }

  public getPixels(): string[][] {
    return this.pixels.map(row => [...row]);
  }

  public setPixels(pixels: string[][]): void {
    if (pixels.length !== this.gridSize || pixels[0].length !== this.gridSize) {
      return;
    }
    this.pixels = pixels.map(row => [...row]);
    this.render();
  }

  public clear(): void {
    this.pixels = this.createEmptyPixels();
    this.render();
  }

  public getGridSize(): number {
    return this.gridSize;
  }

  public getPixelSize(): number {
    return this.pixelSize;
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    document.addEventListener('mouseup', this.handleDocumentMouseUp);
  }

  public destroy(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('mouseup', this.handleDocumentMouseUp);
  }

  private getPixelPosition(e: MouseEvent): { x: number; y: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / this.pixelSize);
    const y = Math.floor((e.clientY - rect.top) / this.pixelSize);
    if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) {
      return null;
    }
    return { x, y };
  }

  private handleMouseDown = (e: MouseEvent): void => {
    const pos = this.getPixelPosition(e);
    if (!pos) return;

    if (this.currentTool === 'picker') {
      const color = this.pixels[pos.y][pos.x];
      this.currentColor = color;
      if (this.onColorPick) {
        this.onColorPick(color);
      }
      this.currentTool = 'brush';
      this.updateCursor();
      return;
    }

    this.isDrawing = true;
    this.lastPixel = pos;
    this.applyTool(pos.x, pos.y);
  };

  private handleMouseMove = (e: MouseEvent): void => {
    const pos = this.getPixelPosition(e);
    
    if (this.hoveredPixel?.x !== pos?.x || this.hoveredPixel?.y !== pos?.y) {
      this.hoveredPixel = pos;
      this.renderOverlay();
    }

    if (!this.isDrawing || !pos) return;

    if (this.lastPixel) {
      this.drawLine(this.lastPixel.x, this.lastPixel.y, pos.x, pos.y);
    } else {
      this.applyTool(pos.x, pos.y);
    }
    this.lastPixel = pos;
  };

  private handleMouseLeave = (): void => {
    this.hoveredPixel = null;
    this.renderOverlay();
  };

  private handleMouseUp = (): void => {
    this.isDrawing = false;
    this.lastPixel = null;
  };

  private handleDocumentMouseUp = (): void => {
    this.isDrawing = false;
    this.lastPixel = null;
  };

  private drawLine(x0: number, y0: number, x1: number, y1: number): void {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let x = x0;
    let y = y0;

    while (true) {
      this.applyTool(x, y);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  private applyTool(x: number, y: number): void {
    switch (this.currentTool) {
      case 'brush':
        this.setPixel(x, y, this.currentColor);
        break;
      case 'eraser':
        this.setPixel(x, y, '#FFFFFF');
        break;
      case 'picker':
        break;
    }
  }

  private setPixel(x: number, y: number, color: string): void {
    if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) return;
    if (this.pixels[y][x] === color) return;
    this.pixels[y][x] = color;
    this.renderPixel(x, y);
    if (this.onPixelChange) {
      this.onPixelChange(x, y, color);
    }
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        this.renderPixel(x, y);
      }
    }
    this.renderOverlay();
  }

  private renderPixel(x: number, y: number): void {
    const px = x * this.pixelSize;
    const py = y * this.pixelSize;
    this.ctx.fillStyle = this.pixels[y][x];
    this.ctx.fillRect(px, py, this.pixelSize, this.pixelSize);
    this.ctx.strokeStyle = '#CCCCCC';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(px + 0.5, py + 0.5, this.pixelSize - 1, this.pixelSize - 1);
  }

  private renderOverlay(): void {
    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    if (!this.hoveredPixel) return;
    const { x, y } = this.hoveredPixel;
    const px = x * this.pixelSize;
    const py = y * this.pixelSize;
    this.overlayCtx.fillStyle = 'rgba(0, 120, 255, 0.3)';
    this.overlayCtx.fillRect(px, py, this.pixelSize, this.pixelSize);
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
