import p5 from 'p5';

export interface BrushPoint {
  x: number;
  y: number;
  size: number;
  color: string;
  alpha: number;
  speed: number;
  timestamp: number;
  isFeibai: boolean;
}

export interface BrushStroke {
  points: BrushPoint[];
  color: string;
  baseSize: number;
  startTime: number;
  endTime: number;
}

export interface InkBloom {
  x: number;
  y: number;
  radius: number;
  color: string;
  startTime: number;
  duration: number;
}

export class Brush {
  private currentStroke: BrushStroke | null = null;
  private strokeHistory: BrushStroke[] = [];
  private currentColor: string = '#1a1a1a';
  private baseSize: number = 8;
  private lastPoint: { x: number; y: number; timestamp: number } | null = null;
  private p5: p5;
  private inkBlooms: InkBloom[] = [];
  private lastMoveTime: number = 0;
  private isStationary: boolean = false;
  private stationaryStartTime: number = 0;
  private currentBloom: InkBloom | null = null;
  private feibaiCounter: number = 0;

  constructor(p5Instance: p5) {
    this.p5 = p5Instance;
  }

  setColor(color: string): void {
    this.currentColor = color;
  }

  getColor(): string {
    return this.currentColor;
  }

  setBaseSize(size: number): void {
    this.baseSize = size;
  }

  getBaseSize(): number {
    return this.baseSize;
  }

  startStroke(x: number, y: number): void {
    const now = performance.now();
    this.currentStroke = {
      points: [],
      color: this.currentColor,
      baseSize: this.baseSize,
      startTime: now,
      endTime: now
    };
    this.lastPoint = { x, y, timestamp: now };
    this.lastMoveTime = now;
    this.isStationary = false;
    this.currentBloom = null;
    this.feibaiCounter = 0;

    this.addPoint(x, y, 0);
  }

  moveTo(x: number, y: number): void {
    if (!this.currentStroke || !this.lastPoint) return;

    const now = performance.now();
    const dt = now - this.lastPoint.timestamp;
    const dx = x - this.lastPoint.x;
    const dy = y - this.lastPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = dt > 0 ? (distance / dt) * 16.67 : 0;

    if (speed > 0.5) {
      this.isStationary = false;
      this.lastMoveTime = now;
      this.currentBloom = null;

      const interpolatedPoints = this.interpolatePoints(
        this.lastPoint.x, this.lastPoint.y,
        x, y,
        this.lastPoint.timestamp, now
      );

      interpolatedPoints.forEach((pt) => {
        this.addPoint(pt.x, pt.y, pt.speed);
      });

      this.lastPoint = { x, y, timestamp: now };
    } else {
      if (!this.isStationary) {
        this.isStationary = true;
        this.stationaryStartTime = now;
      }

      if (now - this.stationaryStartTime > 500 && !this.currentBloom) {
        this.currentBloom = {
          x,
          y,
          radius: 10,
          color: this.currentColor,
          startTime: now,
          duration: 800
        };
        this.inkBlooms.push(this.currentBloom);
      }
    }

    if (this.currentStroke) {
      this.currentStroke.endTime = now;
    }
  }

  private interpolatePoints(
    x1: number, y1: number,
    x2: number, y2: number,
    t1: number, t2: number
  ): Array<{ x: number; y: number; speed: number }> {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const points: Array<{ x: number; y: number; speed: number }> = [];

    const minSpacing = 2;
    const numPoints = Math.max(1, Math.floor(distance / minSpacing));
    const dt = t2 - t1;
    const avgSpeed = dt > 0 ? (distance / dt) * 16.67 : 0;

    for (let i = 1; i <= numPoints; i++) {
      const t = i / numPoints;
      points.push({
        x: x1 + dx * t,
        y: y1 + dy * t,
        speed: avgSpeed
      });
    }

    return points;
  }

  private addPoint(x: number, y: number, speed: number): void {
    if (!this.currentStroke) return;

    let size = this.calculateSize(speed);
    let isFeibai = false;

    if (speed > 10) {
      this.feibaiCounter++;
      if (this.feibaiCounter % 5 === 3 || this.feibaiCounter % 5 === 4) {
        isFeibai = true;
      }
    } else {
      this.feibaiCounter = 0;
    }

    const point: BrushPoint = {
      x,
      y,
      size,
      color: this.currentStroke.color,
      alpha: isFeibai ? 0.15 : 0.6,
      speed,
      timestamp: performance.now(),
      isFeibai
    };

    this.currentStroke.points.push(point);
  }

  private calculateSize(speed: number): number {
    const minSize = 1;
    const maxSize = Math.max(8, this.baseSize);
    const speedFactor = Math.min(speed / 20, 1);
    const dynamicSize = maxSize - speedFactor * (maxSize - minSize);
    return Math.max(1, Math.min(this.baseSize, dynamicSize));
  }

