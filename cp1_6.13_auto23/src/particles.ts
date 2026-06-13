interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  r: number;
  g: number;
  b: number;
  angle: number;
  speed: number;
}

export class ParticleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private maxParticles: number = 300;
  private lowEnergy: number = 0;
  private highEnergy: number = 0;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;
  private emitTimer: number = 0;
  private flashIntensity: number = 0;
  private rotation: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not supported');
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
  }

  resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setEnergies(low: number, high: number): void {
    this.lowEnergy = low;
    this.highEnergy = high;
  }

  triggerFlash(): void {
    this.flashIntensity = 1;
  }

  private emitParticles(dt: number): void {
    const totalEnergy = this.lowEnergy + this.highEnergy;
    if (totalEnergy < 0.02) return;

    this.emitTimer += dt;
    const emitInterval = 0.016 / (0.3 + totalEnergy * 2);

    while (this.emitTimer >= emitInterval && this.particles.length < this.maxParticles) {
      this.emitTimer -= emitInterval;
      this.emitParticle();
    }
  }

  private emitParticle(): void {
    const centerX = this.width / 2;
    const centerY = this.height * 0.72;
    const ringRadius = Math.min(this.width, this.height) * 0.28;

    const angle = Math.random() * Math.PI + Math.PI;

    const lowColor = { r: 120, g: 80, b: 220 };
    const highColor = { r: 255, g: 200, b: 80 };
    const t = this.highEnergy * 0.6 + this.lowEnergy * 0.2 + Math.random() * 0.2;
    const r = Math.round(lowColor.r + (highColor.r - lowColor.r) * t);
    const g = Math.round(lowColor.g + (highColor.g - lowColor.g) * t);
    const b = Math.round(lowColor.b + (highColor.b - lowColor.b) * t);

    const speedBase = 20 + this.highEnergy * 80 + Math.random() * 40;
    const spreadAngle = angle + (Math.random() - 0.5) * 0.6;

    const x = centerX + Math.cos(angle) * ringRadius;
    const y = centerY + Math.sin(angle) * ringRadius;

    const outAngle = angle + Math.PI + (Math.random() - 0.5) * 0.8;

    const particle: Particle = {
      x,
      y,
      vx: Math.cos(outAngle) * speedBase,
      vy: Math.sin(outAngle) * speedBase,
      size: 1.5 + Math.random() * 3 + this.highEnergy * 2,
      life: 1,
      maxLife: 1.5 + Math.random() * 2,
      r,
      g,
      b,
      angle: spreadAngle,
      speed: speedBase * 0.3,
    };

    this.particles.push(particle);
  }

  update(dt: number): void {
    this.rotation += dt * 0.15;

    if (this.flashIntensity > 0) {
      this.flashIntensity -= dt * 2.5;
      if (this.flashIntensity < 0) this.flashIntensity = 0;
    }

    this.emitParticles(dt);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      p.vx *= 0.98;
      p.vy *= 0.98;

      p.vy -= 10 * dt;

      p.life -= dt / p.maxLife;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(): void {
    const ctx = this.ctx;

    if (this.flashIntensity > 0) {
      ctx.save();
      ctx.globalAlpha = this.flashIntensity * 0.25;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const p of this.particles) {
      const alpha = p.life * 0.8;
      const glowSize = p.size * 3;

      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
      gradient.addColorStop(0, `rgba(${p.r}, ${p.g}, ${p.b}, ${alpha})`);
      gradient.addColorStop(0.4, `rgba(${p.r}, ${p.g}, ${p.b}, ${alpha * 0.5})`);
      gradient.addColorStop(1, `rgba(${p.r}, ${p.g}, ${p.b}, 0)`);

      ctx.beginPath();
      ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
      ctx.fill();
    }

    ctx.restore();
  }

  reset(): void {
    this.particles = [];
    this.flashIntensity = 1;
  }
}
