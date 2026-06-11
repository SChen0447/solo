export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 500;

  constructor() {}

  spawnExplosion(
    x: number,
    y: number,
    color: string,
    blockLevel: number = 1,
    baseCount: number = 20
  ): void {
    const particleCount = Math.min(40, baseCount + blockLevel * 5);
    const availableSlots = this.maxParticles - this.particles.length;
    const actualCount = Math.min(particleCount, availableSlots);

    for (let i = 0; i < actualCount; i++) {
      const angle = (Math.PI * 2 * i) / actualCount + (Math.random() - 0.5) * 0.8;
      const speed = 60 + Math.random() * 180;
      const particle: Particle = {
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 5,
        color: color,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.2,
        alpha: 0.9,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 10,
      };
      this.particles.push(particle);
    }
  }

  spawnFadeParticles(
    x: number,
    y: number,
    color: string,
    count: number = 8
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 40;
      const particle: Particle = {
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        radius: 2 + Math.random() * 3,
        color: color,
        life: 0,
        maxLife: 0.3 + Math.random() * 0.2,
        alpha: 0.7,
        rotation: 0,
        rotationSpeed: 0,
      };
      this.particles.push(particle);
    }
  }

  update(dt: number): void {
    const gravity = 200;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      p.vy += gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.rotationSpeed * dt;

      const lifeRatio = p.life / p.maxLife;
      p.alpha = Math.max(0, 0.9 * (1 - lifeRatio));
      p.radius = Math.max(0.5, p.radius * (1 - lifeRatio * 0.3));

      p.vx *= 1 - 0.8 * dt;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.alpha;

      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, p.radius);
      gradient.addColorStop(0, p.color);
      gradient.addColorStop(0.6, p.color);
      gradient.addColorStop(1, this.fadeColor(p.color, 0));

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  private fadeColor(color: string, alpha: number): string {
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return color;
  }

  clear(): void {
    this.particles = [];
  }

  getParticleCount(): number {
    return this.particles.length;
  }
}
