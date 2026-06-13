export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
  velocity: number;
  width: number;
  opacity: number;
}

export interface Stroke {
  points: StrokePoint[];
  color: string;
  baseWidth: number;
  id: string;
}

export interface BrushSettings {
  color: string;
  baseWidth: number;
  minWidth: number;
  maxWidth: number;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export class BrushEngine {
  private currentStroke: Stroke | null = null;
  private lastSampleTime: number = 0;
  private lastPoint: { x: number; y: number; t: number } | null = null;
  private settings: BrushSettings;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private previewCanvas: HTMLCanvasElement;
  private previewCtx: CanvasRenderingContext2D;
  private noisePattern: CanvasPattern | null = null;
  private readonly SAMPLE_INTERVAL = 1000 / 30;
  private readonly MIN_DISTANCE = 2;

  constructor(
    canvas: HTMLCanvasElement,
    previewCanvas: HTMLCanvasElement,
    settings: BrushSettings
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    this.previewCanvas = previewCanvas;
    this.previewCtx = previewCanvas.getContext('2d')!;
    this.settings = settings;
    this.generateNoisePattern();
  }

  private generateNoisePattern(): void {
    const size = 64;
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const octx = off.getContext('2d')!;
    const img = octx.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const noise = Math.random();
      const alpha = noise > 0.3 ? noise * 0.55 : 0;
      img.data[i] = 0;
      img.data[i + 1] = 0;
      img.data[i + 2] = 0;
      img.data[i + 3] = Math.floor(alpha * 255);
    }
    octx.putImageData(img, 0, 0);
    this.noisePattern = this.ctx.createPattern(off, 'repeat');
  }

  public updateSettings(settings: Partial<BrushSettings>): void {
    Object.assign(this.settings, settings);
  }

  public getSettings(): BrushSettings {
    return { ...this.settings };
  }

  public startStroke(x: number, y: number): Stroke {
    const now = performance.now();
    const point: StrokePoint = {
      x,
      y,
      pressure: 1,
      timestamp: now,
      velocity: 0,
      width: this.settings.baseWidth,
      opacity: 1
    };
    this.currentStroke = {
      points: [point],
      color: this.settings.color,
      baseWidth: this.settings.baseWidth,
      id: generateId()
    };
    this.lastPoint = { x, y, t: now };
    this.lastSampleTime = now;
    return this.currentStroke;
  }

  public moveStroke(x: number, y: number): StrokePoint | null {
    if (!this.currentStroke || !this.lastPoint) return null;

    const now = performance.now();
    const dx = x - this.lastPoint.x;
    const dy = y - this.lastPoint.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const dt = now - this.lastPoint.t;

    if (dt < this.SAMPLE_INTERVAL && dist < this.MIN_DISTANCE) {
      return null;
    }

    const velocity = dt > 0 ? dist / dt : 0;
    const width = this.calculateWidth(velocity);
    const pressure = Math.max(0.3, Math.min(1, 1 - velocity * 0.015));

    const point: StrokePoint = {
      x,
      y,
      pressure,
      timestamp: now,
      velocity,
      width,
      opacity: 1
    };

    this.currentStroke.points.push(point);
    this.lastPoint = { x, y, t: now };
    this.lastSampleTime = now;

    this.renderSegmentToPreview(point);
    return point;
  }

  public endStroke(x: number, y: number): Stroke | null {
    if (!this.currentStroke) return null;

    const now = performance.now();
    const finalPoints = this.applyFadeOut(this.currentStroke.points);
    this.currentStroke.points = finalPoints;

    this.clearPreview();
    this.renderStroke(this.currentStroke);

    const finished = this.currentStroke;
    this.currentStroke = null;
    this.lastPoint = null;
    return finished;
  }

  private calculateWidth(velocity: number): number {
    const minV = 0;
    const maxV = 4;
    const t = Math.max(0, Math.min(1, (velocity - minV) / (maxV - minV)));
    const w = this.settings.maxWidth - t * (this.settings.maxWidth - this.settings.minWidth);
    const baseFactor = this.settings.baseWidth / ((this.settings.minWidth + this.settings.maxWidth) / 2);
    return w * baseFactor;
  }

