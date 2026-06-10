import { RGB, Bucket } from './palette';
import { MixedPixel } from './mixer';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: RGB;
  alpha: number;
  size: number;
  life: number;
  maxLife: number;
  decay: number;
}

export interface FusionParticle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  color: RGB;
  alpha: number;
  size: number;
  speed: number;
}

export class AnimationEngine {
  private particles: Particle[] = [];
  private fusionParticles: FusionParticle[] = [];
  private glowTimers: Map<string, number> = new Map();
  private readonly maxParticles = 300;
  private readonly particleLife = 48;
  private readonly canvasWidth: number = 800;
  private readonly canvasHeight: number = 600;

  constructor() {}

  addMixParticles(pixels: MixedPixel[]): void {
    for (const p of pixels) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.5;
      this.particles.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: p.color,
        alpha: p.alpha,
        size: p.size,
        life: this.particleLife,
        maxLife: this.particleLife,
        decay: 0.985,
      });
    }
  }

  startFusion(fromBucket: Bucket, toBucket: Bucket, particleCount: number = 40): void {
    const midX = (fromBucket.x + toBucket.x) / 2;
    const midY = (fromBucket.y + toBucket.y) / 2;

    for (let i = 0; i < particleCount; i++) {
      const fromA = i < particleCount / 2;
      const src = fromA ? fromBucket : toBucket;
      const angle = Math.random() * Math.PI * 2;
      const offset = Math.random() * (src.diameter / 2);
      this.fusionParticles.push({
        x: src.x + Math.cos(angle) * offset,
        y: src.y + Math.sin(angle) * offset,
        targetX: midX,
        targetY: midY,
        color: src.color,
        alpha: 1,
        size: 3 + Math.random() * 3,
        speed: 2 + Math.random() * 2,
      });
    }
  }

  startGlow(bucketId: string): void {
    this.glowTimers.set(bucketId, 30);
  }

  update(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life--;
      p.alpha *= p.decay;
      if (p.life <= 0 || p.alpha < 0.02) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.fusionParticles.length - 1; i >= 0; i--) {
      const p = this.fusionParticles[i];
      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < p.speed) {
        this.fusionParticles.splice(i, 1);
      } else {
        p.x += (dx / dist) * p.speed;
        p.y += (dy / dist) * p.speed;
      }
    }

    for (const [id, frames] of this.glowTimers.entries()) {
      if (frames <= 0) {
        this.glowTimers.delete(id);
      } else {
        this.glowTimers.set(id, frames - 1);
      }
    }
  }

  renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = `rgb(${p.color.r},${p.color.g},${p.color.b})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  renderFusionParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.fusionParticles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = `rgb(${p.color.r},${p.color.g},${p.color.b})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  getGlowAlpha(bucketId: string): number {
    const frames = this.glowTimers.get(bucketId);
    if (frames === undefined) return 0;
    const progress = 1 - frames / 30;
    return progress < 0.5 ? progress * 2 * 0.6 : (1 - progress) * 2 * 0.6;
  }

  hasActiveFusion(): boolean {
    return this.fusionParticles.length > 0;
  }

  clear(): void {
    this.particles = [];
    this.fusionParticles = [];
    this.glowTimers.clear();
  }
}
