export interface TrailParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  initialRadius: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
  active: boolean;
}

const MAX_PARTICLES = 1000;
const GRAVITY = 0.05;
const PARTICLE_LIFE_FRAMES = 120;

export class ParticleSystem {
  pool: TrailParticle[] = [];

  constructor() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.pool.push({
        x: 0, y: 0, vx: 0, vy: 0,
        radius: 0, initialRadius: 0,
        alpha: 0, color: '#ffffff',
        life: 0, maxLife: PARTICLE_LIFE_FRAMES,
        active: false
      });
    }
  }

  emit(position: { x: number; y: number }, color: string): void {
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const p = this.findInactive();
      if (!p) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      p.x = position.x;
      p.y = position.y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.initialRadius = 3;
      p.radius = p.initialRadius;
      p.alpha = 0.8;
      p.color = color;
      p.maxLife = PARTICLE_LIFE_FRAMES;
      p.life = p.maxLife;
      p.active = true;
    }
  }

  private findInactive(): TrailParticle | null {
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) return this.pool[i];
    }
    let oldestIdx = 0;
    let oldestLife = Infinity;
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].life < oldestLife) {
        oldestLife = this.pool[i].life;
        oldestIdx = i;
      }
    }
    return this.pool[oldestIdx];
  }

  update(): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += GRAVITY;
      p.life--;
      const lifeRatio = p.life / p.maxLife;
      p.alpha = 0.8 * lifeRatio;
      p.radius = p.initialRadius * lifeRatio;
      if (p.radius < 0.5) p.radius = 0.5;
      if (p.life <= 0) p.active = false;
    }
  }

  applyPush(centerX: number, centerY: number, maxRadius: number, strength: number, vortex: boolean): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      const dx = p.x - centerX;
      const dy = p.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < maxRadius && dist > 0) {
        const falloff = 1 - dist / maxRadius;
        const pushStrength = strength * falloff;
        const nx = dx / dist;
        const ny = dy / dist;
        p.vx += nx * pushStrength;
        p.vy += ny * pushStrength;
        if (vortex) {
          p.vx += -ny * pushStrength * 0.8;
          p.vy += nx * pushStrength * 0.8;
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const p of this.pool) {
      if (!p.active) continue;
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  getActiveCount(): number {
    let count = 0;
    for (const p of this.pool) if (p.active) count++;
    return count;
  }
}
