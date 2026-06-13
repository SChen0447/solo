export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  type: 'star' | 'spike_trail' | 'climb_spark' | 'energy_rain' | 'halo';
}

const MAX_PARTICLES = 500;

const RAIN_COLORS = ['#ff9ff3', '#feca57', '#48dbfb'];

export class EffectsManager {
  particles: Particle[] = [];
  private stars: { x: number; y: number; size: number; phase: number; cycle: number }[] = [];
  private offscreen: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;

  constructor(width: number, height: number) {
    this.offscreen = document.createElement('canvas');
    this.offscreen.width = width;
    this.offscreen.height = height;
    this.offCtx = this.offscreen.getContext('2d')!;
    this.initStars(width, height);
  }

  resize(width: number, height: number) {
    this.offscreen.width = width;
    this.offscreen.height = height;
    this.initStars(width, height);
  }

  private initStars(w: number, h: number) {
    this.stars = [];
    for (let i = 0; i < 150; i++) {
      this.stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: 1 + Math.random(),
        phase: Math.random() * Math.PI * 2,
        cycle: 3 + Math.random() * 3,
      });
    }
  }

  addStar(w: number, h: number) {
    this.stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      size: 1 + Math.random(),
      phase: Math.random() * Math.PI * 2,
      cycle: 3 + Math.random() * 3,
    });
  }

  addSpikeTrail(x: number, y: number) {
    if (this.particles.length >= MAX_PARTICLES) return;
    this.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 20,
      vy: -Math.random() * 30,
      life: 0.4,
      maxLife: 0.4,
      size: 2 + Math.random() * 2,
      color: '#ff6b6b',
      alpha: 0.8,
      type: 'spike_trail',
    });
  }

  addClimbSpark(x: number, y: number) {
    if (this.particles.length >= MAX_PARTICLES) return;
    for (let i = 0; i < 2; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 60,
        vy: (Math.random() - 0.5) * 60,
        life: 0.3,
        maxLife: 0.3,
        size: 1.5 + Math.random() * 1.5,
        color: '#feca57',
        alpha: 0.9,
        type: 'climb_spark',
      });
    }
  }

  addEnergyRain(x: number, y: number) {
    for (let i = 0; i < 20; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 30,
        vy: 40 + Math.random() * 60,
        life: 1.0,
        maxLife: 1.0,
        size: 2 + Math.random() * 2,
        color: RAIN_COLORS[Math.floor(Math.random() * RAIN_COLORS.length)],
        alpha: 1,
        type: 'energy_rain',
      });
    }
  }

  addHalo(x: number, y: number) {
    if (this.particles.length >= MAX_PARTICLES) return;
    this.particles.push({
      x, y,
      vx: 0, vy: 0,
      life: 0.8,
      maxLife: 0.8,
      size: 10,
      color: '#feca57',
      alpha: 0.8,
      type: 'halo',
    });
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = p.life / p.maxLife;
      if (p.type === 'halo') {
        p.size = 10 + (1 - p.life / p.maxLife) * 80;
      }
    }
  }

  renderBackground(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
    grad.addColorStop(0, '#0b0e27');
    grad.addColorStop(1, '#000000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    for (const s of this.stars) {
      const flicker = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time / s.cycle * Math.PI * 2 + s.phase));
      ctx.globalAlpha = flicker;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  renderParticles(ctx: CanvasRenderingContext2D) {
    const octx = this.offCtx;
    octx.clearRect(0, 0, this.offscreen.width, this.offscreen.height);

    for (const p of this.particles) {
      if (p.type === 'halo') {
        octx.save();
        octx.globalAlpha = p.alpha * 0.5;
        octx.strokeStyle = p.color;
        octx.lineWidth = 3;
        octx.beginPath();
        octx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        octx.stroke();
        octx.restore();
        continue;
      }

      octx.save();
      octx.globalAlpha = p.alpha;
      octx.fillStyle = p.color;
      if (p.type === 'spike_trail' || p.type === 'climb_spark') {
        octx.shadowBlur = 6;
        octx.shadowColor = p.color;
      }
      octx.beginPath();
      octx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
      octx.fill();
      octx.restore();
    }

    ctx.drawImage(this.offscreen, 0, 0);
  }

  getParticleCount(): number {
    return this.particles.length;
  }
}
