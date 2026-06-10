import * as THREE from 'three';

export interface DrawingCallbacks {
  onStrokeComplete: (points: THREE.Vector2[]) => void;
}

export class DrawingManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isDrawing = false;
  private currentPoints: THREE.Vector2[] = [];
  private strokes: THREE.Vector2[][] = [];
  private callbacks: DrawingCallbacks;
  private strokeColor = '#3B82F6';
  private strokeLineWidth = 3;

  constructor(canvas: HTMLCanvasElement, callbacks: DrawingCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.bindEvents();
    this.resize();
  }

  public resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.redrawAllStrokes();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onPointerDown);
    this.canvas.addEventListener('mousemove', this.onPointerMove);
    this.canvas.addEventListener('mouseup', this.onPointerUp);
    this.canvas.addEventListener('mouseleave', this.onPointerUp);
    this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd);
    window.addEventListener('resize', this.resize);
  }

  private onPointerDown = (e: MouseEvent): void => {
    this.startDraw(e.clientX, e.clientY);
  };

  private onPointerMove = (e: MouseEvent): void => {
    if (!this.isDrawing) return;
    this.extendDraw(e.clientX, e.clientY);
  };

  private onPointerUp = (): void => {
    this.finishDraw();
  };

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    const t = e.touches[0];
    this.startDraw(t.clientX, t.clientY);
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (!this.isDrawing) return;
    const t = e.touches[0];
    this.extendDraw(t.clientX, t.clientY);
  };

  private onTouchEnd = (): void => {
    this.finishDraw();
  };

  private startDraw(x: number, y: number): void {
    this.isDrawing = true;
    this.currentPoints = [new THREE.Vector2(x, y)];
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.redrawAllStrokes();
    this.drawCurrentStroke();
  }

  private extendDraw(x: number, y: number): void {
    const last = this.currentPoints[this.currentPoints.length - 1];
    if (!last) return;
    const dx = x - last.x;
    const dy = y - last.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 2) return;
    this.currentPoints.push(new THREE.Vector2(x, y));
    this.drawCurrentStroke();
  }

  private drawCurrentStroke(): void {
    if (this.currentPoints.length < 2) {
      const p = this.currentPoints[0];
      if (!p) return;
      this.ctx.fillStyle = this.strokeColor;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, this.strokeLineWidth / 2, 0, Math.PI * 2);
      this.ctx.fill();
      return;
    }
    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.strokeLineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(this.currentPoints[0].x, this.currentPoints[0].y);
    for (let i = 1; i < this.currentPoints.length; i++) {
      this.ctx.lineTo(this.currentPoints[i].x, this.currentPoints[i].y);
    }
    this.ctx.stroke();
  }

  private finishDraw(): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    if (this.currentPoints.length < 2) {
      this.currentPoints = [];
      return;
    }
    const fitted = catmullRomFit(this.currentPoints, 0.1);
    this.strokes.push(fitted);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.redrawAllStrokes();
    this.callbacks.onStrokeComplete(fitted);
    this.currentPoints = [];
  }

  private redrawAllStrokes(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const stroke of this.strokes) {
      if (stroke.length < 2) continue;
      this.ctx.strokeStyle = this.strokeColor;
      this.ctx.lineWidth = this.strokeLineWidth;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.beginPath();
      this.ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        this.ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      this.ctx.stroke();
    }
  }

  public undoLastStroke(): THREE.Vector2[] | null {
    const removed = this.strokes.pop();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.redrawAllStrokes();
    return removed || null;
  }

  public clearAllStrokes(): void {
    this.strokes = [];
    this.currentPoints = [];
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public getStrokeCount(): number {
    return this.strokes.length;
  }
}

export function catmullRomFit(points: THREE.Vector2[], alpha = 0.5): THREE.Vector2[] {
  if (points.length < 3) return points.slice();
  const result: THREE.Vector2[] = [];
  const p0 = points[0];
  const p1 = points[0];
  const p2 = points[1];
  const p3 = points[2] || points[1];
  const samplesStart = interpolateSegment(p0, p1, p2, p3, alpha, 12);
  result.push(...samplesStart);
  for (let i = 0; i <= points.length - 3; i++) {
    const seg0 = points[i];
    const seg1 = points[i + 1];
    const seg2 = points[i + 2];
    const seg3 = points[i + 3] || seg2;
    const samples = interpolateSegment(seg0, seg1, seg2, seg3, alpha, 16);
    if (result.length > 0) samples.shift();
    result.push(...samples);
  }
  const last = points[points.length - 1];
  const secondLast = points[points.length - 2];
  const beforeLast = points[points.length - 3] || secondLast;
  const samplesEnd = interpolateSegment(secondLast, last, last, last, alpha, 12);
  if (result.length > 0) samplesEnd.shift();
  result.push(...samplesEnd);
  return dedupePoints(result, 1.5);
}

function interpolateSegment(
  p0: THREE.Vector2,
  p1: THREE.Vector2,
  p2: THREE.Vector2,
  p3: THREE.Vector2,
  alpha: number,
  samples: number
): THREE.Vector2[] {
  const result: THREE.Vector2[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const t2 = t * t;
    const t3 = t2 * t;
    const x = 0.5 * (
      (2 * p1.x) +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    );
    const y = 0.5 * (
      (2 * p1.y) +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    );
    result.push(new THREE.Vector2(x, y));
  }
  return result;
}

function dedupePoints(points: THREE.Vector2[], minDist: number): THREE.Vector2[] {
  if (points.length === 0) return points;
  const result: THREE.Vector2[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const last = result[result.length - 1];
    const dist = Math.sqrt(
      Math.pow(points[i].x - last.x, 2) + Math.pow(points[i].y - last.y, 2)
    );
    if (dist >= minDist) {
      result.push(points[i]);
    }
  }
  if (result.length < 2 && points.length >= 2) {
    return [points[0], points[points.length - 1]];
  }
  return result;
}
