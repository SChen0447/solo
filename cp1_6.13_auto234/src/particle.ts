export interface ParticleOptions {
  x: number;
  y: number;
  color: string;
  type: 'move' | 'burst';
  angle?: number;
  speed?: number;
  size?: number;
  alpha?: number;
  lifetime?: number;
  glowSize?: number;
  damping?: number;
}

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  initialAlpha: number;
  size: number;
  glowSize: number;
  lifetime: number;
  age: number;
  type: 'move' | 'burst';
  damping: number;
  dead: boolean;

  constructor(options: ParticleOptions) {
    this.x = options.x;
    this.y = options.y;
    this.color = options.color;
    this.type = options.type;
    this.dead = false;
    this.age = 0;

    if (options.type === 'move') {
      const angle = options.angle ?? (Math.random() - 0.5) * (Math.PI / 6);
      const speed = options.speed ?? (0.5 + Math.random());
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.size = options.size ?? (4 + Math.random() * 4);
      this.alpha = options.alpha ?? (0.6 + Math.random() * 0.3);
      this.initialAlpha = this.alpha;
      this.lifetime = options.lifetime ?? (1500 + Math.random() * 1000);
      this.glowSize = options.glowSize ?? (1 + Math.random());
      this.damping = 0;
    } else {
      const angle = options.angle ?? Math.random() * Math.PI * 2;
      const speed = options.speed ?? (2 + Math.random() * 3);
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.size = options.size ?? (3 + Math.random() * 4);
      this.alpha = options.alpha ?? (0.7 + Math.random() * 0.3);
      this.initialAlpha = this.alpha;
      this.lifetime = options.lifetime ?? (800 + Math.random() * 600);
      this.glowSize = options.glowSize ?? (1.5 + Math.random());
      this.damping = options.damping ?? 0.02;
    }
  }

  update(deltaTime: number): void {
    if (this.dead) return;

    this.age += deltaTime;

    if (this.age >= this.lifetime) {
      this.dead = true;
      return;
    }

    const dt = deltaTime / 16.67;

    if (this.type === 'burst' && this.damping > 0) {
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      const dampingAmount = this.damping * dt;
      if (speed > dampingAmount) {
        const newSpeed = speed - dampingAmount;
        const ratio = newSpeed / speed;
        this.vx *= ratio;
        this.vy *= ratio;
      } else {
        this.vx = 0;
        this.vy = 0;
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const fadeStart = this.lifetime * 0.5;
    if (this.age > fadeStart) {
      const fadeProgress = (this.age - fadeStart) / (this.lifetime - fadeStart);
      const eased = this.cubicBezier(fadeProgress);
      this.alpha = this.initialAlpha * (1 - eased);
    }
  }

  private cubicBezier(t: number): number {
    const x1 = 0.25;
    const y1 = 0.1;
    const x2 = 0.25;
    const y2 = 1;

    return this.solveBezier(t, x1, y1, x2, y2);
  }

  private solveBezier(x: number, x1: number, y1: number, x2: number, y2: number): number {
    if (x === 0 || x === 1) return x;

    let t = x;
    for (let i = 0; i < 8; i++) {
      const currentX = this.bezierX(t, x1, x2) - x;
      if (Math.abs(currentX) < 1e-3) break;

      const dX = this.bezierDerivativeX(t, x1, x2);
      if (Math.abs(dX) < 1e-6) break;

      t -= currentX / dX;
    }

    return this.bezierY(t, y1, y2);
  }

  private bezierX(t: number, x1: number, x2: number): number {
    return 3 * x1 * t * (1 - t) * (1 - t) +
           3 * x2 * t * t * (1 - t) +
           t * t * t;
  }

  private bezierY(t: number, y1: number, y2: number): number {
    return 3 * y1 * t * (1 - t) * (1 - t) +
           3 * y2 * t * t * (1 - t) +
           t * t * t;
  }

  private bezierDerivativeX(t: number, x1: number, x2: number): number {
    return 3 * x1 * (1 - t) * (1 - t) +
           6 * (x2 - x1) * t * (1 - t) +
           3 * (1 - x2) * t * t;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.dead || this.alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;

    ctx.shadowBlur = this.glowSize * 2;
    ctx.shadowColor = this.color;

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export const COLORS: string[] = [
  '#ff6b6b',
  '#48dbfb',
  '#feca57',
  '#ff9ff3',
  '#54a0ff',
  '#a29bfe'
];

export function randomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}
