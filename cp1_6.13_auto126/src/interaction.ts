import type { Point } from './glyph';

export interface InteractionCallbacks {
  onStrokeStart: (point: Point) => void;
  onStrokeMove: (point: Point) => void;
  onStrokeEnd: (point: Point) => void;
}

export class InteractionHandler {
  private canvas: HTMLCanvasElement;
  private callbacks: InteractionCallbacks;
  private isDrawing: boolean = false;
  private lastPoint: Point | null = null;

  constructor(canvas: HTMLCanvasElement, callbacks: InteractionCallbacks) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));

    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this));
  }

  private getCanvasPoint(clientX: number, clientY: number): Point {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    
    e.preventDefault();
    const point = this.getCanvasPoint(e.clientX, e.clientY);
    this.startStroke(point);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDrawing) return;
    
    e.preventDefault();
    const point = this.getCanvasPoint(e.clientX, e.clientY);
    this.moveStroke(point);
  }

  private handleMouseUp(e: MouseEvent): void {
    if (!this.isDrawing) return;
    
    e.preventDefault();
    const point = this.getCanvasPoint(e.clientX, e.clientY);
    this.endStroke(point);
  }

  private handleMouseLeave(e: MouseEvent): void {
    if (this.isDrawing) {
      const point = this.getCanvasPoint(e.clientX, e.clientY);
      this.endStroke(point);
    }
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const point = this.getCanvasPoint(touch.clientX, touch.clientY);
    this.startStroke(point);
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.isDrawing || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const point = this.getCanvasPoint(touch.clientX, touch.clientY);
    this.moveStroke(point);
  }

  private handleTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    if (!this.isDrawing) return;
    
    const touch = e.changedTouches[0] || e.touches[0];
    if (!touch) return;
    
    const point = this.getCanvasPoint(touch.clientX, touch.clientY);
    this.endStroke(point);
  }

  private startStroke(point: Point): void {
    this.isDrawing = true;
    this.lastPoint = point;
    this.callbacks.onStrokeStart(point);
  }

  private moveStroke(point: Point): void {
    if (!this.lastPoint) return;
    
    const dx = point.x - this.lastPoint.x;
    const dy = point.y - this.lastPoint.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist >= 2) {
      this.callbacks.onStrokeMove(point);
      this.lastPoint = point;
    }
  }

  private endStroke(point: Point): void {
    if (!this.isDrawing) return;
    
    this.isDrawing = false;
    this.callbacks.onStrokeEnd(point);
    this.lastPoint = null;
  }

  public isCurrentlyDrawing(): boolean {
    return this.isDrawing;
  }

  public destroy(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.canvas.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.canvas.removeEventListener('touchcancel', this.handleTouchEnd.bind(this));
  }
}
