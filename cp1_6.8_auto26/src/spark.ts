import { Particle, ParticleConfig } from './particle';

export interface SparkConfig extends ParticleConfig {
  trailLength?: number;
}

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export class Spark extends Particle {
  public trail: TrailPoint[];
  public trailLength: number;

  constructor(config: SparkConfig) {
    const defaultSize = config.size ?? Spark.randomBetween(2, 4);
    const defaultLifetime = config.lifetime ?? Spark.randomBetween(0.5, 1);

    super({
      ...config,
      size: defaultSize,
      lifetime: defaultLifetime
    });

    this.trailLength = config.trailLength ?? 5;
    this.trail = [];
  }

  public override update(dt: number): void {
    if (!this.alive) return;

    this.trail.unshift({ x: this.x, y: this.y, alpha: 1 });

    if (this.trail.length > this.trailLength) {
      this.trail.pop();
    }

    this.trail.forEach((point, index) => {
      point.alpha = 1 - index / this.trailLength;
    });

    super.update(dt);
  }

  public override draw(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    const alpha = this.lifetime / this.maxLifetime;
    const currentColor = this.interpolateColor(this.color, this.endColor, 1 - alpha);

    if (this.trail.length > 1) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < this.trail.length - 1; i++) {
        const point = this.trail[i];
        const nextPoint = this.trail[i + 1];
        const trailAlpha = alpha * point.alpha * 0.6;

        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(nextPoint.x, nextPoint.y);
        ctx.strokeStyle = currentColor;
        ctx.globalAlpha = trailAlpha;
        ctx.lineWidth = this.size * (1 - i / this.trailLength) * 0.8;
        ctx.stroke();
      }

      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = currentColor;
    ctx.shadowColor = currentColor;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private static randomBetween(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }
}
