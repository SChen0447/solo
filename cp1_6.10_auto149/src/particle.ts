export type ColorMode = 'random' | 'velocity';

export interface ParticleOptions {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export class Particle {
  public x: number;
  public y: number;
  public prevX: number;
  public prevY: number;
  public vx: number;
  public vy: number;
  public size: number;
  public initialSize: number;
  public hue: number;
  public saturation: number;
  public value: number;
  public age: number;
  public maxAge: number;
  public alive: boolean;

  constructor(options: ParticleOptions) {
    this.x = options.x;
    this.y = options.y;
    this.prevX = options.x;
    this.prevY = options.y;
    this.vx = options.vx;
    this.vy = options.vy;
    this.size = Math.random() * 4 + 2;
    this.initialSize = this.size;
    this.hue = Math.random() * 360;
    this.saturation = Math.random() * 20 + 80;
    this.value = Math.random() * 30 + 70;
    this.age = 0;
    this.maxAge = 5000;
    this.alive = true;
  }

  public update(dt: number): void {
    this.prevX = this.x;
    this.prevY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.age += dt * 1000;
    if (this.age >= this.maxAge) {
      this.alive = false;
    }
    const lifeRatio = 1 - this.age / this.maxAge;
    this.size = this.initialSize * Math.max(0, lifeRatio);
  }

  public getSpeed(): number {
    return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  }

  private velocityToColor(speed: number): string {
    const maxSpeed = 0.8;
    const t = Math.min(1, speed / maxSpeed);
    const r1 = 0, g1 = 170, b1 = 255;
    const r2 = 255, g2 = 51, b2 = 0;
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  public render(ctx: CanvasRenderingContext2D, colorMode: ColorMode): void {
    if (!this.alive || this.size <= 0) return;
    const lifeRatio = 1 - this.age / this.maxAge;
    const alpha = Math.max(0, lifeRatio);

    if (colorMode === 'random') {
      const gradient = ctx.createLinearGradient(this.prevX, this.prevY, this.x, this.y);
      gradient.addColorStop(0, `hsla(${this.hue}, ${this.saturation}%, ${this.value}%, ${alpha * 0.6})`);
      gradient.addColorStop(1, `hsla(${this.hue}, ${this.saturation}%, ${this.value}%, ${alpha})`);
      ctx.strokeStyle = gradient;
    } else {
      const color = this.velocityToColor(this.getSpeed());
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
    }

    ctx.lineWidth = this.size;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.prevX, this.prevY);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

export function createParticle(x: number, y: number): Particle {
  const angle = Math.random() * Math.PI * 2;
  const speed = Math.random() * 0.15 + 0.05;
  return new Particle({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed
  });
}
