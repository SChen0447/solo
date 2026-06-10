import type { Point, Trail } from './types';
import { COLOR_PALETTE, MAX_TRAILS } from './types';

export class DrawingManager {
  private trails: Trail[] = [];
  private currentTrail: Trail | null = null;
  private onTrailComplete: ((trail: Trail) => void) | null = null;
  private onTrailFade: ((trail: Trail) => void) | null = null;
  private onPointAdded: ((point: Point, trail: Trail) => void) | null = null;

  getTrails(): Trail[] {
    return this.trails;
  }

  getCurrentTrail(): Trail | null {
    return this.currentTrail;
  }

  setOnTrailComplete(callback: (trail: Trail) => void): void {
    this.onTrailComplete = callback;
  }

  setOnTrailFade(callback: (trail: Trail) => void): void {
    this.onTrailFade = callback;
  }

  setOnPointAdded(callback: (point: Point, trail: Trail) => void): void {
    this.onPointAdded = callback;
  }

  startDrawing(x: number, y: number, canvasWidth: number): void {
    const color = this.getColorByX(x, canvasWidth);
    this.currentTrail = {
      id: this.generateId(),
      points: [],
      avgSpeed: 0,
      color,
      isActive: true,
      createdAt: Date.now(),
      playProgress: 0,
      lastPulseTime: Date.now(),
      nextPulseDelay: 1000 + Math.random() * 2000,
      fadingOut: false,
      fadeStartTime: 0
    };
    this.addPoint(x, y);
  }

  addPoint(x: number, y: number): void {
    if (!this.currentTrail) return;

    const now = Date.now();
    const prevPoint = this.currentTrail.points[this.currentTrail.points.length - 1];
    let speed = 0;

    if (prevPoint) {
      const dx = x - prevPoint.x;
      const dy = y - prevPoint.y;
      const dt = Math.max(now - prevPoint.timestamp, 1);
      speed = Math.sqrt(dx * dx + dy * dy) / dt * 16;
    }

    const point: Point = { x, y, timestamp: now, speed };
    this.currentTrail.points.push(point);

    if (this.onPointAdded) {
      this.onPointAdded(point, this.currentTrail);
    }
  }

  endDrawing(): void {
    if (!this.currentTrail || this.currentTrail.points.length < 2) {
      this.currentTrail = null;
      return;
    }

    const totalSpeed = this.currentTrail.points.reduce((sum, p) => sum + p.speed, 0);
    this.currentTrail.avgSpeed = totalSpeed / this.currentTrail.points.length;
    this.currentTrail.isActive = false;

    const completedTrail = this.currentTrail;
    this.trails.push(completedTrail);

    if (this.onTrailComplete) {
      this.onTrailComplete(completedTrail);
    }

    while (this.trails.length > MAX_TRAILS) {
      const oldestTrail = this.trails.shift();
      if (oldestTrail && this.onTrailFade) {
        oldestTrail.fadingOut = true;
        oldestTrail.fadeStartTime = Date.now();
        this.onTrailFade(oldestTrail);
      }
    }

    this.currentTrail = null;
  }

  calculateRecentSpeed(pointCount: number = 10): number {
    if (!this.currentTrail) return 0;
    const recent = this.currentTrail.points.slice(-pointCount);
    if (recent.length < 2) return 0;
    const totalSpeed = recent.reduce((sum, p) => sum + p.speed, 0);
    return totalSpeed / recent.length;
  }

  clearAll(): void {
    this.trails = [];
    this.currentTrail = null;
  }

  private getColorByX(x: number, canvasWidth: number): string {
    const t = Math.max(0, Math.min(1, x / canvasWidth));
    const leftColor = COLOR_PALETTE[0];
    const rightColor = COLOR_PALETTE[4];
    return this.lerpColor(leftColor, rightColor, t);
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private generateId(): string {
    return `trail_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}
