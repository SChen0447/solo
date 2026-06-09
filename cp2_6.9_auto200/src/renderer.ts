import type { Ship } from './fleet';
import type { Particle, LaserEffect } from './battle';
import { getHpColor } from './battle';

export interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private stars: Star[];

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.stars = this.generateStars();
  }

  private generateStars(): Star[] {
    const stars: Star[] = [];
    for (let i = 0; i < 50; i++) {
      stars.push({
        x: Math.random() * 800,
        y: Math.random() * 550,
        size: 1 + Math.floor(Math.random() * 2),
        brightness: 0.2 + Math.random() * 0.6
      });
    }
    return stars;
  }

  render(
    ships: Ship[],
    particles: Particle[],
    lasers: LaserEffect[],
    shakeOffset: { x: number; y: number },
    currentTime: number
  ): void {
    const ctx = this.ctx;
    const sx = Math.round(shakeOffset.x);
    const sy = Math.round(shakeOffset.y);

    ctx.save();
    ctx.translate(sx, sy);

    this.drawBackground();
    this.drawLasers(lasers);
    this.drawShips(ships, currentTime);
    this.drawParticles(particles);

    ctx.restore();
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, 550);
    gradient.addColorStop(0, '#0B0C10');
    gradient.addColorStop(1, '#1F2833');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 550);

    for (const star of this.stars) {
      const alpha = Math.floor(star.brightness * 255).toString(16).padStart(2, '0');
      ctx.fillStyle = `#E0E0E0${alpha}`;
      ctx.fillRect(Math.round(star.x), Math.round(star.y), star.size, star.size);
    }
  }

  private drawShips(ships: Ship[], currentTime: number): void {
    for (const ship of ships) {
      if (!ship.isAlive) continue;
      this.drawShip(ship, currentTime);
      this.drawHpBar(ship);
    }
  }

  private drawShip(ship: Ship, currentTime: number): void {
    const ctx = this.ctx;
    const x = Math.round(ship.x);
    const y = Math.round(ship.y);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ship.angle);

    switch (ship.type) {
      case 'fighter':
        this.drawFighter(ctx, ship.color);
        break;
      case 'frigate':
        this.drawFrigate(ctx, ship.color);
        break;
      case 'carrier':
        this.drawCarrier(ctx, ship.color);
        break;
    }

    ctx.restore();

    if (ship.isSelected) {
      const blink = Math.sin(currentTime / 250) > 0 ? 1 : 0.5;
      ctx.strokeStyle = `rgba(255, 255, 255, ${blink})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, ship.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawFighter(ctx: CanvasRenderingContext2D, color: string): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -7);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-8, 7);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.lightenColor(color, 30);
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-4, -4);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(2, -1, 4, 2);
  }

  private drawFrigate(ctx: CanvasRenderingContext2D, color: string): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const px = Math.cos(angle) * 14;
      const py = Math.sin(angle) * 14;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.darkenColor(color, 25);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const px = Math.cos(angle) * 10;
      const py = Math.sin(angle) * 10;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.lightenColor(color, 20);
    ctx.fillRect(-6, -3, 12, 6);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(2, -1, 3, 2);
  }

  private drawCarrier(ctx: CanvasRenderingContext2D, color: string): void {
    ctx.fillStyle = color;
    ctx.fillRect(-16, -10, 32, 20);

    ctx.fillStyle = this.darkenColor(color, 20);
    ctx.fillRect(-16, -10, 32, 4);
    ctx.fillRect(-16, 6, 32, 4);

    ctx.fillStyle = this.lightenColor(color, 30);
    ctx.fillRect(-12, -6, 24, 12);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-8, -2, 4, 4);
    ctx.fillRect(0, -2, 4, 4);
    ctx.fillRect(8, -2, 4, 4);

    ctx.fillStyle = this.darkenColor(color, 35);
    ctx.beginPath();
    ctx.moveTo(16, -6);
    ctx.lineTo(22, 0);
    ctx.lineTo(16, 6);
    ctx.closePath();
    ctx.fill();
  }

  private drawHpBar(ship: Ship): void {
    const ctx = this.ctx;
    const x = Math.round(ship.x);
    const y = Math.round(ship.y - ship.radius - 8);
    const w = 20;
    const h = 3;
    const ratio = ship.hp / ship.maxHp;

    ctx.fillStyle = '#333333';
    ctx.fillRect(x - w / 2, y, w, h);

    ctx.fillStyle = getHpColor(ratio);
    ctx.fillRect(x - w / 2, y, Math.round(w * ratio), h);
  }

  private drawLasers(lasers: LaserEffect[]): void {
    const ctx = this.ctx;
    for (const laser of lasers) {
      const alpha = laser.life / laser.maxLife;
      ctx.strokeStyle = this.hexToRgba(laser.color, alpha);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(Math.round(laser.x1), Math.round(laser.y1));
      ctx.lineTo(Math.round(laser.x2), Math.round(laser.y2));
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(laser.x1), Math.round(laser.y1));
      ctx.lineTo(Math.round(laser.x2), Math.round(laser.y2));
      ctx.stroke();
    }
  }

  private drawParticles(particles: Particle[]): void {
    const ctx = this.ctx;
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      const color = this.adjustBrightness(p.color, alpha);
      ctx.fillStyle = color;
      ctx.fillRect(
        Math.round(p.x - p.size / 2),
        Math.round(p.y - p.size / 2),
        p.size,
        p.size
      );
    }
  }

  private lightenColor(hex: string, percent: number): string {
    const { r, g, b } = this.hexToRgb(hex);
    return this.rgbToHex(
      Math.min(255, Math.round(r + (255 - r) * percent / 100)),
      Math.min(255, Math.round(g + (255 - g) * percent / 100)),
      Math.min(255, Math.round(b + (255 - b) * percent / 100))
    );
  }

  private darkenColor(hex: string, percent: number): string {
    const { r, g, b } = this.hexToRgb(hex);
    return this.rgbToHex(
      Math.max(0, Math.round(r * (100 - percent) / 100)),
      Math.max(0, Math.round(g * (100 - percent) / 100)),
      Math.max(0, Math.round(b * (100 - percent) / 100))
    );
  }

  private adjustBrightness(hex: string, factor: number): string {
    const { r, g, b } = this.hexToRgb(hex);
    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${factor})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16)
    };
  }

  private hexToRgba(hex: string, alpha: number): string {
    const { r, g, b } = this.hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }
}
