export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

const MAX_UNDO_STACK = 20;
const BG_COLOR = '#FAF0E6';
const STROKE_COLOR = '#2B3A67';

export class DrawingCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private strokes: Stroke[] = [];
  private undoStack: Stroke[][] = [];
  private currentStroke: Stroke | null = null;
  private isDrawing = false;
  private strokeWidth = 3;
  private lastFrameTime = 0;
  private minFrameInterval = 1000 / 30;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get canvas context');
    this.ctx = ctx;
    this.setupCanvas();
    this.bindEvents();
    this.clear();
  }

  private setupCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));

    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));

    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleResize(): void {
    const oldStrokes = [...this.strokes];
    this.setupCanvas();
    this.strokes = oldStrokes;
    this.redraw();
  }

  private getPointFromEvent(e: MouseEvent | Touch): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private shouldRenderFrame(): boolean {
    const now = performance.now();
    if (now - this.lastFrameTime >= this.minFrameInterval) {
      this.lastFrameTime = now;
      return true;
    }
    return false;
  }

  private onMouseDown(e: MouseEvent): void {
    this.startDrawing(this.getPointFromEvent(e));
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDrawing) return;
    this.continueDrawing(this.getPointFromEvent(e));
  }

  private onMouseUp(): void {
    this.endDrawing();
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.startDrawing(this.getPointFromEvent(e.touches[0]));
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.isDrawing || e.touches.length !== 1) return;
    this.continueDrawing(this.getPointFromEvent(e.touches[0]));
  }

  private onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    this.endDrawing();
  }

  private startDrawing(point: Point): void {
    this.saveToUndoStack();
    this.isDrawing = true;
    this.currentStroke = {
      points: [point],
      color: STROKE_COLOR,
      width: this.strokeWidth
    };
  }

  private continueDrawing(point: Point): void {
    if (!this.currentStroke) return;
    this.currentStroke.points.push(point);

    if (this.shouldRenderFrame()) {
      this.redraw();
      this.drawCurrentStroke();
    }
  }

  private endDrawing(): void {
    if (!this.isDrawing || !this.currentStroke) return;
    this.isDrawing = false;

    if (this.currentStroke.points.length > 1) {
      this.strokes.push(this.currentStroke);
    }
    this.currentStroke = null;
    this.redraw();
  }

  private saveToUndoStack(): void {
    this.undoStack.push(this.strokes.map(s => ({
      ...s,
      points: [...s.points]
    })));

    if (this.undoStack.length > MAX_UNDO_STACK) {
      this.undoStack.shift();
    }
  }

  private drawStroke(stroke: Stroke): void {
    if (stroke.points.length < 2) return;

    this.ctx.beginPath();
    this.ctx.strokeStyle = stroke.color;
    this.ctx.lineWidth = stroke.width;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

    for (let i = 1; i < stroke.points.length - 1; i++) {
      const midX = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
      const midY = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
      this.ctx.quadraticCurveTo(
        stroke.points[i].x,
        stroke.points[i].y,
        midX,
        midY
      );
    }

    const lastIdx = stroke.points.length - 1;
    this.ctx.lineTo(stroke.points[lastIdx].x, stroke.points[lastIdx].y);
    this.ctx.stroke();
  }

  private drawCurrentStroke(): void {
    if (this.currentStroke) {
      this.drawStroke(this.currentStroke);
    }
  }

  private redraw(): void {
    this.ctx.fillStyle = BG_COLOR;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (const stroke of this.strokes) {
      this.drawStroke(stroke);
    }
  }

  public setStrokeWidth(width: number): void {
    this.strokeWidth = Math.max(1, Math.min(8, width));
  }

  public getStrokeWidth(): number {
    return this.strokeWidth;
  }

  public undo(): boolean {
    if (this.undoStack.length === 0) return false;
    this.strokes = this.undoStack.pop() || [];
    this.redraw();
    return true;
  }

  public clear(): void {
    this.saveToUndoStack();
    this.strokes = [];
    this.currentStroke = null;
    this.redraw();
  }

  public getStrokes(): Stroke[] {
    return this.strokes.map(s => ({
      ...s,
      points: [...s.points]
    }));
  }

  public setStrokes(strokes: Stroke[], animate = false): void {
    if (animate) {
      this.canvas.classList.remove('canvas-fade');
      void this.canvas.offsetWidth;
      this.canvas.classList.add('canvas-fade');
    }
    this.strokes = strokes;
    this.redraw();
  }

  public getCanvasSize(): { width: number; height: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  public hasStrokes(): boolean {
    return this.strokes.length > 0;
  }
}
