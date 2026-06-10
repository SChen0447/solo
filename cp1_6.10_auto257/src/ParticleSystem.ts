import { BUBBLE_COLORS } from './Bubble';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
  colorIndex: number;
  type: 'explosion' | 'trail';
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 300;

  public setMaxParticles(max: number): void {
    this.maxParticles = max;
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public spawnExplosion(x: number, y: number, colorIndex: number): void {
    const count = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 80 + Math.random() * 150;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 4,
        life: 0,
        maxLife: 0.6,
        colorIndex,
        type: 'explosion',
      });
    }
  }

  public spawnTrail(x: number, y: number, colorIndex: number): void {
    if (this.particles.length >= this.maxParticles) return;
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      radius: 8,
      life: 0,
      maxLife: 0.4,
      colorIndex,
      type: 'trail',
    });
  }

  public update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      if (p.type === 'explosion') {
        p.vy += 200 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.98;
        p.vy *= 0.98;
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const t = p.life / p.maxLife;
      const alpha = 1 - t;
      const c = BUBBLE_COLORS[p.colorIndex % BUBBLE_COLORS.length];

      ctx.save();
      ctx.globalAlpha = alpha;

      if (p.type === 'explosion') {
        const radius = p.radius * (1 - t * 0.3);
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
        gradient.addColorStop(0, `hsla(${c.h}, ${c.s}%, ${c.l + 20}%, 1)`);
        gradient.addColorStop(1, `hsla(${c.h}, ${c.s}%, ${c.l}%, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const scale = 1 - t;
        const radius = p.radius * scale;
        ctx.fillStyle = `hsla(${c.h}, ${c.s}%, ${c.l}%, ${alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  public clear(): void {
    this.particles.length = 0;
  }
}
