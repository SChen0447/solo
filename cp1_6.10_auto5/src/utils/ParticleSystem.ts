import { ParticleData, Vector2 } from '../types';
import { ObjectPool } from './ObjectPool';

export class ParticleSystem {
  private pool: ObjectPool<ParticleData>;
  private particles: ParticleData[] = [];

  constructor(maxParticles: number = 200) {
    this.pool = new ObjectPool<ParticleData>(this.createParticle, maxParticles);
  }

  private createParticle(): ParticleData {
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      size: 2,
      color: '#ffffff',
      alpha: 1,
      active: false
    };
  }

  emit(
    x: number,
    y: number,
    count: number,
    options: {
      speed?: number;
      spread?: number;
      life?: number;
      size?: number;
      color?: string;
      direction?: Vector2;
    } = {}
  ): void {
    const { speed = 2, spread = Math.PI * 2, life = 0.5, size = 2, color = '#ffffff', direction } = options;

    for (let i = 0; i < count; i++) {
      const p = this.pool.acquire();
      p.x = x;
      p.y = y;

      let angle: number;
      if (direction) {
        const baseAngle = Math.atan2(direction.y, direction.x);
        angle = baseAngle + (Math.random() - 0.5) * spread;
      } else {
        angle = Math.random() * spread;
      }

      const spd = speed * (0.5 + Math.random() * 0.5);
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd;
      p.maxLife = life * (0.7 + Math.random() * 0.6);
      p.life = p.maxLife;
      p.size = size * (0.6 + Math.random() * 0.8);
      p.color = color;
      p.alpha = 1;
    }
  }

  update(dt: number): void {
    const active = this.pool.getActive();
    for (const p of active) {
      p.life -= dt;
      if (p.life <= 0) {
        this.pool.release(p);
        continue;
      }
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.alpha = p.life / p.maxLife;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const active = this.pool.getActive();
    for (const p of active) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  clear(): void {
    this.pool.clear();
  }
}
