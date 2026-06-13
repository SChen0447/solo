import { ERAS } from './AssetManager';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
  maxLife: number;
  gravity: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private static readonly MAX_PARTICLES = 800;

  emit(x: number, y: number, eraId: number, count: number = 65): void {
    const era = ERAS[eraId];
    const toAdd = Math.min(count, ParticleSystem.MAX_PARTICLES - this.particles.length);
    for (let i = 0; i < toAdd; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      const maxLife = 1.5 + Math.random() * 1;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30 - Math.random() * 40,
        size: 3 + Math.random() * 5,
        color: era.particleColors[Math.floor(Math.random() * era.particleColors.length)],
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 6,
        life: 0,
        maxLife,
        gravity: 20 + Math.random() * 40,
      });
    }
  }

  emitVictory(x: number, y: number, width: number): void {
    const count = 120;
    const toAdd = Math.min(count, ParticleSystem.MAX_PARTICLES - this.particles.length);
    for (let i = 0; i < toAdd; i++) {
      const px = x + Math.random() * width;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
      const speed = 60 + Math.random() * 100;
      const maxLife = 2 + Math.random() * 1.5;
      const colors = ['#ffd700', '#ffec8b', '#f0c040', '#ffe066', '#daa520'];
      this.particles.push({
        x: px,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 8,
        life: 0,
        maxLife,
        gravity: 15 + Math.random() * 25,
      });
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      const progress = p.life / p.maxLife;
      p.alpha = 1 - progress * progress;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.rotationSpeed * dt;
      p.vx *= 0.99;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      const half = p.size / 2;
      ctx.fillRect(-half, -half, p.size, p.size);
      ctx.restore();
    }
  }

  get count(): number {
    return this.particles.length;
  }

  clear(): void {
    this.particles.length = 0;
  }
}
