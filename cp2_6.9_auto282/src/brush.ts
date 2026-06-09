export interface SamplePoint {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
  velocity: number;
}

export interface BezierSegment {
  p0: SamplePoint;
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  p3: SamplePoint;
}

export interface StrokeSegment {
  points: SamplePoint[];
  bezierControlPoints: BezierSegment[];
  brushSize: number;
  inkDensity: number;
  inkColor: string;
  startTime: number;
  endTime: number;
}

const MAX_POINTS_PER_FRAME = 60;

export class BrushEngine {
  private currentPoints: SamplePoint[] = [];
  private isDrawing: boolean = false;
  private lastPoint: SamplePoint | null = null;
  private framePointCount: number = 0;
  private lastFrameTime: number = 0;

  startStroke(x: number, y: number, brushSize: number): SamplePoint {
    this.isDrawing = true;
    this.currentPoints = [];
    const now = performance.now();
    const point: SamplePoint = {
      x,
      y,
      pressure: 0.8,
      timestamp: now,
      velocity: 0
    };
    this.currentPoints.push(point);
    this.lastPoint = point;
    this.lastFrameTime = now;
    this.framePointCount = 1;
    return point;
  }

  addPoint(x: number, y: number): SamplePoint | null {
    if (!this.isDrawing) return null;

    const now = performance.now();
    if (now - this.lastFrameTime >= 1000 / 60) {
      this.framePointCount = 0;
      this.lastFrameTime = now;
    }
    if (this.framePointCount >= MAX_POINTS_PER_FRAME) {
      return null;
    }
    this.framePointCount++;

    const lastP = this.lastPoint;
    const dt = now - (lastP?.timestamp || now);
    const dx = x - (lastP?.x || x);
    const dy = y - (lastP?.y || y);
    const distance = Math.sqrt(dx * dx + dy * dy);
    const velocity = dt > 0 ? distance / dt : 0;

    const pressure = this.calculatePressure(velocity);

    const point: SamplePoint = {
      x,
      y,
      pressure,
      timestamp: now,
      velocity
    };

    this.currentPoints.push(point);
    this.lastPoint = point;
    return point;
  }

  endStroke(
    brushSize: number,
    inkDensity: number,
    inkColor: string
  ): StrokeSegment | null {
    if (!this.isDrawing || this.currentPoints.length < 2) {
      this.isDrawing = false;
      this.currentPoints = [];
      this.lastPoint = null;
      return null;
    }

    this.applyTipTaper();

    const bezierSegments = this.generateBezierSegments();

    const stroke: StrokeSegment = {
      points: [...this.currentPoints],
      bezierControlPoints: bezierSegments,
      brushSize,
      inkDensity,
      inkColor,
      startTime: this.currentPoints[0].timestamp,
      endTime: this.currentPoints[this.currentPoints.length - 1].timestamp
    };

    this.isDrawing = false;
    this.currentPoints = [];
    this.lastPoint = null;
    return stroke;
  }

  getCurrentPoints(): SamplePoint[] {
    return this.currentPoints;
  }

  getIsDrawing(): boolean {
    return this.isDrawing;
  }

  private calculatePressure(velocity: number): number {
    const normalizedVelocity = Math.min(velocity / 2, 1);
    return 1 - normalizedVelocity * 0.5;
  }

  private applyTipTaper(): void {
    const points = this.currentPoints;
    if (points.length < 5) return;

    const tipLength = Math.min(10, Math.floor(points.length * 0.3));
    const startIndex = points.length - tipLength;
    const initialPressure = points[startIndex]?.pressure || 0.8;

    for (let i = 0; i < tipLength; i++) {
      const t = i / tipLength;
      const taperFactor = 1 - t * 0.8;
      const idx = startIndex + i;
      if (points[idx]) {
        points[idx].pressure = initialPressure * taperFactor;
      }
    }
  }

  generateBezierSegments(points?: SamplePoint[]): BezierSegment[] {
    const pts = points || this.currentPoints;
    if (pts.length < 2) return [];

    const segments: BezierSegment[] = [];

    if (pts.length === 2) {
      const p0 = pts[0];
      const p3 = pts[1];
      const midX = (p0.x + p3.x) / 2;
      const midY = (p0.y + p3.y) / 2;
      segments.push({
        p0,
        p1: { x: (p0.x + midX) / 2, y: (p0.y + midY) / 2 },
        p2: { x: (p3.x + midX) / 2, y: (p3.y + midY) / 2 },
        p3
      });
      return segments;
    }

    const tension = 0.5;

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i === 0 ? pts[0] : pts[i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i === pts.length - 2 ? pts[pts.length - 1] : pts[i + 2];

      const cp1x = p1.x + (p2.x - p0.x) / 6 * tension * 2;
      const cp1y = p1.y + (p2.y - p0.y) / 6 * tension * 2;
      const cp2x = p2.x - (p3.x - p1.x) / 6 * tension * 2;
      const cp2y = p2.y - (p3.y - p1.y) / 6 * tension * 2;

      segments.push({
        p0: p1,
        p1: { x: cp1x, y: cp1y },
        p2: { x: cp2x, y: cp2y },
        p3: p2
      });
    }

    return segments;
  }

  getPointOnBezier(
    segment: BezierSegment,
    t: number
  ): { x: number; y: number; pressure: number } {
    const { p0, p1, p2, p3 } = segment;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    const x = mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x;
    const y = mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y;
    const pressure = p0.pressure + (p3.pressure - p0.pressure) * t;

    return { x, y, pressure };
  }

  getWidthAtPressure(pressure: number, baseSize: number): number {
    return baseSize * (0.3 + pressure * 0.9);
  }
}