  private applyFadeOut(points: StrokePoint[]): StrokePoint[] {
    if (points.length < 3) return points;

    const last = points[points.length - 1];
    const avgSpeed = points.length > 5
      ? points.slice(-5).reduce((s, p) => s + p.velocity, 0) / 5
      : last.velocity;

    const fadeLength = Math.max(3, Math.min(15, Math.round(6 + avgSpeed * 3)));
    const startIdx = Math.max(0, points.length - fadeLength);
    const result = [...points];

    for (let i = startIdx; i < result.length; i++) {
      const t = (i - startIdx) / (result.length - startIdx);
      const eased = t * t * (3 - 2 * t);
      result[i] = {
        ...result[i],
        opacity: 1 - eased,
        width: result[i].width * (1 - eased * 0.4)
      };
    }
    return result;
  }

  private renderSegmentToPreview(newPoint: StrokePoint): void {
    if (!this.currentStroke || this.currentStroke.points.length < 2) return;

    const pts = this.currentStroke.points;
    const start = Math.max(0, pts.length - 3);
    const segment = pts.slice(start);

    this.previewCtx.save();
    this.previewCtx.lineCap = 'round';
    this.previewCtx.lineJoin = 'round';

    this.drawBezierSegment(this.previewCtx, segment, this.currentStroke.color, true);
    this.previewCtx.restore();
  }

