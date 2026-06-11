import { Particle } from './particle';

interface Star {
  x: number;
  y: number;
  size: number;
  period: number;
  phase: number;
  minAlpha: number;
  maxAlpha: number;
}

export class ParticleRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private stars: Star[];
  private width: number;
  private height: number;
  private dpr: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.dpr = window.devicePixelRatio || 1;
    this.width = canvas.clientWidth;
    this.height = canvas.clientHeight;
    this.updateCanvasSize();
    this.stars = this.generateStars(20);
  }

  private updateCanvasSize(): void {
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private generateStars(count: number): Star[] {
    const stars: Star[] = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 1 + Math.random() * 2,
        period: 2 + Math.random() * 3,
        phase: Math.random() * Math.PI * 2,
        minAlpha: 0.3,
        maxAlpha: 1.0,
      });
    }
    return stars;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.updateCanvasSize();
    this.stars = this.generateStars(20);
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  render(particles: Particle[], time: number): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    this.drawStars(time);
    this.drawParticles(particles);
  }

  private drawStars(time: number): void {
    const ctx = this.ctx;

    for (const star of this.stars) {
      const alpha =
        star.minAlpha +
        ((Math.sin((time / 1000) * (Math.PI * 2) / star.period + star.phase) + 1) / 2) *
          (star.maxAlpha - star.minAlpha);

      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }
  }

  private drawParticles(particles: Particle[]): void {
    const ctx = this.ctx;

    for (const particle of particles) {
      if (!particle.active || particle.alpha <= 0) continue;

      const radius = particle.size * 1.5;
      const gradient = ctx.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        radius
      );

      gradient.addColorStop(
        0,
        `rgba(${particle.r}, ${particle.g}, ${particle.b}, ${particle.alpha})`
      );
      gradient.addColorStop(
        0.4,
        `rgba(${particle.r}, ${particle.g}, ${particle.b}, ${particle.alpha * 0.6})`
      );
      gradient.addColorStop(
        1,
        `rgba(${particle.r}, ${particle.g}, ${particle.b}, 0)`
      );

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }

  captureSnapshot(particles: Particle[], size: number = 1024): string {
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = size;
    offscreenCanvas.height = size;
    const ctx = offscreenCanvas.getContext('2d')!;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);

    const scale = size / this.width;

    for (const particle of particles) {
      if (!particle.active || particle.alpha <= 0) continue;

      const px = particle.x * scale;
      const py = particle.y * scale;
      const radius = particle.size * 1.5 * scale;

      const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius);
      gradient.addColorStop(
        0,
        `rgba(${particle.r}, ${particle.g}, ${particle.b}, ${particle.alpha})`
      );
      gradient.addColorStop(
        0.4,
        `rgba(${particle.r}, ${particle.g}, ${particle.b}, ${particle.alpha * 0.6})`
      );
      gradient.addColorStop(
        1,
        `rgba(${particle.r}, ${particle.g}, ${particle.b}, 0)`
      );

      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    return offscreenCanvas.toDataURL('image/png');
  }
}
