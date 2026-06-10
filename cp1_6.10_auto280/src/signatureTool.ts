export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface SignatureData {
  id: string;
  paths: Point[][];
  x: number;
  y: number;
  scale: number;
  rotation: number;
  width: number;
  height: number;
  hash: string;
  qrDataUrl: string;
  createdAt: number;
}

const MAX_UNDO = 10;

export class SignatureTool {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private paths: Point[][] = [];
  private currentPath: Point[] | null = null;
  private isDrawing = false;
  private undoStack: Point[][][] = [];
  private strokeColor = '#1a1a2e';
  private strokeWidth = 3;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取画布上下文');
    this.ctx = ctx;
    this.setupEventListeners();
    this.clear();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.handleStart.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleEnd.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleEnd.bind(this));

    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  private getPos(e: MouseEvent | Touch): Point {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  private handleStart(e: MouseEvent): void {
    e.preventDefault();
    this.startDrawing(this.getPos(e));
  }

  private handleMove(e: MouseEvent): void {
    if (!this.isDrawing) return;
    e.preventDefault();
    this.draw(this.getPos(e));
  }

  private handleEnd(): void {
    if (!this.isDrawing) return;
    this.stopDrawing();
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      this.startDrawing(this.getPos(e.touches[0]));
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.isDrawing || e.touches.length === 0) return;
    this.draw(this.getPos(e.touches[0]));
  }

  private handleTouchEnd(): void {
    this.handleEnd();
  }

  startDrawing(pos: Point): void {
    this.isDrawing = true;
    this.currentPath = [pos];
    this.saveUndoState();
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y);
  }

  draw(pos: Point): void {
    if (!this.isDrawing || !this.currentPath) return;

    const lastPoint = this.currentPath[this.currentPath.length - 1];

    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.strokeWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.shadowColor = 'rgba(26, 26, 46, 0.3)';
    this.ctx.shadowBlur = 2;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 1;

    this.ctx.beginPath();
    this.ctx.moveTo(lastPoint.x, lastPoint.y);

    const midX = (lastPoint.x + pos.x) / 2;
    const midY = (lastPoint.y + pos.y) / 2;
    this.ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, midX, midY);
    this.ctx.stroke();

    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetY = 0;

    this.currentPath.push(pos);
  }

  stopDrawing(): void {
    if (!this.isDrawing || !this.currentPath) return;
    this.isDrawing = false;
    if (this.currentPath.length > 1) {
      this.paths.push(this.currentPath);
    }
    this.currentPath = null;
  }

  private saveUndoState(): void {
    this.undoStack.push(JSON.parse(JSON.stringify(this.paths)));
    if (this.undoStack.length > MAX_UNDO) {
      this.undoStack.shift();
    }
  }

  undo(): boolean {
    if (this.undoStack.length === 0) return false;
    this.paths = this.undoStack.pop()!;
    this.redraw();
    return true;
  }

  clear(): void {
    this.saveUndoState();
    this.paths = [];
    this.redraw();
  }

  private redraw(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = '#f5f0e1';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (const path of this.paths) {
      if (path.length < 2) continue;

      ctx.strokeStyle = this.strokeColor;
      ctx.lineWidth = this.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(26, 26, 46, 0.3)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetY = 1;

      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length - 1; i++) {
        const midX = (path[i].x + path[i + 1].x) / 2;
        const midY = (path[i].y + path[i + 1].y) / 2;
        ctx.quadraticCurveTo(path[i].x, path[i].y, midX, midY);
      }
      const last = path[path.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }
  }

  isEmpty(): boolean {
    return this.paths.length === 0;
  }

  getSignatureData(): { paths: Point[][]; width: number; height: number } {
    if (this.paths.length === 0) {
      return { paths: [], width: 0, height: 0 };
    }

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const path of this.paths) {
      for (const p of path) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    }

    const padding = 10;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const width = maxX - minX;
    const height = maxY - minY;

    const normalizedPaths: Point[][] = this.paths.map(path =>
      path.map(p => ({
        x: p.x - minX,
        y: p.y - minY
      }))
    );

    return { paths: normalizedPaths, width, height };
  }

  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.handleStart.bind(this));
    this.canvas.removeEventListener('mousemove', this.handleMove.bind(this));
    this.canvas.removeEventListener('mouseup', this.handleEnd.bind(this));
    this.canvas.removeEventListener('mouseleave', this.handleEnd.bind(this));
    this.canvas.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.removeEventListener('touchend', this.handleTouchEnd.bind(this));
  }
}
