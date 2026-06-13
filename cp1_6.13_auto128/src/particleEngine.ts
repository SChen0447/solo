import { mixColors, MixResult } from './colorMixer';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  g: number;
  b: number;
  size: number;
  baseSize: number;
  lifespan: number;
  age: number;
  alpha: number;
  haloRadius: number;
  haloAlpha: number;
  haloMaxRadius: number;
  sizeBoost: number;
  sizeBoostTimer: number;
}

interface Halo {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

const PERFORMANCE_THRESHOLD = 500;
const GRID_SIZE = 30;
const BASE_FRICTION = 0.98;

export class ParticleEngine {
  private particles: Particle[] = [];
  private halos: Halo[] = [];
  private frameCount = 0;
  private reducedMode = false;

  get particleCount(): number {
    return this.particles.length;
  }

  get isReducedMode(): boolean {
    return this.reducedMode;
  }

  injectParticles(
    x: number, y: number,
    r: number, g: number, b: number,
    count: number,
    speedMultiplier: number = 1
  ): void {
    const alpha = this.reducedMode ? 0.5 : 1.0;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = (80 + Math.random() * 120) * speedMultiplier;
      const size = 6 + Math.random() * 6;
      const lifespan = 3 + Math.random() * 3;

      const colorVariation = 20;
      const pr = Math.min(255, Math.max(0, r + (Math.random() - 0.5) * colorVariation));
      const pg = Math.min(255, Math.max(0, g + (Math.random() - 0.5) * colorVariation));
      const pb = Math.min(255, Math.max(0, b + (Math.random() - 0.5) * colorVariation));

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: pr,
        g: pg,
        b: pb,
        size,
        baseSize: size,
        lifespan,
        age: 0,
        alpha,
        haloRadius: 0,
        haloAlpha: 0,
        haloMaxRadius: 30,
        sizeBoost: 0,
        sizeBoostTimer: 0,
      });
    }
  }

  injectStardustPulse(x: number, y: number, colors: Array<{ r: number; g: number; b: number }>): void {
    this.particles = [];
    this.halos = [];

    const totalParticles = 200;
    const alpha = this.reducedMode ? 0.5 : 1.0;

    for (let i = 0; i < totalParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 200;
      const colorIdx = i % colors.length;
      const c = colors[colorIdx];
      const size = 6 + Math.random() * 6;
      const lifespan = 2.5 + Math.random() * 1.5;

      const variation = 30;
      const pr = Math.min(255, Math.max(0, c.r + (Math.random() - 0.5) * variation));
      const pg = Math.min(255, Math.max(0, c.g + (Math.random() - 0.5) * variation));
      const pb = Math.min(255, Math.max(0, c.b + (Math.random() - 0.5) * variation));

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: pr,
        g: pg,
        b: pb,
        size,
        baseSize: size,
        lifespan,
        age: 0,
        alpha,
        haloRadius: 0,
        haloAlpha: 0,
        haloMaxRadius: 30,
        sizeBoost: 0,
        sizeBoostTimer: 0,
      });
    }
  }

  clearAll(): void {
    this.particles = [];
    this.halos = [];
  }

  update(dt: number): void {
    this.frameCount++;
    this.reducedMode = this.particles.length > PERFORMANCE_THRESHOLD;

    const newAlpha = this.reducedMode ? 0.5 : 1.0;

    for (const p of this.particles) {
      p.age += dt;
      if (p.sizeBoostTimer > 0) {
        p.sizeBoostTimer -= dt;
        if (p.sizeBoostTimer <= 0) {
          p.sizeBoost = 0;
        }
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      p.vx *= BASE_FRICTION;
      p.vy *= BASE_FRICTION;

      const lifeRatio = 1 - p.age / p.lifespan;
      p.alpha = newAlpha * Math.max(0, lifeRatio);
      p.size = p.baseSize * Math.max(0, lifeRatio) + p.sizeBoost;

      if (p.haloAlpha > 0) {
        p.haloRadius += 60 * dt;
        p.haloAlpha -= 0.8 * dt;
        if (p.haloAlpha < 0) p.haloAlpha = 0;
      }
    }

    const shouldCheckCollision = !this.reducedMode || this.frameCount % 2 === 0;

    if (shouldCheckCollision) {
      this.checkCollisions();
    }

    this.particles = this.particles.filter(p => p.age < p.lifespan && p.alpha > 0.01);

    for (const h of this.halos) {
      h.radius += 40 * dt;
      h.alpha -= 0.6 * dt;
    }
    this.halos = this.halos.filter(h => h.alpha > 0.01);
  }

  private checkCollisions(): void {
    if (this.particles.length < 2) return;

    const grid = new Map<string, number[]>();

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const gx = Math.floor(p.x / GRID_SIZE);
      const gy = Math.floor(p.y / GRID_SIZE);
      const key = `${gx},${gy}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key)!.push(i);
    }

    const checked = new Set<string>();

    for (const [key, indices] of grid) {
      const [gx, gy] = key.split(',').map(Number);

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const nKey = `${gx + dx},${gy + dy}`;
          const neighborIndices = grid.get(nKey);
          if (!neighborIndices) continue;

          for (const i of indices) {
            for (const j of neighborIndices) {
              if (i >= j) continue;
              const pairKey = `${i}_${j}`;
              if (checked.has(pairKey)) continue;
              checked.add(pairKey);

              this.tryCollide(i, j);
            }
          }
        }
      }
    }
  }

  private tryCollide(i: number, j: number): void {
    const a = this.particles[i];
    const b = this.particles[j];
    if (!a || !b) return;

    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const distSq = dx * dx + dy * dy;
    const minDist = (a.size + b.size) * 0.5;

    if (distSq < minDist * minDist && distSq > 0) {
      const dist = Math.sqrt(distSq);

      const weightA = a.baseSize;
      const weightB = b.baseSize;

      const result: MixResult = mixColors(
        a.r, a.g, a.b, weightA,
        b.r, b.g, b.b, weightB
      );

      const blendFactor = 0.3;
      a.r = a.r * (1 - blendFactor) + result.r * blendFactor;
      a.g = a.g * (1 - blendFactor) + result.g * blendFactor;
      a.b = a.b * (1 - blendFactor) + result.b * blendFactor;

      b.r = b.r * (1 - blendFactor) + result.r * blendFactor;
      b.g = b.g * (1 - blendFactor) + result.g * blendFactor;
      b.b = b.b * (1 - blendFactor) + result.b * blendFactor;

      a.sizeBoost = result.sizeDelta;
      a.sizeBoostTimer = 0.3;
      b.sizeBoost = result.sizeDelta;
      b.sizeBoostTimer = 0.3;

      a.haloAlpha = result.haloIntensity;
      a.haloRadius = a.size;
      b.haloAlpha = result.haloIntensity;
      b.haloRadius = b.size;

      this.halos.push({
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        r: result.r,
        g: result.g,
        b: result.b,
        radius: 5,
        maxRadius: 30,
        alpha: 0.2,
      });

      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;
      const pushFactor = 0.5;
      a.vx += nx * overlap * pushFactor;
      a.vy += ny * overlap * pushFactor;
      b.vx -= nx * overlap * pushFactor;
      b.vy -= ny * overlap * pushFactor;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const h of this.halos) {
      const gradient = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.radius);
      gradient.addColorStop(0, `rgba(${h.r},${h.g},${h.b},${h.alpha})`);
      gradient.addColorStop(1, `rgba(${h.r},${h.g},${h.b},0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const p of this.particles) {
      if (p.alpha <= 0) continue;

      if (p.haloAlpha > 0) {
        const hGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.haloRadius);
        hGrad.addColorStop(0, `rgba(${Math.round(p.r)},${Math.round(p.g)},${Math.round(p.b)},${p.haloAlpha * 0.5})`);
        hGrad.addColorStop(1, `rgba(${Math.round(p.r)},${Math.round(p.g)},${Math.round(p.b)},0)`);
        ctx.fillStyle = hGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.haloRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      const gradient = ctx.createRadialGradient(
        p.x - p.size * 0.2, p.y - p.size * 0.2, 0,
        p.x, p.y, p.size
      );
      gradient.addColorStop(0, `rgba(${Math.round(p.r)},${Math.round(p.g)},${Math.round(p.b)},${p.alpha})`);
      gradient.addColorStop(0.6, `rgba(${Math.round(p.r)},${Math.round(p.g)},${Math.round(p.b)},${p.alpha * 0.6})`);
      gradient.addColorStop(1, `rgba(${Math.round(p.r)},${Math.round(p.g)},${Math.round(p.b)},0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255,255,255,${p.alpha * 0.3})`;
      ctx.beginPath();
      ctx.arc(p.x - p.size * 0.2, p.y - p.size * 0.2, p.size * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  getMixedColors(): Array<{ r: number; g: number; b: number }> {
    const colorMap = new Map<string, { r: number; g: number; b: number; count: number }>();
    const step = 16;

    for (const p of this.particles) {
      const qr = Math.round(p.r / step) * step;
      const qg = Math.round(p.g / step) * step;
      const qb = Math.round(p.b / step) * step;
      const key = `${qr},${qg},${qb}`;

      if (colorMap.has(key)) {
        const entry = colorMap.get(key)!;
        entry.r += p.r;
        entry.g += p.g;
        entry.b += p.b;
        entry.count++;
      } else {
        colorMap.set(key, { r: p.r, g: p.g, b: p.b, count: 1 });
      }
    }

    const results: Array<{ r: number; g: number; b: number }> = [];
    for (const entry of colorMap.values()) {
      results.push({
        r: Math.round(entry.r / entry.count),
        g: Math.round(entry.g / entry.count),
        b: Math.round(entry.b / entry.count),
      });
    }

    return results.sort((a, b) => (b.r + b.g + b.b) - (a.r + a.g + a.b)).slice(0, 5);
  }
}
