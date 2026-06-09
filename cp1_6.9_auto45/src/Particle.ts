export interface ParticleOptions {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export class Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public color: string;
  public size: number;
  public life: number;
  public maxLife: number;
  public alpha: number;
  public createdAt: number;

  constructor(options: ParticleOptions) {
    this.x = options.x;
    this.y = options.y;
    this.vx = options.vx;
    this.vy = options.vy;
    this.color = options.color;
    this.size = options.size;
    this.life = options.life;
    this.maxLife = options.maxLife;
    this.alpha = 1;
    this.createdAt = performance.now();
  }

  update(deltaTime: number): boolean {
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    this.vx *= 0.96;
    this.vy *= 0.96;
    this.life -= deltaTime;
    this.alpha = Math.max(0, this.life / this.maxLife);
    return this.life > 0;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class SandPile {
  public x: number;
  public y: number;
  public radius: number;
  public color: string;
  public saturation: number;
  public targetSaturation: number;
  public startTime: number;
  public isActive: boolean;
  public deactivateTime: number;

  constructor(x: number, y: number, radius: number, color: string) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.saturation = 1;
    this.targetSaturation = 1;
    this.startTime = performance.now();
    this.isActive = true;
    this.deactivateTime = 0;
  }

  update(currentTime: number): boolean {
    if (this.isActive) {
      const elapsed = (currentTime - this.startTime) / 1000;
      if (elapsed > 0.5) {
        this.targetSaturation = 1.3;
      }
    } else {
      const elapsed = (currentTime - this.deactivateTime) / 1000;
      if (elapsed > 2) {
        return false;
      }
      this.targetSaturation = 1 - (elapsed / 2) * 0.3;
    }
    this.saturation += (this.targetSaturation - this.saturation) * 0.1;
    return true;
  }

  deactivate(currentTime: number): void {
    this.isActive = false;
    this.deactivateTime = currentTime;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.saturation <= 1) return;
    ctx.save();
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.radius * this.saturation
    );
    gradient.addColorStop(0, this.adjustColor(this.color, this.saturation));
    gradient.addColorStop(0.6, this.adjustColor(this.color, this.saturation * 0.8));
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * this.saturation, 0, Math.PI * 2);
    ctx.fill();

    const highlightGradient = ctx.createRadialGradient(
      this.x - this.radius * 0.3, this.y - this.radius * 0.3, 0,
      this.x, this.y, this.radius * this.saturation
    );
    highlightGradient.addColorStop(0, `rgba(255,255,255,${0.15 * (this.saturation - 1)})`);
    highlightGradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = highlightGradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * this.saturation, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private adjustColor(color: string, factor: number): string {
    const hex = color.replace('#', '');
    const r = Math.min(255, Math.floor(parseInt(hex.substr(0, 2), 16) * factor));
    const g = Math.min(255, Math.floor(parseInt(hex.substr(2, 2), 16) * factor));
    const b = Math.min(255, Math.floor(parseInt(hex.substr(4, 2), 16) * factor));
    return `rgba(${r},${g},${b},${(this.saturation - 1) * 0.8})`;
  }
}
