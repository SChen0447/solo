export interface ParticleConfig {
  x: number;
  y: number;
  color: string;
  count?: number;
  speed?: number;
  life?: number;
  size?: number;
}

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
  rotation: number;
  rotationSpeed: number;

  constructor(x: number, y: number, color: string, speed: number = 3, life: number = 1, size: number = 3) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const velocity = speed * (0.5 + Math.random() * 0.5);
    this.vx = Math.cos(angle) * velocity;
    this.vy = Math.sin(angle) * velocity;
    this.color = color;
    this.maxLife = life;
    this.life = life;
    this.size = size * (0.5 + Math.random() * 0.5);
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.3;
  }

  update(dt: number): boolean {
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.vx *= 0.96;
    this.vy *= 0.96;
    this.vy += 0.05 * dt * 60;
    this.rotation += this.rotationSpeed * dt * 60;
    this.life -= dt;
    return this.life > 0;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const alpha = this.life / this.maxLife;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size, this.size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class ParticleSystem {
  particles: Particle[] = [];

  emit(config: ParticleConfig): void {
    const count = config.count ?? 15;
    const speed = config.speed ?? 3;
    const life = config.life ?? 1;
    const size = config.size ?? 3;
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(config.x, config.y, config.color, speed, life, size));
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (!this.particles[i].update(dt)) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      p.draw(ctx);
    }
  }

  clear(): void {
    this.particles.length = 0;
  }
}
