import { Tool, hexToRgba, rgbaToHex } from './types.js';

export interface PixelCanvasOptions {
  size: number;
  onColorPick?: (hex: string) => void;
  onChange?: () => void;
}

export class PixelCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private previewCtx: CanvasRenderingContext2D;
  private previewCanvas: HTMLCanvasElement;
  private size: number;
  private pixelSize: number = 12;
  private imageData!: ImageData;
  private history: Uint8ClampedArray[] = [];
  private historyIndex: number = -1;
  private maxHistory: number = 50;
  private isDrawing: boolean = false;
  private currentTool: Tool = 'pencil1';
  private currentColor: string = '#000000';
  private lastX: number = -1;
  private lastY: number = -1;
  private onColorPick?: (hex: string) => void;
  private onChange?: () => void;

  constructor(canvas: HTMLCanvasElement, previewCanvas: HTMLCanvasElement, options: PixelCanvasOptions) {
    this.canvas = canvas;
    this.previewCanvas = previewCanvas;
    this.size = options.size;
    this.onColorPick = options.onColorPick;
    this.onChange = options.onChange;

    const ctx = canvas.getContext('2d');
    const pctx = previewCanvas.getContext('2d');
    if (!ctx || !pctx) throw new Error('无法获取 Canvas 上下文');
    this.ctx = ctx;
    this.previewCtx = pctx;

    this.setupCanvas();
    this.bindEvents();
  }

  private setupCanvas(): void {
    const wrapper = this.canvas.parentElement;
    if (wrapper) {
      const maxSize = Math.min(wrapper.clientWidth - 40, wrapper.clientHeight - 40);
      this.pixelSize = Math.max(6, Math.floor(maxSize / this.size));
    }
    const pixelCount = this.size * this.pixelSize;
    this.canvas.width = pixelCount;
    this.canvas.height = pixelCount;
    this.ctx.imageSmoothingEnabled = false;

    this.previewCanvas.width = this.size;
    this.previewCanvas.height = this.size;
    this.previewCtx.imageSmoothingEnabled = false;

    this.imageData = this.ctx.createImageData(this.size, this.size);
    this.clear();
    this.saveHistory();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.onMouseUp());
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private getPixelPos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / this.pixelSize);
    const y = Math.floor((e.clientY - rect.top) / this.pixelSize);
    return { x: Math.max(0, Math.min(this.size - 1, x)), y: Math.max(0, Math.min(this.size - 1, y)) };
  }

  private onMouseDown(e: MouseEvent): void {
    const { x, y } = this.getPixelPos(e);
    this.isDrawing = true;
    this.lastX = x;
    this.lastY = y;

    if (this.currentTool === 'picker') {
      this.pickColor(x, y);
    } else if (this.currentTool === 'fill') {
      this.floodFill(x, y);
      this.saveHistory();
      this.render();
      this.onChange?.();
    } else {
      this.applyTool(x, y);
      this.render();
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDrawing) return;
    const { x, y } = this.getPixelPos(e);

    if (this.currentTool === 'picker' || this.currentTool === 'fill') return;

    if (this.lastX !== -1 && this.lastY !== -1) {
      this.drawLine(this.lastX, this.lastY, x, y);
    } else {
      this.applyTool(x, y);
    }

    this.lastX = x;
    this.lastY = y;
    this.render();
  }

  private onMouseUp(): void {
    if (this.isDrawing && this.currentTool !== 'picker' && this.currentTool !== 'fill') {
      this.saveHistory();
      this.onChange?.();
    }
    this.isDrawing = false;
    this.lastX = -1;
    this.lastY = -1;
  }

  private pickColor(x: number, y: number): void {
    const idx = (y * this.size + x) * 4;
    const r = this.imageData.data[idx];
    const g = this.imageData.data[idx + 1];
    const b = this.imageData.data[idx + 2];
    const a = this.imageData.data[idx + 3];
    if (a === 0) return;
    const hex = rgbaToHex(r, g, b);
    this.currentColor = hex;
    this.onColorPick?.(hex);
  }

  private applyTool(x: number, y: number): void {
    if (this.currentTool === 'pencil1') {
      this.setPixel(x, y, this.currentColor);
    } else if (this.currentTool === 'pencil3') {
      this.drawBrush(x, y, 1, this.currentColor);
    } else if (this.currentTool === 'eraser') {
      this.drawBrush(x, y, 1, null);
    }
  }

  private drawBrush(cx: number, cy: number, radius: number, color: string | null): void {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < this.size && y >= 0 && y < this.size) {
          if (color) {
            this.setPixel(x, y, color);
          } else {
            this.clearPixel(x, y);
          }
        }
      }
    }
  }

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
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
  }

  private setPixel(x: number, y: number, hex: string): void {
    const [r, g, b, a] = hexToRgba(hex, 255);
    const idx = (y * this.size + x) * 4;
    this.imageData.data[idx] = r;
    this.imageData.data[idx + 1] = g;
    this.imageData.data[idx + 2] = b;
    this.imageData.data[idx + 3] = a;
  }

  private clearPixel(x: number, y: number): void {
    const idx = (y * this.size + x) * 4;
    this.imageData.data[idx + 3] = 0;
  }

  private getPixel(x: number, y: number): [number, number, number, number] {
    const idx = (y * this.size + x) * 4;
    return [
      this.imageData.data[idx],
      this.imageData.data[idx + 1],
      this.imageData.data[idx + 2],
      this.imageData.data[idx + 3]
    ];
  }

  private floodFill(startX: number, startY: number): void {
    const targetColor = this.getPixel(startX, startY);
    const [tr, tg, tb, ta] = targetColor;
    const [nr, ng, nb, na] = hexToRgba(this.currentColor, 255);

    if (tr === nr && tg === ng && tb === nb && ta === na) return;

    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<number>();

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = y * this.size + x;
      if (visited.has(key)) continue;
      if (x < 0 || x >= this.size || y < 0 || y >= this.size) continue;

      const [r, g, b, a] = this.getPixel(x, y);
      if (r !== tr || g !== tg || b !== tb || a !== ta) continue;

      visited.add(key);
      this.setPixel(x, y, this.currentColor);

      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);
    }
  }

  private saveHistory(): void {
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(new Uint8ClampedArray(this.imageData.data));
    if (this.history.length > this.maxHistory) this.history.shift();
    this.historyIndex = this.history.length - 1;
  }

  public undo(): boolean {
    if (this.historyIndex <= 0) return false;
    this.historyIndex--;
    this.imageData.data.set(this.history[this.historyIndex]);
    this.render();
    this.onChange?.();
    return true;
  }

  public redo(): boolean {
    if (this.historyIndex >= this.history.length - 1) return false;
    this.historyIndex++;
    this.imageData.data.set(this.history[this.historyIndex]);
    this.render();
    this.onChange?.();
    return true;
  }

  public render(): void {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.size;
    tempCanvas.height = this.size;
    const tempCtx = tempCanvas.getContext('2d')!;
    const tempImg = tempCtx.createImageData(this.size, this.size);
    tempImg.data.set(this.imageData.data);
    tempCtx.putImageData(tempImg, 0, 0);

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(tempCanvas, 0, 0, this.canvas.width, this.canvas.height);

    this.ctx.strokeStyle = 'rgba(80, 80, 80, 0.4)';
    this.ctx.lineWidth = 1;
    for (let i = 0; i <= this.size; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(i * this.pixelSize, 0);
      this.ctx.lineTo(i * this.pixelSize, this.canvas.height);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.moveTo(0, i * this.pixelSize);
      this.ctx.lineTo(this.canvas.width, i * this.pixelSize);
      this.ctx.stroke();
    }

    this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    this.previewCtx.putImageData(tempImg, 0, 0);
  }

  public setTool(tool: Tool): void {
    this.currentTool = tool;
  }

  public setColor(color: string): void {
    this.currentColor = color;
  }

  public getColor(): string {
    return this.currentColor;
  }

  public getData(): Uint8ClampedArray {
    return new Uint8ClampedArray(this.imageData.data);
  }

  public setData(data: Uint8ClampedArray): void {
    this.imageData.data.set(data);
    this.saveHistory();
    this.render();
  }

  public clear(): void {
    for (let i = 0; i < this.imageData.data.length; i += 4) {
      this.imageData.data[i + 3] = 0;
    }
    this.saveHistory();
    this.render();
    this.onChange?.();
  }

  public getSize(): number {
    return this.size;
  }

  public resize(newSize: number): void {
    this.size = newSize;
    this.imageData = this.ctx.createImageData(newSize, newSize);
    this.history = [];
    this.historyIndex = -1;
    this.setupCanvas();
    this.clear();
  }
}
