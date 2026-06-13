export interface ParticleData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'splash' | 'hit' | 'dissolve' | 'ripple';
  rippleRadius?: number;
  rippleMaxRadius?: number;
  rippleLineWidth?: number;
}

const MAX_PARTICLES = 60;

export class ParticleManager {
  particles: ParticleData[] = [];

  addParticle(p: ParticleData): void {
    if (this.particles.length >= MAX_PARTICLES) return;
    this.particles.push(p);
  }

  spawnSplash(x: number, y: number, count: number = 4): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 60;
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 8 + Math.random() * 12,
        alpha: 0.8,
        life: 1 + Math.random(),
        maxLife: 1 + Math.random(),
        type: 'splash',
      });
    }
  }

  spawnHit(x1: number, y1: number, x2: number, y2: number): void {
    const count = 3;
    for (let i = 0; i < count; i++) {
      const t = (i + 1) / (count + 1);
      const px = x1 + (x2 - x1) * t;
      const py = y1 + (y2 - y1) * t;
      this.addParticle({
        x: px + (Math.random() - 0.5) * 6,
        y: py + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20,
        radius: 4 + Math.random() * 6,
        alpha: 0.7,
        life: 0.3,
        maxLife: 0.3,
        type: 'hit',
      });
    }
  }

  spawnDissolve(x: number, y: number): void {
    const count = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 40;
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 6 + Math.random() * 9,
        alpha: 1,
        life: 0.8,
        maxLife: 0.8,
        type: 'dissolve',
      });
    }
    this.addParticle({
      x,
      y,
      vx: 0,
      vy: 0,
      radius: 0,
      alpha: 0.5,
      life: 0.5,
      maxLife: 0.5,
      type: 'ripple',
      rippleRadius: 5,
      rippleMaxRadius: 30,
      rippleLineWidth: 2,
    });
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      const ratio = p.life / p.maxLife;
      if (p.type === 'ripple') {
        const rRatio = 1 - ratio;
        p.rippleRadius! = 5 + rRatio * (p.rippleMaxRadius! - 5);
        p.alpha = 0.5 * ratio;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.98;
        p.vy *= 0.98;
        if (p.type === 'dissolve') {
          p.alpha = ratio;
        } else if (p.type === 'hit') {
          p.alpha = 0.7 * ratio;
        } else {
          p.alpha = 0.8 * ratio;
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.save();
      if (p.type === 'ripple') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.rippleRadius!, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(44, 44, 44, ${p.alpha})`;
        ctx.lineWidth = p.rippleLineWidth!;
        ctx.stroke();
      } else {
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        if (p.type === 'dissolve') {
          gradient.addColorStop(0, `rgba(30, 30, 30, ${p.alpha})`);
          gradient.addColorStop(1, `rgba(30, 30, 30, 0)`);
        } else if (p.type === 'hit') {
          gradient.addColorStop(0, `rgba(44, 44, 44, ${p.alpha})`);
          gradient.addColorStop(1, `rgba(44, 44, 44, 0)`);
        } else {
          gradient.addColorStop(0, `rgba(44, 44, 44, ${p.alpha})`);
          gradient.addColorStop(0.6, `rgba(44, 44, 44, ${p.alpha * 0.4})`);
          gradient.addColorStop(1, `rgba(44, 44, 44, 0)`);
        }
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
