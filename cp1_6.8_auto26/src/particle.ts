export interface ParticleConfig {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  endColor: string;
  lifetime: number;
  size?: number;
  gravity?: number;
  wind?: number;
}

export class Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public color: string;
  public endColor: string;
  public lifetime: number;
  public maxLifetime: number;
  public size: number;
  public gravity: number;
  public wind: number;
  public alive: boolean;

  constructor(config: ParticleConfig) {
    this.x = config.x;
    this.y = config.y;
    this.vx = config.vx;
    this.vy = config.vy;
    this.color = config.color;
    this.endColor = config.endColor;
    this.maxLifetime = config.lifetime;
    this.lifetime = config.lifetime;
    this.size = config.size ?? 4;
    this.gravity = config.gravity ?? -9.8;
    this.wind = config.wind ?? 0;
    this.alive = true;
  }

  public update(dt: number): void {
    if (!this.alive) return;

    this.vy += this.gravity * dt;
    this.vx += this.wind * dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.lifetime -= dt;

    if (this.lifetime <= 0) {
      this.alive = false;
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    const alpha = this.lifetime / this.maxLifetime;
    const currentColor = this.interpolateColor(this.color, this.endColor, 1 - alpha);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = currentColor;
    ctx.shadowColor = currentColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  protected interpolateColor(color1: string, color2: string, factor: number): string {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);

    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);

    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);

    return `rgb(${r}, ${g}, ${b})`;
  }
}
