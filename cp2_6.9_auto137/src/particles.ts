interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  trail: { x: number; y: number; alpha: number; time: number }[];
}

const PARTICLE_COLORS = [
  '#00ff88',
  '#00ccff',
  '#ff66ff',
  '#ff00aa',
  '#ffff00',
  '#ff8800'
];

export class Particles {
  private particles: Particle[] = [];
  private width: number;
  private height: number;
  private density: number;
  private trailCanvas: HTMLCanvasElement | null = null;
  private trailCtx: CanvasRenderingContext2D | null = null;
  private offscreenParticle: HTMLCanvasElement | null = null;
  private useOffscreen: boolean = false;

  constructor(count: number, width: number, height: number) {
    this.width = width;
    this.height = height;
    this.density = count;
    this.initParticles(count);
    this.setupOffscreen();
  }

  private setupOffscreen(): void {
    this.offscreenParticle = document.createElement('canvas');
    this.offscreenParticle.width = 20;
    this.offscreenParticle.height = 20;
    const octx = this.offscreenParticle.getContext('2d');
    if (octx) {
      const gradient = octx.createRadialGradient(10, 10, 0, 10, 10, 10);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.4, 'rgba(255,255,255,0.4)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      octx.fillStyle = gradient;
      octx.fillRect(0, 0, 20, 20);
    }
  }

  private initParticles(count: number): void {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(true));
    }
  }

  private createParticle(randomY: boolean = false): Particle {
    return {
      x: Math.random() * this.width,
      y: randomY ? Math.random() * this.height : -10,
      vx: (Math.random() - 0.5) * 0.5,
      vy: 1 + Math.random() * 2,
      radius: 2 + Math.random() * 3,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      alpha: 0.3 + Math.random() * 0.5,
      trail: []
    };
  }

  public setDensity(density: number): void {
    this.density = density;
    this.useOffscreen = density > 400;

    if (density > this.particles.length) {
      while (this.particles.length < density) {
        this.particles.push(this.createParticle(true));
      }
    } else if (density < this.particles.length) {
      this.particles.length = density;
    }
  }

  public update(mouseX: number, mouseY: number, _density: number, trail: boolean): void {
    const halfHeight = this.height / 2;
    const mouseActive = mouseY >= 0 && mouseY < halfHeight;

    for (const p of this.particles) {
      if (mouseActive) {
        const direction = Math.sign(mouseX - p.x);
        p.vx += direction * 0.03;
        p.vx *= 0.98;
      } else {
        p.vx *= 0.95;
      }

      p.vx += (Math.random() - 0.5) * 2;

      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -20) p.x = this.width + 20;
      if (p.x > this.width + 20) p.x = -20;

      if (p.y > this.height + 10) {
        p.x = Math.random() * this.width;
        p.y = -10;
        p.vy = 1 + Math.random() * 2;
        p.vx = (Math.random() - 0.5) * 0.5;
        p.trail = [];
      }

      if (trail) {
        const now = performance.now();
        p.trail.push({ x: p.x, y: p.y, alpha: p.alpha, time: now });
        const cutoff = now - 500;
        while (p.trail.length > 0 && p.trail[0].time < cutoff) {
          p.trail.shift();
        }
      } else {
        if (p.trail.length > 0) {
          p.trail = [];
        }
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D, width: number, height: number, _trailCanvas: HTMLCanvasElement | null): void {
    this.width = width;
    this.height = height;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const p of this.particles) {
      if (p.trail.length > 1) {
        const now = performance.now();
        for (let i = 0; i < p.trail.length - 1; i++) {
          const t = p.trail[i];
          const age = (now - t.time) / 500;
          if (age > 1) continue;
          const trailAlpha = t.alpha * (1 - age) * 0.5;
          ctx.globalAlpha = trailAlpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(t.x, t.y, p.radius * (1 - age), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;

      if (this.useOffscreen && this.offscreenParticle) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  public resize(width: number, height: number): void {
    const oldWidth = this.width;
    const oldHeight = this.height;
    const scaleX = width / oldWidth;
    const scaleY = height / oldHeight;

    this.width = width;
    this.height = height;

    for (const p of this.particles) {
      p.x *= scaleX;
      p.y *= scaleY;
      p.vy *= (scaleY + scaleX) / 2;
      p.radius *= (scaleX + scaleY) / 2;
      for (const t of p.trail) {
        t.x *= scaleX;
        t.y *= scaleY;
      }
    }
  }
}
