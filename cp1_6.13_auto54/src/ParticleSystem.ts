import { Renderer } from './Renderer';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  r: number;
  g: number;
  b: number;
  active: boolean;
}

interface ShockWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
  active: boolean;
}

interface CollectDot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  active: boolean;
}

const MAX_PARTICLES = 800;
const MERGE_THRESHOLD = 500;

export class ParticleSystem {
  private particles: Particle[] = [];
  private shockWaves: ShockWave[] = [];
  private collectDots: CollectDot[] = [];

  constructor() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 1,
        size: 2, color: '#fff',
        r: 255, g: 255, b: 255,
        active: false,
      });
    }
  }

  emitExplosion(x: number, y: number, cr: number, cg: number, cb: number, count: number) {
    const c = Math.min(count, 50);
    let spawned = 0;
    for (let i = 0; i < this.particles.length && spawned < c; i++) {
      if (!this.particles[i].active) {
        const p = this.particles[i];
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * 160;
        p.x = x;
        p.y = y;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.life = 0.8;
        p.maxLife = 0.8;
        p.size = 2 + Math.random() * 3;
        p.r = cr + Math.floor((Math.random() - 0.5) * 40);
        p.g = cg + Math.floor((Math.random() - 0.5) * 40);
        p.b = cb + Math.floor((Math.random() - 0.5) * 40);
        p.r = Math.max(0, Math.min(255, p.r));
        p.g = Math.max(0, Math.min(255, p.g));
        p.b = Math.max(0, Math.min(255, p.b));
        p.color = `rgb(${p.r},${p.g},${p.b})`;
        p.active = true;
        spawned++;
      }
    }
  }

  emitShockWave(x: number, y: number, color: string) {
    this.shockWaves.push({
      x, y, radius: 5, maxRadius: 60 + Math.random() * 30,
      life: 0.6, maxLife: 0.6, color, active: true,
    });
  }

  emitCollectDots(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 200;
      this.collectDots.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.5, maxLife: 1.5,
        active: true,
      });
    }
  }

  emitTrail(x: number, y: number, vx: number, vy: number) {
    for (let i = 0; i < this.particles.length; i++) {
      if (!this.particles[i].active) {
        const p = this.particles[i];
        p.x = x + (Math.random() - 0.5) * 4;
        p.y = y + (Math.random() - 0.5) * 4;
        p.vx = -vx * 0.1 + (Math.random() - 0.5) * 20;
        p.vy = -vy * 0.1 + (Math.random() - 0.5) * 20;
        p.life = 0.4;
        p.maxLife = 0.4;
        p.size = 1.5 + Math.random() * 1.5;
        p.r = 180;
        p.g = 200;
        p.b = 255;
        p.color = `rgb(${p.r},${p.g},${p.b})`;
        p.active = true;
        break;
      }
    }
  }

  update(dt: number) {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
      }
    }

    for (let i = this.shockWaves.length - 1; i >= 0; i--) {
      const sw = this.shockWaves[i];
      sw.life -= dt;
      const progress = 1 - sw.life / sw.maxLife;
      sw.radius = sw.maxRadius * progress;
      if (sw.life <= 0) {
        this.shockWaves.splice(i, 1);
      }
    }

    for (let i = this.collectDots.length - 1; i >= 0; i--) {
      const d = this.collectDots[i];
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.life -= dt;
      if (d.life <= 0) {
        this.collectDots.splice(i, 1);
      }
    }

    this.mergeParticles();
  }

  private mergeParticles() {
    const active = this.particles.filter(p => p.active);
    if (active.length <= MERGE_THRESHOLD) return;

    const small = active.filter(p => p.size < 2.5);
    const mergeCount = Math.floor(small.length / 2);

    for (let i = 0; i < mergeCount && i * 2 + 1 < small.length; i++) {
      const a = small[i * 2];
      const b = small[i * 2 + 1];
      a.x = (a.x + b.x) / 2;
      a.y = (a.y + b.y) / 2;
      a.vx = (a.vx + b.vx) / 2;
      a.vy = (a.vy + b.vy) / 2;
      a.size = Math.min(a.size + b.size * 0.5, 6);
      a.life = Math.max(a.life, b.life);
      b.active = false;
    }
  }

  getActiveCount() {
    let c = 0;
    for (let i = 0; i < this.particles.length; i++) {
      if (this.particles[i].active) c++;
    }
    return c + this.shockWaves.length + this.collectDots.length;
  }

  draw(renderer: Renderer) {
    const ctx = renderer.ctx;

    renderer.setAdditiveBlend();

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < this.shockWaves.length; i++) {
      const sw = this.shockWaves[i];
      const alpha = Math.max(0, sw.life / sw.maxLife) * 0.6;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (let i = 0; i < this.collectDots.length; i++) {
      const d = this.collectDots[i];
      const alpha = Math.max(0, d.life / d.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffee88';
      ctx.beginPath();
      ctx.arc(d.x, d.y, 3 * alpha, 0, Math.PI * 2);
      ctx.fill();
    }

    renderer.resetAlpha();
    renderer.setNormalBlend();
  }
}
