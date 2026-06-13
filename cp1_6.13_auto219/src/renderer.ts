export interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  baseAlpha: number;
  phase: number;
  period: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  active: boolean;
}

export interface TrailParticle {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  active: boolean;
}

export class ParticlePool<T extends { active: boolean }> {
  private pool: T[] = [];
  private maxSize: number;
  private factory: () => T;

  constructor(factory: () => T, maxSize: number) {
    this.factory = factory;
    this.maxSize = maxSize;
    for (let i = 0; i < maxSize; i++) {
      this.pool.push(factory());
    }
  }

  acquire(): T | null {
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) {
        return this.pool[i];
      }
    }
    if (this.pool.length < this.maxSize) {
      const p = this.factory();
      this.pool.push(p);
      return p;
    }
    return this.pool[0];
  }

  getActive(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) {
        result.push(this.pool[i]);
      }
    }
    return result;
  }

  getAll(): T[] {
    return this.pool;
  }
}

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number = 0;
  height: number = 0;
  dpr: number;
  stars: Star[] = [];
  particles: ParticlePool<Particle>;
  trailPool: ParticlePool<TrailParticle>;
  private gradientCache: CanvasGradient | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.particles = new ParticlePool<Particle>(() => ({
      x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 0, color: '#fff', active: false
    }), 200);
    this.trailPool = new ParticlePool<TrailParticle>(() => ({
      x: 0, y: 0, life: 0, maxLife: 1, size: 0, color: '#fff', active: false
    }), 500);
    this.initStars();
    this.resize();
  }

  initStars(): void {
    this.stars = [];
    for (let i = 0; i < 30; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        size: 1 + Math.random() * 2,
        baseAlpha: 0.2 + Math.random() * 0.4,
        alpha: 0.2 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        period: 3000 + Math.random() * 2000
      });
    }
  }

  resize(): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const targetW = Math.max(vw * 0.9, 700);
    const targetH = Math.max(vh * 0.8, 500);
    const w = Math.min(targetW, vw - 20);
    const h = Math.min(targetH, vh - 20);
    this.width = w;
    this.height = h;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.gradientCache = null;
  }

  getGradient(): CanvasGradient {
    if (!this.gradientCache) {
      this.gradientCache = this.ctx.createLinearGradient(0, 0, 0, this.height);
      this.gradientCache.addColorStop(0, '#f9a8d4');
      this.gradientCache.addColorStop(1, '#1e3a5f');
    }
    return this.gradientCache;
  }

  drawBackground(time: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = this.getGradient();
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    for (const star of this.stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(time / star.period * Math.PI * 2 + star.phase);
      const alpha = star.baseAlpha * (0.5 + 0.5 * twinkle);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(star.x * this.width, star.y * this.height, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  spawnParticle(x: number, y: number, color: string, angle?: number, speed?: number, life?: number): void {
    const p = this.particles.acquire();
    if (!p) return;
    p.x = x;
    p.y = y;
    const a = angle ?? Math.random() * Math.PI * 2;
    const s = speed ?? (1 + Math.random() * 2);
    p.vx = Math.cos(a) * s;
    p.vy = Math.sin(a) * s;
    p.size = 2 + Math.random() * 3;
    p.color = color;
    p.maxLife = life ?? 800 + Math.random() * 400;
    p.life = p.maxLife;
    p.active = true;
  }

  spawnTrailParticle(x: number, y: number, color: string): void {
    const p = this.trailPool.acquire();
    if (!p) return;
    p.x = x;
    p.y = y;
    p.maxLife = 2000;
    p.life = p.maxLife;
    p.size = 3;
    p.color = color;
    p.active = true;
  }

  updateParticles(dt: number): void {
    const allParticles = this.particles.getAll();
    for (let i = 0; i < allParticles.length; i++) {
      const p = allParticles[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt / 16;
      p.y += p.vy * dt / 16;
      p.vx *= 0.98;
      p.vy *= 0.98;
    }

    const trails = this.trailPool.getAll();
    for (let i = 0; i < trails.length; i++) {
      const t = trails[i];
      if (!t.active) continue;
      t.life -= dt;
      if (t.life <= 0) {
        t.active = false;
      }
    }
  }

  drawParticles(): void {
    const ctx = this.ctx;
    const activeParticles = this.particles.getActive();
    if (activeParticles.length === 0 && this.trailPool.getActive().length === 0) return;

    if (activeParticles.length > 50) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of activeParticles) {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else {
      for (const p of activeParticles) {
        const alpha = p.life / p.maxLife;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * 0.9;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    const trails = this.trailPool.getActive();
    if (trails.length > 100) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const t of trails) {
        const alpha = t.life / t.maxLife;
        const size = 1 + 2 * alpha;
        ctx.globalAlpha = alpha * 0.6;
        ctx.fillStyle = t.color;
        ctx.beginPath();
        ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else {
      for (const t of trails) {
        const alpha = t.life / t.maxLife;
        const size = 1 + 2 * alpha;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * 0.8;
        ctx.shadowColor = t.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = t.color;
        ctx.beginPath();
        ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  drawHalo(x: number, y: number, color: string, alpha: number, pulse: number = 0): void {
    const ctx = this.ctx;
    const baseRadius = 30;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, baseRadius + pulse);
    gradient.addColorStop(0, this.hexToRgba(color, alpha * 0.6));
    gradient.addColorStop(0.5, this.hexToRgba(color, alpha * 0.3));
    gradient.addColorStop(1, this.hexToRgba(color, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, baseRadius + pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  lightenColor(hex: string, percent: number = 0.3): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const nr = Math.min(255, Math.round(r + (255 - r) * percent));
    const ng = Math.min(255, Math.round(g + (255 - g) * percent));
    const nb = Math.min(255, Math.round(b + (255 - b) * percent));
    return `rgb(${nr},${ng},${nb})`;
  }
}
