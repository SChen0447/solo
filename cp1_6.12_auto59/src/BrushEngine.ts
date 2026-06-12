export type BrushType = 'xiaokai' | 'zhongfeng' | 'dakai' | 'kubi' | 'cefeng';

export interface BrushConfig {
  type: BrushType;
  name: string;
  minWidth: number;
  maxWidth: number;
  blurRadius: number;
  isDry: boolean;
  isSide: boolean;
}

export const BRUSH_PRESETS: Record<BrushType, BrushConfig> = {
  xiaokai: { type: 'xiaokai', name: '小楷', minWidth: 0.5, maxWidth: 4, blurRadius: 1.5, isDry: false, isSide: false },
  zhongfeng: { type: 'zhongfeng', name: '中锋', minWidth: 0.5, maxWidth: 8, blurRadius: 2, isDry: false, isSide: false },
  dakai: { type: 'dakai', name: '大楷', minWidth: 1, maxWidth: 14, blurRadius: 2.5, isDry: false, isSide: false },
  kubi: { type: 'kubi', name: '枯笔', minWidth: 0.5, maxWidth: 10, blurRadius: 1, isDry: true, isSide: false },
  cefeng: { type: 'cefeng', name: '侧锋', minWidth: 1, maxWidth: 16, blurRadius: 2, isDry: false, isSide: true },
};

export interface PaintPoint {
  x: number;
  y: number;
  speed: number;
  pressure: number;
}

export class BrushEngine {
  private config: BrushConfig;
  private color: string;
  private opacity: number;
  private prevPoint: PaintPoint | null = null;
  private prevWidth: number = 0;
  private strokePoints: PaintPoint[] = [];
  private isStarting: boolean = true;
  private taperFrames: number = 0;
  private static readonly TAPER_LENGTH = 8;
  private static readonly SPEED_THRESHOLD = 2;
  private static readonly MAX_SPEED = 60;

  constructor(config: BrushConfig = BRUSH_PRESETS.zhongfeng) {
    this.config = config;
    this.color = '#1a1a1a';
    this.opacity = 1;
  }

  setBrush(type: BrushType): void {
    this.config = BRUSH_PRESETS[type];
  }

  setColor(color: string): void {
    this.color = color;
  }

  setOpacity(opacity: number): void {
    this.opacity = Math.max(0.1, Math.min(1, opacity));
  }

  getConfig(): BrushConfig {
    return this.config;
  }

  beginStroke(): void {
    this.prevPoint = null;
    this.prevWidth = 0;
    this.strokePoints = [];
    this.isStarting = true;
    this.taperFrames = 0;
  }

  endStroke(ctx: CanvasRenderingContext2D): void {
    if (this.strokePoints.length > 0 && this.prevPoint) {
      this._drawTaperEnd(ctx, this.prevPoint);
    }
    this.prevPoint = null;
    this.strokePoints = [];
    this.isStarting = false;
    this.taperFrames = 0;
  }

  paint(ctx: CanvasRenderingContext2D, x: number, y: number): { pressure: number; width: number } {
    const now = performance.now();

    let speed = 0;
    if (this.prevPoint) {
      const dx = x - this.prevPoint.x;
      const dy = y - this.prevPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      speed = dist;
    }

    const normalizedSpeed = Math.min(speed / BrushEngine.MAX_SPEED, 1);
    const pressure = 1 - normalizedSpeed;

    let width = this._mapSpeedToWidth(speed);

    if (this.isStarting) {
      this.taperFrames++;
      const taperFactor = Math.min(this.taperFrames / BrushEngine.TAPER_LENGTH, 1);
      width *= taperFactor;
      if (this.taperFrames >= BrushEngine.TAPER_LENGTH) {
        this.isStarting = false;
      }
    }

    width = this._smoothWidth(width);

    const point: PaintPoint = { x, y, speed, pressure };
    this.strokePoints.push(point);

    if (this.prevPoint) {
      this._drawSegment(ctx, this.prevPoint, point, width);
    } else {
      this._drawDot(ctx, point, width);
    }

    this.prevPoint = point;
    this.prevWidth = width;

    return { pressure, width };
  }

  private _mapSpeedToWidth(speed: number): number {
    const { minWidth, maxWidth } = this.config;
    const ratio = Math.min(speed / BrushEngine.MAX_SPEED, 1);
    const eased = Math.pow(1 - ratio, 1.5);
    return minWidth + (maxWidth - minWidth) * eased;
  }

