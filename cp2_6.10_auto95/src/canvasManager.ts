export interface RawPoint {
  x: number;
  y: number;
  timestamp: number;
}

export type Stroke = RawPoint[];

type DrawingCallback = (strokes: Stroke[]) => void;

export class CanvasManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private strokes: Stroke[] = [];
  private currentStroke: Stroke | null = null;
  private isDrawing = false;
  private lastPoint: RawPoint | null = null;
  private onStrokesChange: DrawingCallback | null = null;
  private animationFrameId: number | null = null;
  private pendingDraw = false;

  private readonly strokeColor = '#2B2B2B';
  private readonly strokeWidth = 3;
  private readonly backgroundColor = '#F5F0E8';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取Canvas 2D上下文');
    }
    this.ctx = ctx;
    this.init();
  }

  private init(): void {
    this.setupContext();
    this.bindEvents();
    this.clear();
  }

  private setupContext(): void {
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.strokeWidth;
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleStart);
    this.canvas.addEventListener('mousemove', this.handleMove);
    this.canvas.addEventListener('mouseup', this.handleEnd);
    this.canvas.addEventListener('mouseleave', this.handleEnd);

    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    this.canvas.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });
  }

  private getCanvasPoint(clientX: number, clientY: number): RawPoint {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      timestamp: performance.now()
    };
  }

  private handleStart = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    e.preventDefault();
    this.startDrawing(this.getCanvasPoint(e.clientX, e.clientY));
  };

  private handleMove = (e: MouseEvent): void => {
    if (!this.isDrawing) return;
    e.preventDefault();
    this.continueDrawing(this.getCanvasPoint(e.clientX, e.clientY));
  };

  private handleEnd = (): void => {
    if (!this.isDrawing) return;
    this.endDrawing();
  };

  private handleTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    this.startDrawing(this.getCanvasPoint(touch.clientX, touch.clientY));
  };

  private handleTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (!this.isDrawing || e.touches.length !== 1) return;
    const touch = e.touches[0];
    this.continueDrawing(this.getCanvasPoint(touch.clientX, touch.clientY));
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    e.preventDefault();
    if (!this.isDrawing) return;
    this.endDrawing();
  };

  private startDrawing(point: RawPoint): void {
    this.isDrawing = true;
    this.currentStroke = [point];
    this.lastPoint = point;
    this.drawPoint(point);
  }

  private continueDrawing(point: RawPoint): void {
    if (!this.currentStroke || !this.lastPoint) return;

    this.currentStroke.push(point);
    this.scheduleDrawSegment(this.lastPoint, point);
    this.lastPoint = point;
  }

  private endDrawing(): void {
    this.isDrawing = false;
    if (this.currentStroke && this.currentStroke.length > 1) {
      this.strokes.push(this.currentStroke);
      this.notifyChange();
    }
    this.currentStroke = null;
    this.lastPoint = null;
  }

  private scheduleDrawSegment(from: RawPoint, to: RawPoint): void {
    if (this.pendingDraw) return;
    this.pendingDraw = true;

    const draw = () => {
      this.drawSegment(from, to);
      this.pendingDraw = false;
      this.animationFrameId = null;
    };

    this.animationFrameId = requestAnimationFrame(draw);
  }

  private drawPoint(point: RawPoint): void {
    this.ctx.beginPath();
    this.ctx.arc(point.x, point.y, this.strokeWidth / 2, 0, Math.PI * 2);
    this.ctx.fillStyle = this.strokeColor;
    this.ctx.fill();
  }

  private drawSegment(from: RawPoint, to: RawPoint): void {
    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.strokeWidth;
    this.ctx.stroke();

    this.drawFadeOutEnd(to);
  }

  private drawFadeOutEnd(point: RawPoint): void {
    const gradient = this.ctx.createRadialGradient(
      point.x, point.y, 0,
      point.x, point.y, this.strokeWidth
    );
    gradient.addColorStop(0, this.strokeColor);
    gradient.addColorStop(1, 'rgba(43, 43, 43, 0)');

    this.ctx.beginPath();
    this.ctx.arc(point.x, point.y, this.strokeWidth, 0, Math.PI * 2);
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
  }

  private redrawAll(): void {
    this.clearCanvas();
    for (const stroke of this.strokes) {
      if (stroke.length < 2) continue;
      this.ctx.beginPath();
      this.ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        this.ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      this.ctx.strokeStyle = this.strokeColor;
      this.ctx.lineWidth = this.strokeWidth;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.stroke();
    }
  }

  private clearCanvas(): void {
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private notifyChange(): void {
    if (this.onStrokesChange) {
      this.onStrokesChange(this.strokes);
    }
  }

  public setOnStrokesChange(callback: DrawingCallback): void {
    this.onStrokesChange = callback;
  }

  public getStrokes(): Stroke[] {
    return this.strokes;
  }

  public getAllPoints(): RawPoint[] {
    return this.strokes.flat();
  }

  public clear(): void {
    this.strokes = [];
    this.currentStroke = null;
    this.isDrawing = false;
    this.lastPoint = null;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.pendingDraw = false;
    this.clearCanvas();
    this.notifyChange();
  }

  public clearWithAnimation(callback?: () => void): void {
    this.canvas.classList.add('fade-out');
    setTimeout(() => {
      this.clear();
      this.canvas.classList.remove('fade-out');
      if (callback) callback();
    }, 300);
  }

  public destroy(): void {
    this.canvas.removeEventListener('mousedown', this.handleStart);
    this.canvas.removeEventListener('mousemove', this.handleMove);
    this.canvas.removeEventListener('mouseup', this.handleEnd);
    this.canvas.removeEventListener('mouseleave', this.handleEnd);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    this.canvas.removeEventListener('touchcancel', this.handleTouchEnd);
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
