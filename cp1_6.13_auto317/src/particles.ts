import type { PathPoint } from './patterns';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  born: number;
}

const COLOR_PALETTE = ['#ff6b6b', '#feca57', '#48dbfb', '#a29bfe', '#00b894'];

const GRADIENT_STOPS = [
  { r: 255, g: 107, b: 107 },
  { r: 72, g: 219, b: 251 },
  { r: 162, g: 155, b: 254 },
];

function lerpColor(t: number): string {
  t = Math.max(0, Math.min(1, t));
  let idx = 0;
  if (t >= 0.5) {
    idx = 1;
    t = (t - 0.5) * 2;
  } else {
    t = t * 2;
  }
  const from = GRADIENT_STOPS[idx];
  const to = GRADIENT_STOPS[Math.min(idx + 1, GRADIENT_STOPS.length - 1)];
  const r = Math.round(from.r + (to.r - from.r) * t);
  const g = Math.round(from.g + (to.g - from.g) * t);
  const b = Math.round(from.b + (to.b - from.b) * t);
  return `rgb(${r},${g},${b})`;
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private colorPhase = 0;

  spawnFromPath(points: PathPoint[], density: number): void {
    if (points.length === 0) return;

    const spawnCount = Math.min(density, Math.max(1, Math.floor(density * (points.length / 20))));
    const step = Math.max(1, Math.floor(points.length / spawnCount));

    for (let i = 0; i < points.length; i += step) {
      const pt = points[i];
      this.emitParticle(pt.x, pt.y, pt.alpha);
    }
  }

  private emitParticle(x: number, y: number, pathAlpha: number): void {
    const angle = Math.random() * Math.PI * 2;
    const spread = randomRange(5, 25) * (Math.PI / 180);
    const emitAngle = angle + randomRange(-spread, spread);
    const speed = randomRange(0.5, 2);

    this.colorPhase = (this.colorPhase + 0.02) % 1;
    const color = lerpColor(this.colorPhase + randomRange(-0.1, 0.1));

    this.particles.push({
      x,
      y,
      vx: Math.cos(emitAngle) * speed,
      vy: Math.sin(emitAngle) * speed,
      size: randomRange(1, 4),
      color,
      alpha: pathAlpha,
      life: 1500,
      maxLife: 1500,
      born: performance.now(),
    });
  }

  spawnBurst(x: number, y: number): void {
    const count = 30;
    const burstRadius = 60;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + randomRange(-0.1, 0.1);
      const speed = randomRange(1, burstRadius / 30);
      const color = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: randomRange(1.5, 3.5),
        color,
        alpha: 1,
        life: 1200,
        maxLife: 1200,
        born: performance.now(),
      });
    }
  }

  update(now: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const age = now - p.born;

      if (age >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      const lifeRatio = age / p.maxLife;
      p.alpha = Math.max(0, 1 - lifeRatio) * (p.alpha > 0 ? 1 : 0);
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98;
      p.vy *= 0.98;
    }
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  get activeCount(): number {
    return this.particles.length;
  }

  clearAll(): void {
    this.particles = [];
  }

  fadeAll(now: number, duration: number): void {
    for (const p of this.particles) {
      p.maxLife = Math.min(p.maxLife, duration);
      p.born = now - (p.maxLife - duration);
    }
  }
}
