import type { Particle, Point } from './types';

const COLOR_PALETTE = [
  '#ff6b6b',
  '#ffa07a',
  '#ffd700',
  '#98fb98',
  '#87ceeb',
  '#dda0dd',
  '#f0e68c',
  '#deb887',
  '#e6e6fa',
  '#ffb6c1',
  '#90ee90',
  '#add8e6',
];

const OPACITY_CACHE_SIZE = 100;

export class ParticleSystem {
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private particleIdCounter: number = 0;
  private opacityCache: number[] = [];
  private maxParticles: number = 50;

  constructor(ctx: CanvasRenderingContext2D) {
    this.buildOpacityCache();
  }

  private buildOpacityCache(): void {
    this.opacityCache = new Array(OPACITY_CACHE_SIZE);
    for (let i = 0; i < OPACITY_CACHE_SIZE; i++) {
      const t = i / (OPACITY_CACHE_SIZE - 1);
      this.opacityCache[i] = 1 - t * t;
    }
  }

  private getCachedOpacity(life: number, maxLife: number): number {
    if (this.particles.length <= 30) {
      const t = life / maxLife;
      return 1 - t * t;
    }
    const index = Math.min(
      OPACITY_CACHE_SIZE - 1,
      Math.floor((life / maxLife) * (OPACITY_CACHE_SIZE - 1))
    );
    return this.opacityCache[index];
  }

  burst(origin: Point, scale: number): void {
    const count = 10 + Math.floor(Math.random() * 11);

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
      const speed = (2 + Math.random() * 4) * scale;

      this.particles.push({
        id: this.particleIdCounter++,
        x: origin.x,
        y: origin.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: (4 + Math.random() * 8) * scale,
        color: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        scale: 1,
        scaleSpeed: (Math.random() - 0.5) * 0.03,
        opacity: 1,
        life: 0,
        maxLife: 800,
        curveOffset: 0,
        curveSpeed: (Math.random() - 0.5) * 0.02,
      });
    }
  }

  update(deltaTime: number): void {
    this.particles = this.particles.filter((p) => {
      p.life += deltaTime;
      if (p.life >= p.maxLife) return false;

      p.x += p.vx;
      p.y += p.vy;

      p.vy += 0.05;

      p.curveOffset += p.curveSpeed;
      p.x += Math.sin(p.curveOffset) * 0.5;

      p.rotation += p.rotationSpeed;

      p.scale = Math.max(0.2, Math.min(1.2, p.scale + p.scaleSpeed));

      p.opacity = this.getCachedOpacity(p.life, p.maxLife);

      return true;
    });
  }

  render(): void {
    const ctx = this.ctx;

    this.particles.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.scale(p.scale, p.scale);

      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;

      ctx.fillStyle = p.color;
      const s = p.size;
      const shapeType = Math.floor(p.id) % 3;

      if (shapeType === 0) {
        ctx.beginPath();
        ctx.moveTo(0, -s / 2);
        ctx.lineTo(s / 2, 0);
        ctx.lineTo(0, s / 2);
        ctx.lineTo(-s / 2, 0);
        ctx.closePath();
        ctx.fill();
      } else if (shapeType === 1) {
        ctx.fillRect(-s / 2, -s / 2, s, s);
      } else {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          const r = i % 2 === 0 ? s / 2 : s / 4;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    });
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  getActiveParticles(): Particle[] {
    return this.particles.slice();
  }
}
