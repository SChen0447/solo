import type { Fragment, Particle, Shockwave, Player, SpiralStar } from './types';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  clear(): void {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawFragment(fragment: Fragment): void {
    const ctx = this.ctx;
    const { x, y, radius, rotation, color, vertices } = fragment;

    const glowRadius = radius * 2.5;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
    glow.addColorStop(0, color + '66');
    glow.addColorStop(0.5, color + '22');
    glow.addColorStop(1, color + '00');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    for (let i = 0; i < vertices.length; i++) {
      const v = vertices[i];
      if (i === 0) {
        ctx.moveTo(v.x, v.y);
      } else {
        ctx.lineTo(v.x, v.y);
      }
    }
    ctx.closePath();

    const innerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    innerGlow.addColorStop(0, '#ffffff');
    innerGlow.addColorStop(0.3, color);
    innerGlow.addColorStop(1, color);
    ctx.fillStyle = innerGlow;
    ctx.fill();
    ctx.restore();
  }

  drawPlayer(player: Player, isMobile: boolean): void {
    const ctx = this.ctx;
    const { x, y, radius, trail } = player;

    const trailLength = isMobile ? Math.floor(trail.length * 0.6) : trail.length;
    for (let i = 0; i < trailLength; i++) {
      const p = trail[i];
      const alpha = p.opacity;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 0.5 * (i / trail.length + 0.3), 0, Math.PI * 2);
      ctx.fill();
    }

    const glowRadius = radius * 3;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
    glow.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    glow.addColorStop(0.4, 'rgba(255, 255, 255, 0.15)');
    glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    const core = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
    core.addColorStop(0, '#ffffff');
    core.addColorStop(1, '#e0e0e0');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  drawParticle(particle: Particle): void {
    const ctx = this.ctx;
    const alpha = particle.life / particle.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  drawShockwave(shockwave: Shockwave): void {
    const ctx = this.ctx;
    ctx.strokeStyle = shockwave.color;
    ctx.globalAlpha = shockwave.opacity;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(shockwave.x, shockwave.y, shockwave.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  drawSpiralStar(spiral: SpiralStar, centerX: number, centerY: number): void {
    const ctx = this.ctx;

    for (const point of spiral.points) {
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(spiral.rotation);
      const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, point.radius * 3);
      glow.addColorStop(0, point.color);
      glow.addColorStop(1, point.color + '00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(point.x, point.y, point.radius * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = point.color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const hp of spiral.haloParticles) {
      const alpha = hp.life / hp.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = hp.color;
      ctx.beginPath();
      ctx.arc(hp.x, hp.y, hp.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  get width(): number {
    return this.canvas.width;
  }

  get height(): number {
    return this.canvas.height;
  }
}
