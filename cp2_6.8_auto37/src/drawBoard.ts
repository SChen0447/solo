export interface Point2D {
  x: number;
  y: number;
}

export type PathChangeCallback = (paths: Point2D[][]) => void;

export class DrawBoard {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private paths: Point2D[][] = [];
  private currentPath: Point2D[] = [];
  private isDrawing: boolean = false;
  private onPathChange: PathChangeCallback | null = null;
  private gridSize: number = 20;

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas element with id "${canvasId}" not found`);
    }
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;
    this.init();
  }

  private init(): void {
    this.bindEvents();
    this.render();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));

    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  private getMousePos(e: MouseEvent): Point2D {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  private getTouchPos(e: TouchEvent): Point2D {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const touch = e.touches[0];
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY
    };
  }

  private handleMouseDown(e: MouseEvent): void {
    this.isDrawing = true;
    const point = this.getMousePos(e);
    this.currentPath = [point];
    this.render();
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDrawing) return;
    const point = this.getMousePos(e);
    this.currentPath.push(point);
    this.render();
  }

  private handleMouseUp(): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    if (this.currentPath.length > 1) {
      const smoothed = this.simplifyPath(this.currentPath, 2);
      this.paths.push(smoothed);
      this.notifyChange();
    }
    this.currentPath = [];
    this.render();
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    this.isDrawing = true;
    const point = this.getTouchPos(e);
    this.currentPath = [point];
    this.render();
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.isDrawing) return;
    const point = this.getTouchPos(e);
    this.currentPath.push(point);
    this.render();
  }

  private handleTouchEnd(): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    if (this.currentPath.length > 1) {
      const smoothed = this.simplifyPath(this.currentPath, 2);
      this.paths.push(smoothed);
      this.notifyChange();
    }
    this.currentPath = [];
    this.render();
  }

  private simplifyPath(points: Point2D[], tolerance: number): Point2D[] {
    if (points.length <= 2) return points.slice();

    const result: Point2D[] = [points[0]];
    let lastPoint = points[0];

    for (let i = 1; i < points.length - 1; i++) {
      const point = points[i];
      const dist = Math.sqrt(
        Math.pow(point.x - lastPoint.x, 2) + Math.pow(point.y - lastPoint.y, 2)
      );
      if (dist >= tolerance) {
        result.push(point);
        lastPoint = point;
      }
    }

    result.push(points[points.length - 1]);
    return result;
  }

  private render(): void {
    const ctx = this.ctx;
    const { width, height } = this.canvas;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    this.drawGrid();

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const path of this.paths) {
      this.drawPath(path);
    }

    if (this.currentPath.length > 0) {
      this.drawPath(this.currentPath);
    }
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.lineWidth = 0.5;

    for (let x = 0; x <= width; x += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  private drawPath(points: Point2D[]): void {
    if (points.length < 2) return;
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
  }

  private notifyChange(): void {
    if (this.onPathChange) {
      this.onPathChange(this.paths);
    }
  }

  public setOnPathChange(callback: PathChangeCallback): void {
    this.onPathChange = callback;
  }

  public clear(): void {
    this.paths = [];
    this.currentPath = [];
    this.render();
    this.notifyChange();
  }

  public undo(): void {
    if (this.paths.length > 0) {
      this.paths.pop();
      this.render();
      this.notifyChange();
    }
  }

  public getPaths(): Point2D[][] {
    return this.paths.map(path => path.slice());
  }

  public getMergedPath(): Point2D[] {
    const merged: Point2D[] = [];
    for (const path of this.paths) {
      merged.push(...path);
    }
    return merged;
  }
}
