export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  r: number;
  g: number;
  b: number;
  opacity: number;
  life: number;
  maxLife: number;
  type: 'burst' | 'trail' | 'dust';
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxActive = 150;
  private maxTrailTotal = 200;
  private trailEmitted = 0;
  private mobile = false;

  setMobile(m: boolean) {
    this.mobile = m;
  }

  createBurst(x: number, y: number) {
    const count = this.mobile ? 40 : 80;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxActive) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 90;
      const t = Math.random();
      const r = Math.round(255 * (0.8 + t * 0.2));
      const g = Math.round(200 + t * 55);
      const b = Math.round(t * 255);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        r, g, b,
        opacity: 0.8 + Math.random() * 0.2,
        life: 0.6 + Math.random() * 0.2,
        maxLife: 0.8,
        type: 'burst'
      });
    }
  }

  createTrail(x: number, y: number, color: [number, number, number]) {
    if (this.trailEmitted >= this.maxTrailTotal) return;
    if (this.particles.length >= this.maxActive) return;
    const [r, g, b] = color;
    this.particles.push({
      x: x + (Math.random() - 0.5) * 3,
      y: y + (Math.random() - 0.5) * 3,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      size: 2 + Math.random() * 2,
      r, g, b,
      opacity: 0.8,
      life: 1.0,
      maxLife: 1.0,
      type: 'trail'
    });
    this.trailEmitted++;
  }

  createDust(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxActive) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 10 + Math.random() * 30;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1.5 + Math.random() * 3,
        r: 255, g: 215, b: 100,
        opacity: 0.4 + Math.random() * 0.3,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        type: 'dust'
      });
    }
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        if (p.type === 'trail') this.trailEmitted = Math.max(0, this.trailEmitted - 1);
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const ratio = p.life / p.maxLife;
      if (p.type === 'burst') {
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.opacity = ratio * 0.9;
        p.size *= 0.995;
      } else if (p.type === 'trail') {
        p.opacity = ratio * 0.8;
        p.vx *= 0.98;
        p.vy *= 0.98;
      } else {
        p.opacity = ratio * 0.5;
        p.vx *= 0.94;
        p.vy *= 0.94;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const alpha = Math.max(0, Math.min(1, p.opacity));
      if (alpha < 0.01) continue;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha * 0.25;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  renderClipped(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      if (p.type === 'dust') continue;
      const alpha = Math.max(0, Math.min(1, p.opacity));
      if (alpha < 0.01) continue;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha * 0.25;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  get count() { return this.particles.length; }
}
