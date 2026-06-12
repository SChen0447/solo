export interface Vec2 {
  x: number;
  y: number;
}

export class Particle {
  public pos: Vec2;
  public vel: Vec2;
  public acc: Vec2;
  public mass: number;
  public radius: number;
  public color: string;
  public trail: Vec2[] = [];
  public maxTrailLength: number = 20;
  public alive: boolean = true;
  public isSolarWind: boolean = false;
  public solarWindLife: number = 0;
  public absorbed: boolean = false;
  public fragmentLife: number = 0;
  public isFragment: boolean = false;

  constructor(
    x: number,
    y: number,
    vx: number = 0,
    vy: number = 0,
    mass: number = 1,
    radius: number = 2,
    color?: string
  ) {
    this.pos = { x, y };
    this.vel = { x: vx, y: vy };
    this.acc = { x: 0, y: 0 };
    this.mass = mass;
    this.radius = radius;
    this.color = color || this.generateColor();
  }

  private generateColor(): string {
    const hue = Math.floor(Math.random() * 60) + 180;
    const sat = 70 + Math.random() * 30;
    const light = 55 + Math.random() * 25;
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  }

  public applyForce(fx: number, fy: number): void {
    if (this.mass <= 0) return;
    this.acc.x += fx / this.mass;
    this.acc.y += fy / this.mass;
  }

  public update(dt: number): void {
    this.vel.x += this.acc.x * dt;
    this.vel.y += this.acc.y * dt;
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;

    this.acc.x = 0;
    this.acc.y = 0;

    this.trail.unshift({ x: this.pos.x, y: this.pos.y });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.pop();
    }

    if (this.isSolarWind) {
      this.solarWindLife -= dt;
      if (this.solarWindLife <= 0) {
        this.alive = false;
      }
    }

    if (this.isFragment) {
      this.fragmentLife -= dt;
      if (this.fragmentLife <= 0) {
        this.alive = false;
      }
    }
  }

  public distanceTo(other: { pos: Vec2 }): number {
    const dx = this.pos.x - other.pos.x;
    const dy = this.pos.y - other.pos.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (this.trail.length > 1) {
      for (let i = 1; i < this.trail.length; i++) {
        const alpha = i / this.trail.length;
        ctx.beginPath();
        ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
        ctx.strokeStyle = this.colorWithAlpha(alpha * 0.7);
        ctx.lineWidth = this.radius * (1 - i / this.trail.length) * 0.8 + 0.5;
        ctx.stroke();
      }
    }

    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    if (this.isSolarWind) {
      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, this.radius * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = this.colorWithAlpha(0.3);
      ctx.fill();
    }
  }

  protected colorWithAlpha(alpha: number): string {
    const hex = this.color;
    if (hex.startsWith('hsl')) {
      return hex.replace(')', `, ${alpha})`).replace('hsl', 'hsla');
    }
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