  private drawBezierSegment(
    ctx: CanvasRenderingContext2D,
    points: StrokePoint[],
    color: string,
    isPreview: boolean = false
  ): void {
    if (points.length < 2) return;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const avgWidth = (p1.width + p2.width) / 2;
      const avgOpacity = (p1.opacity + p2.opacity) / 2;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);

      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;

      ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2.x, p2.y);

      ctx.strokeStyle = hexToRgba(color, avgOpacity);
      ctx.lineWidth = avgWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      if (avgOpacity > 0.3 && avgWidth > 4 && this.noisePattern) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2.x, p2.y);
        ctx.strokeStyle = this.noisePattern;
        ctx.lineWidth = avgWidth * 0.85;
        ctx.globalAlpha = 0.35;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  public renderStroke(stroke: Stroke): void {
    if (stroke.points.length < 2) return;

    this.ctx.save();
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < stroke.points.length - 1; i++) {
        const p0 = stroke.points[i - 1] || stroke.points[i];
        const p1 = stroke.points[i];
        const p2 = stroke.points[i + 1];
        const p3 = stroke.points[i + 2] || p2;

        const avgWidth = (p1.width + p2.width) / 2;
        const avgOpacity = (p1.opacity + p2.opacity) / 2;
        const w = pass === 0 ? avgWidth : avgWidth * 0.6;
        const a = pass === 0 ? avgOpacity * 0.85 : avgOpacity;

        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);

        const c1x = p1.x + (p2.x - p0.x) / 6;
        const c1y = p1.y + (p2.y - p0.y) / 6;
        const c2x = p2.x - (p3.x - p1.x) / 6;
        const c2y = p2.y - (p3.y - p1.y) / 6;

        this.ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2.x, p2.y);
        this.ctx.strokeStyle = hexToRgba(stroke.color, a);
        this.ctx.lineWidth = w;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.stroke();
      }
    }

    if (this.noisePattern) {
      this.ctx.save();
      this.ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < stroke.points.length - 1; i++) {
        const p0 = stroke.points[i - 1] || stroke.points[i];
        const p1 = stroke.points[i];
        const p2 = stroke.points[i + 1];
        const p3 = stroke.points[i + 2] || p2;

        const avgWidth = (p1.width + p2.width) / 2;
        const avgOpacity = (p1.opacity + p2.opacity) / 2;
        if (avgOpacity < 0.3 || avgWidth < 4) continue;

        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        const c1x = p1.x + (p2.x - p0.x) / 6;
        const c1y = p1.y + (p2.y - p0.y) / 6;
        const c2x = p2.x - (p3.x - p1.x) / 6;
        const c2y = p2.y - (p3.y - p1.y) / 6;
        this.ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2.x, p2.y);

        this.ctx.strokeStyle = this.noisePattern;
        this.ctx.lineWidth = avgWidth * 0.8;
        this.ctx.globalAlpha = 0.3;
        this.ctx.stroke();
      }
      this.ctx.restore();
    }

    this.ctx.restore();
  }

  public renderAllStrokes(strokes: Stroke[]): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const stroke of strokes) {
      this.renderStroke(stroke);
    }
  }

  public clearPreview(): void {
    this.previewCtx.clearRect(
      0, 0,
      this.previewCanvas.width,
      this.previewCanvas.height
    );
  }

  public drawCursorPreview(
    x: number,
    y: number,
    isPressed: boolean,
    color: string
  ): void {
    this.clearPreview();
    this.previewCtx.save();

    if (isPressed) {
      this.previewCtx.beginPath();
      this.previewCtx.arc(x, y, 6, 0, Math.PI * 2);
      this.previewCtx.fillStyle = hexToRgba(color, 0.9);
      this.previewCtx.fill();
    } else {
      const r = this.settings.baseWidth * 0.5 + 6;
      this.previewCtx.beginPath();
      this.previewCtx.arc(x, y, r, 0, Math.PI * 2);
      this.previewCtx.strokeStyle = hexToRgba(color, 0.55);
      this.previewCtx.lineWidth = 1.5;
      this.previewCtx.stroke();

      this.previewCtx.beginPath();
      this.previewCtx.arc(x, y, 2, 0, Math.PI * 2);
      this.previewCtx.fillStyle = hexToRgba(color, 0.7);
      this.previewCtx.fill();
    }
    this.previewCtx.restore();
  }

  public resize(width: number, height: number, scaleX: number, scaleY: number, strokes: Stroke[]): void {
    const prev = document.createElement('canvas');
    prev.width = this.canvas.width;
    prev.height = this.canvas.height;
    prev.getContext('2d')!.drawImage(this.canvas, 0, 0);

    this.canvas.width = width;
    this.canvas.height = height;
    this.previewCanvas.width = width;
    this.previewCanvas.height = height;

    const updated: Stroke[] = strokes.map(s => ({
      ...s,
      points: s.points.map(p => ({
        ...p,
        x: p.x * scaleX,
        y: p.y * scaleY,
        width: p.width * ((scaleX + scaleY) / 2)
      }))
    }));
    this.renderAllStrokes(updated);
  }

  public playLiftAnimation(stroke: Stroke): Promise<void> {
    return new Promise((resolve) => {
      const pts = stroke.points;
      if (pts.length < 4) { resolve(); return; }

      const fadeCount = Math.min(10, Math.floor(pts.length / 3));
      const fadeStart = pts.length - fadeCount;
      let frame = 0;
      const totalFrames = 18;

      const animate = () => {
        frame++;
        const t = frame / totalFrames;
        this.clearPreview();

        this.previewCtx.save();
        this.previewCtx.lineCap = 'round';
        this.previewCtx.lineJoin = 'round';

        for (let i = fadeStart; i < pts.length - 1; i++) {
          const localT = (i - fadeStart) / fadeCount;
          const alpha = Math.max(0, (1 - t) * (1 - localT * 0.5) * pts[i].opacity);
          if (alpha <= 0.02) continue;

          const p0 = pts[i - 1] || pts[i];
          const p1 = pts[i];
          const p2 = pts[i + 1];
          const p3 = pts[i + 2] || p2;
          const w = p1.width * (1 - t * 0.3);

          this.previewCtx.beginPath();
          this.previewCtx.moveTo(p1.x, p1.y);
          const c1x = p1.x + (p2.x - p0.x) / 6;
          const c1y = p1.y + (p2.y - p0.y) / 6;
          const c2x = p2.x - (p3.x - p1.x) / 6;
          const c2y = p2.y - (p3.y - p1.y) / 6;
          this.previewCtx.bezierCurveTo(c1x, c1y, c2x, c2y, p2.x, p2.y);
          this.previewCtx.strokeStyle = hexToRgba(stroke.color, alpha);
          this.previewCtx.lineWidth = w;
          this.previewCtx.stroke();
        }
        this.previewCtx.restore();

        if (frame < totalFrames) {
          requestAnimationFrame(animate);
        } else {
          this.clearPreview();
          resolve();
        }
      };
      requestAnimationFrame(animate);
    });
  }
}