  endStroke(): void {
    if (this.currentStroke && this.currentStroke.points.length > 0) {
      this.currentStroke.endTime = performance.now();
      this.strokeHistory.push(this.currentStroke);
    }
    this.currentStroke = null;
    this.lastPoint = null;
    this.currentBloom = null;
  }

  draw(): void {
    this.strokeHistory.forEach((stroke) => {
      this.drawStroke(stroke);
    });

    if (this.currentStroke) {
      this.drawStroke(this.currentStroke);
    }

    this.drawInkBlooms();
  }

  private drawStroke(stroke: BrushStroke): void {
    if (stroke.points.length < 1) return;

    const p = this.p5;

    for (let i = 0; i < stroke.points.length; i++) {
      const point = stroke.points[i];

      if (point.isFeibai) {
        continue;
      }

      p.noStroke();

      const col = p.color(point.color);
      col.setAlpha(point.alpha * 255);
      p.fill(col);

      p.ellipse(point.x, point.y, point.size, point.size);

      if (i > 0) {
        const prevPoint = stroke.points[i - 1];
        if (!prevPoint.isFeibai) {
          const dist = p.dist(prevPoint.x, prevPoint.y, point.x, point.y);
          const steps = Math.ceil(dist / 1);

          for (let j = 0; j < steps; j++) {
            const t = j / steps;
            const x = p.lerp(prevPoint.x, point.x, t);
            const y = p.lerp(prevPoint.y, point.y, t);
            const size = p.lerp(prevPoint.size, point.size, t);
            const alpha = p.lerp(prevPoint.alpha, point.alpha, t);

            const lineCol = p.color(point.color);
            lineCol.setAlpha(alpha * 255);
            p.fill(lineCol);
            p.ellipse(x, y, size, size);
          }
        }
      }
    }
  }

  private drawInkBlooms(): void {
    const now = performance.now();
    const p = this.p5;

    this.inkBlooms = this.inkBlooms.filter((bloom) => {
      const elapsed = now - bloom.startTime;
      if (elapsed > bloom.duration) return false;

      const progress = elapsed / bloom.duration;
      const alpha = 0.1 + 0.2 * (1 - Math.abs(progress - 0.5) * 2);
      const currentRadius = bloom.radius * (0.5 + progress * 0.5);

      const col = p.color(bloom.color);

      for (let r = currentRadius; r > 0; r -= 1) {
        const rRatio = r / currentRadius;
        const rAlpha = alpha * (1 - rRatio * 0.7);
        col.setAlpha(rAlpha * 255);
        p.fill(col);
        p.noStroke();
        p.ellipse(bloom.x, bloom.y, r * 2, r * 2);
      }

      return true;
    });
  }

  drawPoint(point: BrushPoint, fadeAlpha: number = 1): void {
    if (point.isFeibai) return;

    const p = this.p5;
    p.noStroke();

    const col = p.color(point.color);
    col.setAlpha(point.alpha * fadeAlpha * 255);
    p.fill(col);

    p.ellipse(point.x, point.y, point.size, point.size);
  }

  drawConnection(prev: BrushPoint, curr: BrushPoint, fadeAlpha: number = 1): void {
    if (prev.isFeibai || curr.isFeibai) return;

    const p = this.p5;
    const dist = p.dist(prev.x, prev.y, curr.x, curr.y);
    const steps = Math.ceil(dist / 1);

    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      const x = p.lerp(prev.x, curr.x, t);
      const y = p.lerp(prev.y, curr.y, t);
      const size = p.lerp(prev.size, curr.size, t);
      const alpha = p.lerp(prev.alpha, curr.alpha, t);

      const col = p.color(curr.color);
      col.setAlpha(alpha * fadeAlpha * 255);
      p.fill(col);
      p.noStroke();
      p.ellipse(x, y, size, size);
    }
  }

  getStrokeHistory(): BrushStroke[] {
    return [...this.strokeHistory];
  }

  getTotalPoints(): number {
    return this.strokeHistory.reduce((sum, stroke) => sum + stroke.points.length, 0);
  }

  undoLastStroke(): boolean {
    if (this.strokeHistory.length > 0) {
      this.strokeHistory.pop();
      return true;
    }
    return false;
  }

  clearAll(): void {
    this.strokeHistory = [];
    this.currentStroke = null;
    this.inkBlooms = [];
    this.currentBloom = null;
  }

  hasHistory(): boolean {
    return this.strokeHistory.length > 0;
  }

  exportPlaybackData(): BrushStroke[] {
    return this.strokeHistory.map((stroke) => ({
      ...stroke,
      points: [...stroke.points]
    }));
  }
}