  private _smoothWidth(currentWidth: number): number {
    if (this.prevWidth === 0) return currentWidth;
    const smoothing = 0.3;
    return this.prevWidth + (currentWidth - this.prevWidth) * smoothing;
  }

  private _drawSegment(
    ctx: CanvasRenderingContext2D,
    from: PaintPoint,
    to: PaintPoint,
    width: number
  ): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.5) return;

    const steps = Math.max(Math.ceil(dist / 1.5), 1);

    ctx.save();

    const r = parseInt(this.color.slice(1, 3), 16);
    const g = parseInt(this.color.slice(3, 5), 16);
    const b = parseInt(this.color.slice(5, 7), 16);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = from.x + dx * t;
      const py = from.y + dy * t;

      const fromW = this.prevWidth || width;
      const segWidth = fromW + (width - fromW) * t;

      if (this.config.isDry && this._shouldSkipDry(px, py)) {
        continue;
      }

      ctx.beginPath();

      if (this.config.isSide) {
        const angle = Math.atan2(dy, dx);
        const rw = segWidth * 0.5;
        const rh = segWidth * 0.25;
        ctx.ellipse(px, py, rw, rh, angle + Math.PI / 2, 0, Math.PI * 2);
      } else {
        const radius = Math.max(segWidth * 0.5, 0.25);
        ctx.arc(px, py, radius, 0, Math.PI * 2);
      }

      ctx.fillStyle = `rgba(${r},${g},${b},${this.opacity})`;
      ctx.shadowColor = `rgba(${r},${g},${b},${this.opacity * 0.3})`;
      ctx.shadowBlur = this.config.blurRadius;
      ctx.fill();
    }

    ctx.restore();
  }

  private _drawDot(ctx: CanvasRenderingContext2D, point: PaintPoint, width: number): void {
    ctx.save();

    const r = parseInt(this.color.slice(1, 3), 16);
    const g = parseInt(this.color.slice(3, 5), 16);
    const b = parseInt(this.color.slice(5, 7), 16);

    ctx.beginPath();

    const dotWidth = Math.max(width * 0.3, 0.5);

    if (this.config.isSide) {
      ctx.ellipse(point.x, point.y, dotWidth * 0.5, dotWidth * 0.25, 0, 0, Math.PI * 2);
    } else {
      ctx.arc(point.x, point.y, dotWidth * 0.5, 0, Math.PI * 2);
    }

    ctx.fillStyle = `rgba(${r},${g},${b},${this.opacity})`;
    ctx.shadowColor = `rgba(${r},${g},${b},${this.opacity * 0.3})`;
    ctx.shadowBlur = this.config.blurRadius;
    ctx.fill();

    ctx.restore();
  }

  private _drawTaperEnd(ctx: CanvasRenderingContext2D, point: PaintPoint): void {
    ctx.save();

    const r = parseInt(this.color.slice(1, 3), 16);
    const g = parseInt(this.color.slice(3, 5), 16);
    const b = parseInt(this.color.slice(5, 7), 16);

    const taperSteps = 6;
    const startWidth = this.prevWidth;

    let prevDx = 0, prevDy = -1;
    if (this.strokePoints.length >= 2) {
      const prev = this.strokePoints[this.strokePoints.length - 2];
      prevDx = point.x - prev.x;
      prevDy = point.y - prev.y;
      const len = Math.sqrt(prevDx * prevDx + prevDy * prevDy);
      if (len > 0) {
        prevDx /= len;
        prevDy /= len;
      }
    }

    for (let i = 1; i <= taperSteps; i++) {
      const t = i / taperSteps;
      const w = startWidth * (1 - t) * 0.5;
      if (w < 0.2) break;

      const px = point.x + prevDx * i * 1.5;
      const py = point.y + prevDy * i * 1.5;

      ctx.beginPath();

      if (this.config.isSide) {
        ctx.ellipse(px, py, w * 0.5, w * 0.25, Math.atan2(prevDy, prevDx) + Math.PI / 2, 0, Math.PI * 2);
      } else {
        ctx.arc(px, py, Math.max(w, 0.2), 0, Math.PI * 2);
      }

      const alpha = this.opacity * (1 - t * 0.8);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.shadowColor = `rgba(${r},${g},${b},${alpha * 0.2})`;
      ctx.shadowBlur = this.config.blurRadius * 0.5;
      ctx.fill();
    }

    ctx.restore();
  }

  private _shouldSkipDry(x: number, y: number): boolean {
    const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    const val = hash - Math.floor(hash);
    return val < 0.35;
  }
}
