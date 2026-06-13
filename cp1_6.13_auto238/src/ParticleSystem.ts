export interface ParticleRenderData {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  age: number;
  lifespan: number;
}

const PARTICLE_COLORS = ['#ff6b6b', '#48dbfb', '#feca57', '#ff9ff3'];
const LIFESPAN = 1500;

export class ParticleSystem {
  private pool: Particle[];
  private maxParticles: number;
  private renderResult: ParticleRenderData[];

  constructor(maxParticles: number = 200) {
    this.maxParticles = maxParticles;
    this.pool = [];
    this.renderResult = [];

    for (let i = 0; i < maxParticles; i++) {
      this.pool.push({
        active: false,
        x: 0, y: 0, vx: 0, vy: 0,
        radius: 0, color: '#ffffff', age: 0, lifespan: LIFESPAN
      });
      this.renderResult.push({
        x: 0, y: 0, radius: 0, color: '#ffffff', alpha: 0
      });
    }
  }

  public emit(x: number, y: number, count: number): void {
    let emitted = 0;
    const toEmit = Math.min(count, this.maxParticles);

    for (let i = 0; i < this.pool.length && emitted < toEmit; i++) {
      const p = this.pool[i];
      if (!p.active) {
        this.initParticle(p, x, y);
        emitted++;
      }
    }

    if (emitted < toEmit) {
      let oldestIdx = -1;
      let oldestAge = -1;
      for (let i = 0; i < this.pool.length && emitted < toEmit; i++) {
        const p = this.pool[i];
        if (p.active && p.age > oldestAge) {
          oldestAge = p.age;
          oldestIdx = i;
        }
      }
      if (oldestIdx >= 0) {
        this.initParticle(this.pool[oldestIdx], x, y);
        emitted++;
      }
    }
  }

  private initParticle(p: Particle, x: number, y: number): void {
    const angle = Math.random() * Math.PI * 2;
    const travelDist = 60 + Math.random() * 40;
    const speed = travelDist / (LIFESPAN / 1000);
    p.x = x;
    p.y = y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed - 20;
    p.radius = 5 + Math.random() * 5;
    p.color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
    p.age = 0;
    p.lifespan = LIFESPAN;
    p.active = true;
  }

  public update(deltaTime: number): ParticleRenderData[] {
    const dt = deltaTime / 1000;
    let writeIdx = 0;

    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.age += deltaTime;
      if (p.age >= p.lifespan) {
        p.active = false;
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 30 * dt;

      const t = p.age / p.lifespan;
      const alpha = 1 - t;

      const r = this.renderResult[writeIdx];
      r.x = p.x;
      r.y = p.y;
      r.radius = p.radius * (0.7 + 0.3 * (1 - t));
      r.color = p.color;
      r.alpha = alpha;
      writeIdx++;
    }

    for (let i = writeIdx; i < this.renderResult.length; i++) {
      this.renderResult[i].alpha = 0;
    }

    return this.renderResult;
  }

  public getActiveCount(): number {
    let c = 0;
    for (const p of this.pool) if (p.active) c++;
    return c;
  }
}
