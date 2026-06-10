import { ParticleData } from './types';
import { ObjectPool } from './utils/ObjectPool';

export class StarField {
  private stars: ParticleData[] = [];
  private pool: ObjectPool<ParticleData>;
  private width: number;
  private height: number;

  constructor(width: number, height: number, count: number = 150) {
    this.width = width;
    this.height = height;
    this.pool = new ObjectPool<ParticleData>(this.createStar, count);
    this.initStars(count);
  }

  private createStar(): ParticleData {
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0,
      size: 1,
      color: '#ffffff',
      alpha: 1,
      active: false
    };
  }

  private initStars(count: number): void {
    for (let i = 0; i < count; i++) {
      const s = this.pool.acquire();
      s.x = Math.random() * this.width;
      s.y = Math.random() * this.height;
      s.size = Math.random() * 2 + 0.5;
      s.vx = (Math.random() - 0.5) * 0.2;
      s.vy = (Math.random() - 0.5) * 0.2;
      s.maxLife = 2 + Math.random() * 3;
      s.life = Math.random() * s.maxLife;
      s.alpha = 0.3 + Math.random() * 0.7;
      const brightness = 180 + Math.floor(Math.random() * 75);
      s.color = `rgb(${brightness}, ${brightness}, ${255})`;
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  update(dt: number): void {
    const active = this.pool.getActive();
    for (const s of active) {
      s.x += s.vx * dt * 60;
      s.y += s.vy * dt * 60;
      s.life += dt;

      if (s.life > s.maxLife) {
        s.life = 0;
        s.maxLife = 2 + Math.random() * 3;
      }

      const halfLife = s.maxLife / 2;
      if (s.life < halfLife) {
        s.alpha = (s.life / halfLife) * 0.8 + 0.2;
      } else {
        s.alpha = ((s.maxLife - s.life) / halfLife) * 0.8 + 0.2;
      }

      if (s.x < -10) s.x = this.width + 10;
      if (s.x > this.width + 10) s.x = -10;
      if (s.y < -10) s.y = this.height + 10;
      if (s.y > this.height + 10) s.y = -10;
    }
  }

  drawBackground(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0a0020');
    gradient.addColorStop(0.5, '#1a0540');
    gradient.addColorStop(1, '#0d0228');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    const nebula1 = ctx.createRadialGradient(
      this.width * 0.2,
      this.height * 0.3,
      0,
      this.width * 0.2,
      this.height * 0.3,
      this.width * 0.5
    );
    nebula1.addColorStop(0, 'rgba(108, 92, 231, 0.15)');
    nebula1.addColorStop(1, 'rgba(108, 92, 231, 0)');
    ctx.fillStyle = nebula1;
    ctx.fillRect(0, 0, this.width, this.height);

    const nebula2 = ctx.createRadialGradient(
      this.width * 0.8,
      this.height * 0.7,
      0,
      this.width * 0.8,
      this.height * 0.7,
      this.width * 0.4
    );
    nebula2.addColorStop(0, 'rgba(255, 107, 53, 0.08)');
    nebula2.addColorStop(1, 'rgba(255, 107, 53, 0)');
    ctx.fillStyle = nebula2;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  drawStars(ctx: CanvasRenderingContext2D): void {
    const active = this.pool.getActive();
    for (const s of active) {
      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
