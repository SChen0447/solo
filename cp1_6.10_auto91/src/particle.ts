export class Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public size: number;
  public color: string;
  public life: number;
  public maxLife: number;
  public opacity: number;
  public dead: boolean;

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    size: number,
    color: string,
    life: number
  ) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.opacity = 1;
    this.dead = false;
  }

  public update(dt: number): void {
    if (this.dead) return;

    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.vy += 0.1 * dt * 60;

    this.life -= dt * 1000;
    this.opacity = Math.max(0, this.life / this.maxLife);

    if (this.life <= 0) {
      this.dead = true;
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (this.dead) return;

    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function createBreakParticles(
  x: number,
  y: number,
  color: string
): Particle[] {
  const particles: Particle[] = [];
  const count = Math.floor(Math.random() * 3) + 4;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    const size = Math.random() * 2 + 2;
    const life = 1000;

    particles.push(
      new Particle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        size,
        color,
        life
      )
    );
  }

  return particles;
}
