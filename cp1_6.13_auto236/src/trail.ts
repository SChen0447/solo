export interface TrailPoint {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  active: boolean;
}

const TRAIL_COLORS = ['#ff6b6b', '#48dbfb', '#feca57', '#ff9ff3'];
const MAX_TRAIL_POINTS = 150;
const POOL_SIZE = 300;

export class TrailManager {
  private points: TrailPoint[] = [];
  private pool: TrailPoint[] = [];
  private currentColor: string = TRAIL_COLORS[0];
  private colorChangeCounter: number = 0;

  constructor() {
    this.initPool();
  }

  private initPool(): void {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool.push({
        x: 0,
        y: 0,
        age: 0,
        maxAge: 2,
        active: false
      });
    }
  }

  private acquire(): TrailPoint | null {
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) {
        return this.pool[i];
      }
    }
    return null;
  }

  private release(point: TrailPoint): void {
    point.active = false;
  }

  addPoint(x: number, y: number): void {
    this.colorChangeCounter++;
    if (this.colorChangeCounter > 20) {
      this.colorChangeCounter = 0;
      this.currentColor = TRAIL_COLORS[Math.floor(Math.random() * TRAIL_COLORS.length)];
    }

    const point = this.acquire();
    if (!point) return;

    point.x = x;
    point.y = y;
    point.age = 0;
    point.maxAge = 2;
    point.active = true;

    this.points.push(point);

    if (this.points.length > MAX_TRAIL_POINTS) {
      const removed = this.points.shift();
      if (removed) {
        this.release(removed);
      }
    }
  }

  update(deltaTime: number): void {
    for (let i = this.points.length - 1; i >= 0; i--) {
      const point = this.points[i];
      point.age += deltaTime;
      if (point.age >= point.maxAge) {
        this.release(point);
        this.points.splice(i, 1);
      }
    }
  }

  getColor(): string {
    return this.currentColor;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.points.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < this.points.length; i++) {
      const prev = this.points[i - 1];
      const curr = this.points[i];

      const prevAlpha = Math.max(0, 1 - prev.age / prev.maxAge);
      const currAlpha = Math.max(0, 1 - curr.age / curr.maxAge);
      const alpha = (prevAlpha + currAlpha) / 2;

      const progress = i / this.points.length;
      const width = 1 + progress * 7;

      ctx.globalAlpha = alpha;
      ctx.strokeStyle = this.currentColor;
      ctx.lineWidth = width;
      ctx.shadowColor = this.currentColor;
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  clear(): void {
    for (const point of this.points) {
      this.release(point);
    }
    this.points.length = 0;
  }
}
