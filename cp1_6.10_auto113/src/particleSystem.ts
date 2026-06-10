import type { Particle, HandLandmark, TrailPoint, ExplosionEvent } from './types';
import { ParticleMode } from './types';

const MAX_PARTICLES = 5000;
const PARTICLES_PER_LANDMARK = 20;
const TRAIL_LENGTH = 30;
const HUE_START = 345;
const HUE_END = 195;

export class ParticleSystem {
  private particles: Particle[] = [];
  private particlePool: Particle[] = [];
  private activeCount: number = 0;
  private mode: ParticleMode = ParticleMode.FLOW;
  private explosions: ExplosionEvent[] = [];
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;
  private prevLandmarkPositions: Map<number, { x: number; y: number }> = new Map();

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.initPool();
  }

  private initPool(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particlePool.push(this.createEmptyParticle());
    }
  }

  private createEmptyParticle(): Particle {
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 0,
      hue: 0,
      saturation: 100,
      lightness: 70,
      life: 0,
      maxLife: 0,
      active: false,
      trail: [],
      trailLength: TRAIL_LENGTH,
      brownianAngle: 0,
      brownianOffset: 0,
      mode: ParticleMode.FLOW,
      spiralAngle: 0,
      spiralRadius: 0,
      explodeBoost: 1,
      explodeTimer: 0,
      originalHue: 0,
    };
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  setMode(mode: ParticleMode): void {
    this.mode = mode;
  }

  getMode(): ParticleMode {
    return this.mode;
  }

  getActiveCount(): number {
    return this.activeCount;
  }

  emitFromLandmarks(landmarks: HandLandmark[]): void {
    if (!landmarks || landmarks.length === 0) return;

    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      const screenX = lm.x * this.canvasWidth;
      const screenY = lm.y * this.canvasHeight;

      const prev = this.prevLandmarkPositions.get(i);
      let dirX = 0;
      let dirY = 0;
      if (prev) {
        dirX = screenX - prev.x;
        dirY = screenY - prev.y;
        const len = Math.sqrt(dirX * dirX + dirY * dirY);
        if (len > 0) {
          dirX /= len;
          dirY /= len;
        }
      }
      this.prevLandmarkPositions.set(i, { x: screenX, y: screenY });

      const particlesToEmit = Math.min(PARTICLES_PER_LANDMARK, MAX_PARTICLES - this.activeCount);
      for (let j = 0; j < particlesToEmit; j++) {
        this.emitParticle(screenX, screenY, dirX, dirY, lm.y);
      }
    }
  }

  private emitParticle(
    baseX: number,
    baseY: number,
    dirX: number,
    dirY: number,
    normalizedY: number
  ): void {
    if (this.particlePool.length === 0) return;

    const p = this.particlePool.pop()!;
    if (!p) return;

    const offsetAngle = Math.random() * Math.PI * 2;
    const offsetRadius = 5 + Math.random() * 10;
    const offsetX = Math.cos(offsetAngle) * offsetRadius;
    const offsetY = Math.sin(offsetAngle) * offsetRadius;

    const t = Math.max(0, Math.min(1, normalizedY));
    const hue = HUE_START + t * (HUE_END - HUE_START + 360) % 360;

    const speed = 2 + Math.random() * 3;

    p.x = baseX + offsetX;
    p.y = baseY + offsetY;
    p.vx = dirX * speed + (Math.random() - 0.5) * 2;
    p.vy = dirY * speed + (Math.random() - 0.5) * 2;
    p.size = 2 + Math.random() * 4;
    p.hue = hue;
    p.originalHue = hue;
    p.saturation = 100;
    p.lightness = 70 + Math.random() * 10;
    p.life = 0;
    p.maxLife = 60 + Math.random() * 60;
    p.active = true;
    p.trail = [];
    p.trailLength = TRAIL_LENGTH;
    p.brownianAngle = Math.random() * Math.PI * 2;
    p.brownianOffset = 1 + Math.random();
    p.mode = this.mode;
    p.spiralAngle = Math.random() * Math.PI * 2;
    p.spiralRadius = 20 + Math.random() * 40;
    p.explodeBoost = 1;
    p.explodeTimer = 0;

    this.particles.push(p);
    this.activeCount++;
  }

  addExplosion(x: number, y: number): void {
    this.explosions.push({
      x,
      y,
      radius: 100,
      timestamp: performance.now(),
      duration: 1000,
    });

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      const dx = p.x - x;
      const dy = p.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 100) {
        const angle = Math.atan2(dy, dx);
        const boostSpeed = Math.max(3, (100 - dist) / 20);
        p.vx = Math.cos(angle) * boostSpeed * 3;
        p.vy = Math.sin(angle) * boostSpeed * 3;
        p.explodeBoost = 3;
        p.explodeTimer = 60;
        p.hue = Math.random() * 360;
        p.saturation = 100;
        p.lightness = 70 + Math.random() * 20;
      }
    }
  }

  update(): void {
    const now = performance.now();

    this.explosions = this.explosions.filter((e) => now - e.timestamp < e.duration);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.trail.unshift({ x: p.x, y: p.y, alpha: 0.8 });
      if (p.trail.length > p.trailLength) {
        p.trail.pop();
      }
      for (let j = 0; j < p.trail.length; j++) {
        p.trail[j].alpha = 0.8 * (1 - j / p.trailLength);
      }

      if (p.explodeTimer > 0) {
        p.explodeTimer--;
        if (p.explodeTimer === 0) {
          p.explodeBoost = 1;
          p.hue = p.originalHue;
          p.saturation = 100;
          p.lightness = 70;
        }
      }

      p.brownianAngle += (Math.random() - 0.5) * 0.5;
      const brownianX = Math.cos(p.brownianAngle) * p.brownianOffset;
      const brownianY = Math.sin(p.brownianAngle) * p.brownianOffset;

      switch (p.mode) {
        case ParticleMode.FLOW:
          p.x += p.vx * p.explodeBoost + brownianX;
          p.y += p.vy * p.explodeBoost + brownianY;
          p.vx *= 0.98;
          p.vy *= 0.98;
          break;

        case ParticleMode.EXPLODE:
          p.vx += (Math.random() - 0.5) * 0.5 * p.explodeBoost;
          p.vy += (Math.random() - 0.5) * 0.5 * p.explodeBoost;
          p.x += p.vx + brownianX;
          p.y += p.vy + brownianY;
          p.vx *= 0.96;
          p.vy *= 0.96;
          break;

        case ParticleMode.SPIRAL:
          p.spiralAngle += 0.05;
          const spiralX = Math.cos(p.spiralAngle) * 1.5;
          const spiralY = Math.sin(p.spiralAngle) * 1.5;
          p.x += p.vx * 0.5 + spiralX + brownianX;
          p.y += p.vy * 0.5 + spiralY + brownianY;
          p.vx *= 0.99;
          p.vy *= 0.99;
          break;
      }

      p.life++;

      if (
        p.life >= p.maxLife ||
        p.x < -50 ||
        p.x > this.canvasWidth + 50 ||
        p.y < -50 ||
        p.y > this.canvasHeight + 50
      ) {
        this.recycleParticle(i);
      }
    }
  }

  private recycleParticle(index: number): void {
    const p = this.particles[index];
    p.active = false;
    p.trail = [];
    this.particlePool.push(p);
    this.particles.splice(index, 1);
    this.activeCount--;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      if (p.trail.length > 1) {
        for (let j = 0; j < p.trail.length - 1; j++) {
          const t1 = p.trail[j];
          const t2 = p.trail[j + 1];
          const lifeRatio = 1 - p.life / p.maxLife;
          ctx.beginPath();
          ctx.moveTo(t1.x, t1.y);
          ctx.lineTo(t2.x, t2.y);
          ctx.strokeStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${t1.alpha * lifeRatio * 0.5})`;
          ctx.lineWidth = p.size * 0.6;
          ctx.stroke();
        }
      }

      const lifeRatio = 1 - p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * lifeRatio, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${0.8 * lifeRatio})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * lifeRatio * 2, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${0.15 * lifeRatio})`;
      ctx.fill();
    }

    ctx.restore();
  }
}
