export interface Point {
  x: number;
  y: number;
  timestamp: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  baseWidth: number;
}

export interface InkSplash {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  startTime: number;
  duration: number;
}

export interface BrushConfig {
  baseWidth: number;
  color: string;
}

export class BrushManager {
  private config: BrushConfig;
  private inkSplashes: InkSplash[] = [];
  private animationFrameId: number | null = null;
  private trailPoints: Point[] = [];
  private onSplashUpdate: (() => void) | null = null;

  constructor(config: BrushConfig) {
    this.config = { ...config };
  }

  setConfig(config: Partial<BrushConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): BrushConfig {
    return { ...this.config };
  }

  calculateWidth(points: Point[], index: number): number {
    if (index === 0 || points.length < 2) {
      return this.config.baseWidth;
    }

    const current = points[index];
    const prev = points[index - 1];

    const dx = current.x - prev.x;
    const dy = current.y - prev.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const dt = current.timestamp - prev.timestamp;

    if (dt === 0) {
      return this.config.baseWidth;
    }

    const speed = distance / dt;
    const maxSpeed = 2.0;
    const normalizedSpeed = Math.min(speed / maxSpeed, 1);

    const variation = this.config.baseWidth * 0.4;
    const width = this.config.baseWidth + variation * (1 - normalizedSpeed * 2);

    return Math.max(
      this.config.baseWidth * 0.6,
      Math.min(this.config.baseWidth * 1.4, width)
    );
  }

  drawStrokeSegment(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    startIndex: number
  ): void {
    if (points.length - startIndex < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = this.config.color;
    ctx.fillStyle = this.config.color;

    for (let i = startIndex; i < points.length; i++) {
      if (i === 0) continue;

      const p0 = points[i - 1];
      const p1 = points[i];
      const midX = (p0.x + p1.x) / 2;
      const midY = (p0.y + p1.y) / 2;
      const cpX = p0.x + (midX - p0.x) * 0.5;
      const cpY = p0.y + (midY - p0.y) * 0.5;

      const width = this.calculateWidth(points, i);

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(cpX, cpY, midX, midY);
      ctx.lineWidth = width;
      ctx.stroke();

      if (i === startIndex + 1 || i === points.length - 1) {
        const dotX = i === startIndex + 1 ? p0.x : p1.x;
        const dotY = i === startIndex + 1 ? p0.y : p1.y;
        const dotWidth = i === startIndex + 1
          ? this.calculateWidth(points, Math.max(1, startIndex))
          : width;

        ctx.beginPath();
        ctx.arc(dotX, dotY, dotWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  drawEntireStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
    if (stroke.points.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;

    for (let i = 1; i < stroke.points.length; i++) {
      const p0 = stroke.points[i - 1];
      const p1 = stroke.points[i];
      const midX = (p0.x + p1.x) / 2;
      const midY = (p0.y + p1.y) / 2;
      const cpX = p0.x + (midX - p0.x) * 0.5;
      const cpY = p0.y + (midY - p0.y) * 0.5;

      const speed = this.calculatePointSpeed(stroke.points, i);
      const variation = stroke.baseWidth * 0.4;
      const normalizedSpeed = Math.min(speed / 2.0, 1);
      const width = stroke.baseWidth + variation * (1 - normalizedSpeed * 2);
      const finalWidth = Math.max(
        stroke.baseWidth * 0.6,
        Math.min(stroke.baseWidth * 1.4, width)
      );

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(cpX, cpY, midX, midY);
      ctx.lineWidth = finalWidth;
      ctx.stroke();

      if (i === 1) {
        ctx.beginPath();
        ctx.arc(p0.x, p0.y, finalWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      if (i === stroke.points.length - 1) {
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, finalWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private calculatePointSpeed(points: Point[], index: number): number {
    if (index === 0) return 0;
    const current = points[index];
    const prev = points[index - 1];
    const dx = current.x - prev.x;
    const dy = current.y - prev.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const dt = current.timestamp - prev.timestamp;
    return dt === 0 ? 0 : distance / dt;
  }

  findTurningPoints(points: Point[]): Point[] {
    if (points.length < 3) return [points[points.length - 1]];

    const turningPoints: Point[] = [];
    const threshold = 0.5;

    for (let i = 2; i < points.length; i++) {
      const p0 = points[i - 2];
      const p1 = points[i - 1];
      const p2 = points[i];

      const v1x = p1.x - p0.x;
      const v1y = p1.y - p0.y;
      const v2x = p2.x - p1.x;
      const v2y = p2.y - p1.y;

      const dot = v1x * v2x + v1y * v2y;
      const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
      const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);

      if (mag1 > 0 && mag2 > 0) {
        const cosAngle = dot / (mag1 * mag2);
        if (cosAngle < threshold) {
          turningPoints.push(p1);
        }
      }
    }

    turningPoints.push(points[points.length - 1]);
    return turningPoints;
  }

  generateInkSplashes(stroke: Stroke): void {
    const turningPoints = this.findTurningPoints(stroke.points);
    const now = performance.now();

    for (const point of turningPoints) {
      const count = 3 + Math.floor(Math.random() * 4);

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 15;
        const maxRadius = 1 + Math.random() * 3;

        this.inkSplashes.push({
          x: point.x + Math.cos(angle) * distance,
          y: point.y + Math.sin(angle) * distance,
          radius: 0,
          maxRadius,
          color: stroke.color,
          startTime: now,
          duration: 800
        });
      }
    }

    this.startSplashAnimation();
  }

  private startSplashAnimation(): void {
    if (this.animationFrameId !== null) return;

    const animate = (): void => {
      const now = performance.now();
      this.inkSplashes = this.inkSplashes.filter(
        (splash) => now - splash.startTime < splash.duration
      );

      if (this.onSplashUpdate) {
        this.onSplashUpdate();
      }

      if (this.inkSplashes.length > 0) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.animationFrameId = null;
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  setOnSplashUpdate(callback: () => void): void {
    this.onSplashUpdate = callback;
  }

  drawInkSplashes(ctx: CanvasRenderingContext2D): void {
    const now = performance.now();

    for (const splash of this.inkSplashes) {
      const elapsed = now - splash.startTime;
      const progress = Math.min(elapsed / splash.duration, 1);

      const radius = splash.maxRadius * (0.3 + progress * 0.7);
      const alpha = 0.6 * (1 - progress);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = splash.color;
      ctx.beginPath();
      ctx.arc(splash.x, splash.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  updateTrail(points: Point[]): void {
    const maxTrailLength = 15;
    const start = Math.max(0, points.length - maxTrailLength);
    this.trailPoints = points.slice(start);
  }

  clearTrail(): void {
    this.trailPoints = [];
  }

  drawTrail(ctx: CanvasRenderingContext2D): void {
    if (this.trailPoints.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = this.config.color;

    for (let i = 1; i < this.trailPoints.length; i++) {
      const p0 = this.trailPoints[i - 1];
      const p1 = this.trailPoints[i];
      const alpha = (i / this.trailPoints.length) * 0.8;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.lineWidth = this.config.baseWidth * 0.6 * (i / this.trailPoints.length);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
