export interface ParticleOptions {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  size?: number;
  life?: number;
  colorStart?: string;
  colorEnd?: string;
  angle?: number;
  radius?: number;
  angularSpeed?: number;
  type?: 'burst' | 'nebula';
}

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  colorStart: { r: number; g: number; b: number };
  colorEnd: { r: number; g: number; b: number };
  angle: number;
  radius: number;
  angularSpeed: number;
  centerX: number;
  centerY: number;
  type: 'burst' | 'nebula';
  active: boolean;

  constructor(options: ParticleOptions) {
    this.x = options.x;
    this.y = options.y;
    this.centerX = options.x;
    this.centerY = options.y;
    this.vx = options.vx ?? (Math.random() - 0.5) * 200;
    this.vy = options.vy ?? (Math.random() - 0.5) * 200;
    this.size = options.size ?? 6 + Math.random() * 6;
    this.life = options.life ?? 2 + Math.random();
    this.maxLife = this.life;
    this.angle = options.angle ?? Math.random() * Math.PI * 2;
    this.radius = options.radius ?? 0;
    this.angularSpeed = options.angularSpeed ?? 2 + Math.random() * 3;
    this.type = options.type ?? 'burst';
    this.active = true;

    const startColor = options.colorStart ?? '#ff6b6b';
    const endColor = options.colorEnd ?? '#feca57';
    this.colorStart = this.parseColor(startColor);
    this.colorEnd = this.parseColor(endColor);
  }

  private parseColor(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 255, g: 255, b: 255 };
  }

  getCurrentColor(): string {
    const t = 1 - this.life / this.maxLife;
    const r = Math.floor(this.colorStart.r + (this.colorEnd.r - this.colorStart.r) * t);
    const g = Math.floor(this.colorStart.g + (this.colorEnd.g - this.colorStart.g) * t);
    const b = Math.floor(this.colorStart.b + (this.colorEnd.b - this.colorStart.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  getCurrentOpacity(): number {
    const lifeRatio = this.life / this.maxLife;
    if (lifeRatio > 0.7) {
      return (1 - lifeRatio) / 0.3;
    } else if (lifeRatio > 0.3) {
      return 1;
    } else {
      return lifeRatio / 0.3;
    }
  }

  update(deltaTime: number): boolean {
    this.life -= deltaTime;
    if (this.life <= 0) {
      this.active = false;
      return false;
    }

    if (this.type === 'burst') {
      this.x += this.vx * deltaTime;
      this.y += this.vy * deltaTime;
      this.vx *= 0.98;
      this.vy *= 0.98;
    } else if (this.type === 'nebula') {
      this.angle += this.angularSpeed * deltaTime;
      this.radius += 60 * deltaTime;
      this.x = this.centerX + Math.cos(this.angle) * this.radius;
      this.y = this.centerY + Math.sin(this.angle) * this.radius;
    }

    return true;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    const opacity = this.getCurrentOpacity();
    const color = this.getCurrentColor();
    const currentSize = this.size * (this.life / this.maxLife + 0.5);

    ctx.save();
    ctx.globalAlpha = opacity;

    const glowRadius = currentSize * 3;
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, glowRadius
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, currentSize, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.restore();
  }

  reset(options: ParticleOptions): void {
    this.x = options.x;
    this.y = options.y;
    this.centerX = options.x;
    this.centerY = options.y;
    this.vx = options.vx ?? (Math.random() - 0.5) * 200;
    this.vy = options.vy ?? (Math.random() - 0.5) * 200;
    this.size = options.size ?? 6 + Math.random() * 6;
    this.life = options.life ?? 2 + Math.random();
    this.maxLife = this.life;
    this.angle = options.angle ?? Math.random() * Math.PI * 2;
    this.radius = options.radius ?? 0;
    this.angularSpeed = options.angularSpeed ?? 2 + Math.random() * 3;
    this.type = options.type ?? 'burst';
    this.active = true;

    if (options.colorStart) {
      this.colorStart = this.parseColor(options.colorStart);
    }
    if (options.colorEnd) {
      this.colorEnd = this.parseColor(options.colorEnd);
    }
  }
}

export class ParticleSystem {
  private particles: Particle[];
  private pool: Particle[];
  private particleScale: number;
  private maxParticles: number;

  constructor(maxParticles: number = 500) {
    this.particles = [];
    this.pool = [];
    this.particleScale = 1;
    this.maxParticles = maxParticles;
  }

  setParticleScale(scale: number): void {
    this.particleScale = scale;
  }

  private getParticle(options: ParticleOptions): Particle {
    if (this.pool.length > 0) {
      const p = this.pool.pop()!;
      p.reset(options);
      return p;
    }
    return new Particle(options);
  }

  emitBurst(x: number, y: number, count: number): void {
    const actualCount = Math.floor(count * this.particleScale);
    for (let i = 0; i < actualCount && this.particles.length < this.maxParticles; i++) {
      const angle = (i / actualCount) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 80 + Math.random() * 120;
      const particle = this.getParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 8,
        life: 1.5 + Math.random() * 1,
        colorStart: '#6a9cff',
        colorEnd: '#c084fc',
        type: 'burst',
      });
      this.particles.push(particle);
    }
  }

  emitNebula(x: number, y: number, count: number): void {
    const actualCount = Math.floor(count * this.particleScale);
    for (let i = 0; i < actualCount && this.particles.length < this.maxParticles; i++) {
      const angle = (i / actualCount) * Math.PI * 2;
      const particle = this.getParticle({
        x,
        y,
        angle,
        radius: 5 + Math.random() * 20,
        angularSpeed: 1.5 + Math.random() * 2,
        size: 6 + Math.random() * 6,
        life: 2.5,
        colorStart: '#ff6b6b',
        colorEnd: '#feca57',
        type: 'nebula',
      });
      this.particles.push(particle);
    }
  }

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const alive = this.particles[i].update(deltaTime);
      if (!alive) {
        this.pool.push(this.particles[i]);
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const particle of this.particles) {
      particle.draw(ctx);
    }
  }

  clear(): void {
    this.pool.push(...this.particles);
    this.particles = [];
  }

  getActiveCount(): number {
    return this.particles.length;
  }
}
