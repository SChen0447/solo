import type { Ship, Obstacle, PowerUp, Particle, Star } from './entities';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  clear(): void {
    const { ctx, canvas } = this;
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0a0e27');
    gradient.addColorStop(1, '#141a3e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  drawStars(stars: Star[], time: number): void {
    const { ctx } = this;
    for (const star of stars) {
      const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase) * 0.5 + 0.5;
      const alpha = star.brightness * 0.5 + twinkle * 0.5;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }
  }

  drawShip(ship: Ship, time: number): void {
    const { ctx } = this;
    const { x, y, radius, boosting } = ship;

    ctx.save();
    ctx.translate(x, y);

    const glowIntensity = boosting ? 25 + Math.sin(time * 0.01) * 10 : 15;
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius + glowIntensity);
    glow.addColorStop(0, 'rgba(0, 212, 255, 0.4)');
    glow.addColorStop(0.5, 'rgba(0, 212, 255, 0.1)');
    glow.addColorStop(1, 'rgba(0, 212, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, radius + glowIntensity, 0, Math.PI * 2);
    ctx.fill();

    const bodyGradient = ctx.createLinearGradient(-radius, 0, radius, 0);
    bodyGradient.addColorStop(0, '#0088aa');
    bodyGradient.addColorStop(0.5, '#00d4ff');
    bodyGradient.addColorStop(1, '#0088aa');

    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(-radius * 0.8, -radius * 0.7);
    ctx.lineTo(-radius * 0.5, 0);
    ctx.lineTo(-radius * 0.8, radius * 0.7);
    ctx.closePath();
    ctx.fillStyle = bodyGradient;
    ctx.fill();
    ctx.strokeStyle = '#66e5ff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(radius * 0.1, 0, radius * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(200, 245, 255, 0.8)';
    ctx.fill();

    ctx.restore();
  }

  drawObstacle(obstacle: Obstacle): void {
    const { ctx } = this;
    const { x, y, width, height, shape, color } = obstacle;

    ctx.save();

    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, '#c0392b');

    ctx.fillStyle = gradient;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;

    if (shape === 'rect') {
      ctx.beginPath();
      const radius = 6;
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x, y + height);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x + width / 2, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  drawPowerUp(powerUp: PowerUp, time: number): void {
    const { ctx } = this;
    const { x, y, radius } = powerUp;
    const pulse = Math.sin(time * 0.008 + powerUp.pulsePhase) * 0.3 + 1;
    const r = radius * pulse;

    ctx.save();
    ctx.translate(x, y);

    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.5);
    glow.addColorStop(0, 'rgba(255, 215, 0, 0.6)');
    glow.addColorStop(0.5, 'rgba(255, 215, 0, 0.2)');
    glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.5, 0, Math.PI * 2);
    ctx.fill();

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    gradient.addColorStop(0, '#fff7b3');
    gradient.addColorStop(0.4, '#ffd700');
    gradient.addColorStop(1, '#ffaa00');

    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const starR = i % 2 === 0 ? r : r * 0.5;
      const px = Math.cos(angle) * starR;
      const py = Math.sin(angle) * starR;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#fff7b3';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  drawParticles(particles: Particle[]): void {
    const { ctx } = this;
    for (const p of particles) {
      if (!p.active) continue;
      const alpha = p.life / p.maxLife;
      const size = 4 * alpha + 1;
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
      gradient.addColorStop(0, `rgba(255, 180, 80, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(255, 120, 40, ${alpha * 0.5})`);
      gradient.addColorStop(1, 'rgba(255, 80, 20, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function speedToColor(multiplier: number): string {
  const clamped = Math.max(1, Math.min(multiplier, 5));
  const t = (clamped - 1) / 4;
  const r = Math.round(46 + (231 - 46) * t);
  const g = Math.round(204 + (76 - 204) * t);
  const b = Math.round(113 + (60 - 113) * t);
  return `rgb(${r}, ${g}, ${b})`;
}
