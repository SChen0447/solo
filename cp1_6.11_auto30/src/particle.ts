import { SECTORS } from './wheel';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

const PARTICLE_COUNT_MIN = 50;
const PARTICLE_COUNT_MAX = 80;
const PARTICLE_LIFETIME = 1500;

export class ParticleSystem {
  private particles: Particle[] = [];
  private startTime = 0;
  private active = false;

  burst(x: number, y: number) {
    this.particles = [];
    this.active = true;
    this.startTime = performance.now();
    const count = PARTICLE_COUNT_MIN + Math.floor(Math.random() * (PARTICLE_COUNT_MAX - PARTICLE_COUNT_MIN + 1));
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const speed = 80 + Math.random() * 180;
      const color = SECTORS[Math.floor(Math.random() * SECTORS.length)].color;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 5 + Math.random() * 7,
        color,
        life: PARTICLE_LIFETIME,
        maxLife: PARTICLE_LIFETIME,
      });
    }
  }

  update(now: number) {
    if (!this.active) return;
    const elapsed = now - this.startTime;
    if (elapsed > PARTICLE_LIFETIME) {
      this.active = false;
      this.particles = [];
      return;
    }
    const dt = 1 / 60;
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.life = p.maxLife - elapsed;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.active) return;
    ctx.save();
    for (const p of this.particles) {
      const t = Math.max(p.life / p.maxLife, 0);
      const currentSize = p.size * t;
      if (currentSize < 0.5) continue;
      ctx.globalAlpha = t;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, currentSize, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  isActive(): boolean {
    return this.active;
  }
}
