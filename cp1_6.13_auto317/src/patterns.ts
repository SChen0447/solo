export interface PathPoint {
  x: number;
  y: number;
  timestamp: number;
  alpha: number;
}

export interface PathSegment {
  points: PathPoint[];
  startTime: number;
  endTime: number;
  fadingOut: boolean;
  fadeStart: number;
}

const MAX_PATH_POINTS = 500;
const PATH_LIFETIME = 3000;
const FADE_OUT_DURATION = 2000;
const SAMPLE_RATE = 20;

export class PathManager {
  private segments: PathSegment[] = [];
  private currentSegment: PathSegment | null = null;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private lastSampleTime = 0;
  private isDragging = false;

  startDrag(x: number, y: number): void {
    this.isDragging = true;
    this.lastMouseX = x;
    this.lastMouseY = y;
    const now = performance.now();
    this.currentSegment = {
      points: [{ x, y, timestamp: now, alpha: 1 }],
      startTime: now,
      endTime: now,
      fadingOut: false,
      fadeStart: 0,
    };
    this.segments.push(this.currentSegment);
    this.lastSampleTime = now;
  }

  updateDrag(x: number, y: number): void {
    if (!this.isDragging || !this.currentSegment) return;

    const now = performance.now();
    const dx = x - this.lastMouseX;
    const dy = y - this.lastMouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1) return;

    const steps = Math.max(1, Math.floor(dist / (100 / SAMPLE_RATE)));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const px = this.lastMouseX + dx * t;
      const py = this.lastMouseY + dy * t;
      this.currentSegment.points.push({
        x: px,
        y: py,
        timestamp: now,
        alpha: 1,
      });
    }

    this.currentSegment.endTime = now;
    this.lastMouseX = x;
    this.lastMouseY = y;
    this.lastSampleTime = now;
  }

  endDrag(): void {
    if (this.currentSegment) {
      this.currentSegment.fadingOut = true;
      this.currentSegment.fadeStart = performance.now();
    }
    this.isDragging = false;
    this.currentSegment = null;
  }

  getSpeed(x: number, y: number): number {
    const dx = x - this.lastMouseX;
    const dy = y - this.lastMouseY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  getParticleDensity(speed: number): number {
    if (speed > 5) return 20;
    if (speed < 2) return 5;
    return Math.floor(5 + ((speed - 2) / 3) * 15);
  }

  update(now: number): void {
    for (const seg of this.segments) {
      if (seg.fadingOut) {
        const fadeElapsed = now - seg.fadeStart;
        const fadeProgress = Math.min(fadeElapsed / FADE_OUT_DURATION, 1);
        const pointCount = seg.points.length;
        const fadePointIndex = Math.floor(pointCount * fadeProgress);
        for (let i = 0; i < pointCount; i++) {
          if (i < fadePointIndex) {
            seg.points[i].alpha = 0;
          } else if (i < fadePointIndex + Math.ceil(pointCount * 0.1)) {
            const localProgress =
              (i - fadePointIndex) / Math.ceil(pointCount * 0.1);
            seg.points[i].alpha = localProgress;
          }
        }
      } else {
        for (const pt of seg.points) {
          const age = now - pt.timestamp;
          if (age > PATH_LIFETIME) {
            pt.alpha = 0;
          } else if (age > PATH_LIFETIME - FADE_OUT_DURATION) {
            pt.alpha = (PATH_LIFETIME - age) / FADE_OUT_DURATION;
          } else {
            pt.alpha = 1;
          }
        }
      }
    }

    this.segments = this.segments.filter((seg) => {
      seg.points = seg.points.filter((pt) => pt.alpha > 0.01);
      return seg.points.length > 0;
    });

    this.enforceMaxPoints();
  }

  private enforceMaxPoints(): void {
    let totalPoints = 0;
    for (const seg of this.segments) {
      totalPoints += seg.points.length;
    }
    while (totalPoints > MAX_PATH_POINTS && this.segments.length > 0) {
      const oldest = this.segments[0];
      if (oldest.points.length > 0) {
        oldest.points.shift();
        totalPoints--;
      } else {
        this.segments.shift();
      }
    }
  }

  getActivePoints(): PathPoint[] {
    const result: PathPoint[] = [];
    for (const seg of this.segments) {
      for (const pt of seg.points) {
        if (pt.alpha > 0.01) {
          result.push(pt);
        }
      }
    }
    return result;
  }

  getLatestSegmentPoints(): PathPoint[] {
    if (!this.currentSegment) return [];
    return this.currentSegment.points.filter((pt) => pt.alpha > 0.01);
  }

  clearAll(): void {
    this.segments = [];
    this.currentSegment = null;
    this.isDragging = false;
  }

  get isDragActive(): boolean {
    return this.isDragging;
  }

  get segmentsList(): PathSegment[] {
    return this.segments;
  }
}
