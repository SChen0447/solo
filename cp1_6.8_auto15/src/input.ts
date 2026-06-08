export interface Point {
  x: number;
  y: number;
  time: number;
  pressure?: number;
}

export interface Stroke {
  points: Point[];
  color: string;
}

export interface CharSample {
  char: string;
  strokes: Stroke[];
  canvas: HTMLCanvasElement;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export type OnSampleAddCallback = (sample: CharSample) => void;

export class HandwritingInput {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isDrawing: boolean = false;
  private currentStroke: Stroke | null = null;
  private strokes: Stroke[] = [];
  private penColor: string = '#3B4D8F';
  private lastPoint: Point | null = null;
  private inkAnimationFrames: number = 0;
  private onSampleAddCallback?: OnSampleAddCallback;
  private animationId: number | null = null;

  private inkDiffusionData: Array<{
    x: number;
    y: number;
    radius: number;
    targetRadius: number;
    alpha: number;
    color: string;
  }> = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.setupCanvas();
    this.bindEvents();
    this.startAnimationLoop();
  }

  private setupCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  public resize(): void {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.redraw();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseUp);

    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd);
    this.canvas.addEventListener('touchcancel', this.handleTouchEnd);

    window.addEventListener('resize', () => this.resize());
  }

  private getPos(e: MouseEvent | Touch): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      time: performance.now(),
    };
  }

  private handleMouseDown = (e: MouseEvent): void => {
    e.preventDefault();
    this.startDrawing(this.getPos(e));
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.isDrawing) return;
    e.preventDefault();
    this.continueDrawing(this.getPos(e));
  };

  private handleMouseUp = (): void => {
    if (!this.isDrawing) return;
    this.endDrawing();
  };

  private handleTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    if (touch.radiusX > 20 || touch.radiusY > 20) return;
    this.startDrawing(this.getPos(touch));
  };

  private handleTouchMove = (e: TouchEvent): void => {
    if (!this.isDrawing || e.touches.length === 0) return;
    e.preventDefault();
    const touch = e.touches[0];
    this.continueDrawing(this.getPos(touch));
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    if (!this.isDrawing) return;
    e.preventDefault();
    this.endDrawing();
  };

  private startDrawing(point: Point): void {
    this.isDrawing = true;
    this.currentStroke = {
      points: [point],
      color: this.penColor,
    };
    this.lastPoint = point;
    this.addInkDiffusion(point.x, point.y, this.penColor);
    this.drawDot(point);
  }

  private continueDrawing(point: Point): void {
    if (!this.currentStroke || !this.lastPoint) return;

    const last = this.lastPoint;
    const dx = point.x - last.x;
    const dy = point.y - last.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 2) return;

    const dt = point.time - last.time;
    const speed = distance / (dt || 1);

    const baseWidth = 3;
    const maxWidth = 8;
    const minWidth = 1.5;
    const width = Math.max(minWidth, Math.min(maxWidth, baseWidth + (1 - speed / 5) * 4));

    point.pressure = width;
    this.currentStroke.points.push(point);

    this.drawSmoothSegment(last, point, width);
    this.lastPoint = point;

    if (Math.random() < 0.3) {
      this.addInkDiffusion(point.x, point.y, this.penColor);
    }
  }

  private endDrawing(): void {
    if (this.currentStroke && this.currentStroke.points.length > 1) {
      this.strokes.push(this.currentStroke);
    }
    this.isDrawing = false;
    this.currentStroke = null;
    this.lastPoint = null;
  }

  private drawDot(point: Point): void {
    this.ctx.beginPath();
    this.ctx.fillStyle = this.penColor;
    this.ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawSmoothSegment(p1: Point, p2: Point, width: number): void {
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    this.ctx.beginPath();
    this.ctx.strokeStyle = this.penColor;
    this.ctx.lineWidth = width;
    this.ctx.moveTo(p1.x, p1.y);
    this.ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(midX, midY);
    this.ctx.quadraticCurveTo(p2.x, p2.y, p2.x, p2.y);
    this.ctx.stroke();
  }

  private addInkDiffusion(x: number, y: number, color: string): void {
    this.inkDiffusionData.push({
      x,
      y,
      radius: 0.5,
      targetRadius: 3 + Math.random() * 3,
      alpha: 0.4,
      color,
    });
  }

  private startAnimationLoop(): void {
    const animate = () => {
      this.updateInkDiffusion();
      this.animationId = requestAnimationFrame(animate);
    };
    this.animationId = requestAnimationFrame(animate);
  }

  private updateInkDiffusion(): void {
    if (this.inkDiffusionData.length === 0) return;

    const toRemove: number[] = [];

    for (let i = 0; i < this.inkDiffusionData.length; i++) {
      const ink = this.inkDiffusionData[i];
      ink.radius += (ink.targetRadius - ink.radius) * 0.15;
      ink.alpha -= 0.015;

      if (ink.alpha <= 0) {
        toRemove.push(i);
        continue;
      }

      this.ctx.beginPath();
      const gradient = this.ctx.createRadialGradient(
        ink.x, ink.y, 0,
        ink.x, ink.y, ink.radius
      );
      gradient.addColorStop(0, this.hexToRgba(ink.color, ink.alpha * 0.5));
      gradient.addColorStop(1, this.hexToRgba(ink.color, 0));
      this.ctx.fillStyle = gradient;
      this.ctx.arc(ink.x, ink.y, ink.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.inkDiffusionData.splice(toRemove[i], 1);
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private redraw(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const stroke of this.strokes) {
      this.drawStroke(stroke);
    }
  }

  private drawStroke(stroke: Stroke): void {
    if (stroke.points.length < 2) return;

    this.ctx.strokeStyle = stroke.color;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    for (let i = 1; i < stroke.points.length; i++) {
      const p1 = stroke.points[i - 1];
      const p2 = stroke.points[i];
      const width = p2.pressure || 3;

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      this.ctx.beginPath();
      this.ctx.lineWidth = width;
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(midX, midY);
      this.ctx.quadraticCurveTo(p2.x, p2.y, p2.x, p2.y);
      this.ctx.stroke();
    }
  }

  public setColor(color: string): void {
    this.penColor = color;
  }

  public getColor(): string {
    return this.penColor;
  }

  public clear(): void {
    this.strokes = [];
    this.inkDiffusionData = [];
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public getStrokes(): Stroke[] {
    return [...this.strokes];
  }

  public captureCharacter(char: string): CharSample | null {
    if (this.strokes.length === 0) return null;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const stroke of this.strokes) {
      for (const point of stroke.points) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      }
    }

    const padding = 10;
    const width = Math.max(20, maxX - minX + padding * 2);
    const height = Math.max(20, maxY - minY + padding * 2);

    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = width;
    captureCanvas.height = height;
    const ctx = captureCanvas.getContext('2d');
    if (!ctx) return null;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const offsetX = -minX + padding;
    const offsetY = -minY + padding;

    for (const stroke of this.strokes) {
      if (stroke.points.length < 2) continue;

      ctx.strokeStyle = stroke.color;

      for (let i = 1; i < stroke.points.length; i++) {
        const p1 = stroke.points[i - 1];
        const p2 = stroke.points[i];
        const width = p2.pressure || 3;

        const midX = (p1.x + p2.x) / 2 + offsetX;
        const midY = (p1.y + p2.y) / 2 + offsetY;

        ctx.beginPath();
        ctx.lineWidth = width;
        ctx.moveTo(p1.x + offsetX, p1.y + offsetY);
        ctx.quadraticCurveTo(p1.x + offsetX, p1.y + offsetY, midX, midY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(midX, midY);
        ctx.quadraticCurveTo(p2.x + offsetX, p2.y + offsetY, p2.x + offsetX, p2.y + offsetY);
        ctx.stroke();
      }
    }

    return {
      char,
      strokes: JSON.parse(JSON.stringify(this.strokes)),
      canvas: captureCanvas,
      bounds: { minX, maxX, minY, maxY },
    };
  }

  public onSampleAdd(callback: OnSampleAddCallback): void {
    this.onSampleAddCallback = callback;
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    this.canvas.removeEventListener('touchcancel', this.handleTouchEnd);
  }
}
