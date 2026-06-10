import { MirrorEngine, Point, MirroredPoint } from './mirrorEngine';

export interface Stroke {
  points: Point[];
  color: string;
  brushSize: number;
  gradient: boolean;
  timestamp: number;
}

export interface DrawState {
  isDrawing: boolean;
  currentStroke: Stroke | null;
  strokes: Stroke[];
  brushSize: number;
  color: string;
  gradient: boolean;
}

type DrawCallback = (mirroredPaths: MirroredPoint[][], stroke: Stroke, isNew: boolean) => void;
type CompleteCallback = (stroke: Stroke) => void;

export class DrawController {
  private canvas: HTMLCanvasElement;
  private mirrorEngine: MirrorEngine;
  private state: DrawState;
  private onDraw: DrawCallback | null = null;
  private onStrokeComplete: CompleteCallback | null = null;
  private rafPending: boolean = false;
  private lastPoint: Point | null = null;
  private strokeStartPoint: Point | null = null;

  constructor(canvas: HTMLCanvasElement, mirrorEngine: MirrorEngine) {
    this.canvas = canvas;
    this.mirrorEngine = mirrorEngine;
    this.state = {
      isDrawing: false,
      currentStroke: null,
      strokes: [],
      brushSize: 3,
      color: '#e94560',
      gradient: false
    };
    this.bindEvents();
  }

  setBrushSize(size: number): void {
    this.state.brushSize = size;
  }

  setColor(color: string): void {
    this.state.color = color;
  }

  setGradient(enabled: boolean): void {
    this.state.gradient = enabled;
  }

  getStrokes(): Stroke[] {
    return this.state.strokes;
  }

  clearStrokes(): void {
    this.state.strokes = [];
    this.state.currentStroke = null;
    this.state.isDrawing = false;
  }

  onDrawCallback(callback: DrawCallback): void {
    this.onDraw = callback;
  }

  onStrokeCompleteCallback(callback: CompleteCallback): void {
    this.onStrokeComplete = callback;
  }

  private getCanvasPoint(e: MouseEvent | TouchEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  private isInDrawArea(point: Point): boolean {
    return point.x <= this.canvas.width / 2;
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleStart.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleEnd.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleEnd.bind(this));
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handleStart(e);
    }, { passive: false });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.handleMove(e);
    }, { passive: false });
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.handleEnd(e);
    }, { passive: false });
  }

  private handleStart(e: MouseEvent | TouchEvent): void {
    const point = this.getCanvasPoint(e);
    if (!this.isInDrawArea(point)) return;

    this.state.isDrawing = true;
    this.strokeStartPoint = point;
    this.lastPoint = point;
    this.state.currentStroke = {
      points: [point],
      color: this.state.color,
      brushSize: this.state.brushSize,
      gradient: this.state.gradient,
      timestamp: Date.now()
    };
    this.scheduleRender(true);
  }

  private handleMove(e: MouseEvent | TouchEvent): void {
    if (!this.state.isDrawing || !this.state.currentStroke) return;

    const point = this.getCanvasPoint(e);
    const clampedPoint = {
      x: Math.min(point.x, this.canvas.width / 2),
      y: Math.max(0, Math.min(this.canvas.height, point.y))
    };

    if (this.lastPoint) {
      const dx = clampedPoint.x - this.lastPoint.x;
      const dy = clampedPoint.y - this.lastPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) return;
    }

    this.state.currentStroke.points.push(clampedPoint);
    this.lastPoint = clampedPoint;
    this.scheduleRender(false);
  }

  private handleEnd(_e: MouseEvent | TouchEvent): void {
    if (!this.state.isDrawing || !this.state.currentStroke) return;

    if (this.state.currentStroke.points.length > 0) {
      this.state.strokes.push(this.state.currentStroke);
      if (this.onStrokeComplete) {
        this.onStrokeComplete(this.state.currentStroke);
      }
    }

    this.state.isDrawing = false;
    this.state.currentStroke = null;
    this.lastPoint = null;
    this.strokeStartPoint = null;
  }

  private scheduleRender(isNew: boolean): void {
    if (this.rafPending || !this.state.currentStroke) return;
    this.rafPending = true;

    requestAnimationFrame(() => {
      this.rafPending = false;
      if (!this.state.currentStroke || !this.onDraw) return;

      const mirroredPaths = this.mirrorEngine.generateMirroredPath(
        this.state.currentStroke.points
      );
      this.onDraw(mirroredPaths, this.state.currentStroke, isNew);
    });
  }

  getState(): DrawState {
    return { ...this.state };
  }
}
