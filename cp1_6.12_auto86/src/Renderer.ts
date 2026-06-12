import type { Wall, Crystal } from './LevelManager';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  trail: { x: number; y: number }[];
  active: boolean;
  penetration: number;
}

export interface RenderState {
  walls: Wall[];
  crystals: Crystal[];
  particles: Particle[];
  emitter: {
    x: number;
    y: number;
    radius: number;
    angle: number;
    ringRotation: number;
  };
  frequency: number;
  scale: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = 900;
    this.height = 600;
  }

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  render(state: RenderState): void {
    const { walls, crystals, particles, emitter, scale } = state;

    this.ctx.save();
    this.ctx.scale(scale, scale);

    this.clear();
    this.drawWalls(walls);
    this.drawCrystals(crystals);
    this.drawParticles(particles);
    this.drawEmitter(emitter, state.frequency);

    this.ctx.restore();
  }

  private clear(): void {
    this.ctx.fillStyle = '#0D1117';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.strokeStyle = 'rgba(88, 166, 255, 0.03)';
    this.ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x <= this.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }
    for (let y = 0; y <= this.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
  }

  private drawWalls(walls: Wall[]): void {
    for (const wall of walls) {
      this.ctx.fillStyle = '#30363D';
      this.ctx.fillRect(wall.x, wall.y, wall.width, wall.height);

      this.ctx.shadowColor = 'rgba(88, 166, 255, 0.3)';
      this.ctx.shadowBlur = 8;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
      this.ctx.strokeStyle = 'rgba(88, 166, 255, 0.25)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(wall.x + 0.5, wall.y + 0.5, wall.width - 1, wall.height - 1);
      this.ctx.shadowBlur = 0;
    }
  }

  private drawCrystals(crystals: Crystal[]): void {
    for (const crystal of crystals) {
      this.ctx.save();
      this.ctx.translate(crystal.x, crystal.y);

      let scale = 1;
      let color = '#B10DC9';
      let glowColor = 'rgba(177, 13, 201, 0.5)';

      if (crystal.flashProgress > 0) {
        const flashT = 1 - crystal.flashProgress;
        const pulse = Math.sin(flashT * Math.PI * 2);
        scale = 1 + pulse * 0.3 * crystal.flashProgress;
        const t = crystal.flashProgress;
        color = this.lerpColor('#FFDC00', '#B10DC9', t);
        glowColor = `rgba(255, 220, 0, ${0.8 * crystal.flashProgress})`;
      } else if (crystal.collected) {
        color = '#FFDC00';
        glowColor = 'rgba(255, 220, 0, 0.4)';
      }

      this.ctx.scale(scale, scale);

      this.ctx.shadowColor = glowColor;
      this.ctx.shadowBlur = 25;

      this.ctx.beginPath();
      this.ctx.moveTo(0, -crystal.radius);
      this.ctx.lineTo(crystal.radius * 0.7, -crystal.radius * 0.2);
      this.ctx.lineTo(crystal.radius * 0.5, crystal.radius);
      this.ctx.lineTo(-crystal.radius * 0.5, crystal.radius);
      this.ctx.lineTo(-crystal.radius * 0.7, -crystal.radius * 0.2);
      this.ctx.closePath();

      const gradient = this.ctx.createRadialGradient(0, -crystal.radius * 0.3, 0, 0, 0, crystal.radius);
      gradient.addColorStop(0, this.lightenColor(color, 40));
      gradient.addColorStop(0.5, color);
      gradient.addColorStop(1, this.darkenColor(color, 30));
      this.ctx.fillStyle = gradient;
      this.ctx.fill();

      this.ctx.strokeStyle = this.lightenColor(color, 60);
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(-crystal.radius * 0.3, -crystal.radius * 0.5);
      this.ctx.lineTo(crystal.radius * 0.2, crystal.radius * 0.3);
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      this.ctx.shadowBlur = 0;
      this.ctx.restore();
    }
  }

  private drawParticles(particles: Particle[]): void {
    for (const particle of particles) {
      if (!particle.active) continue;

      if (particle.trail.length > 1) {
        this.ctx.beginPath();
        this.ctx.moveTo(particle.trail[0].x, particle.trail[0].y);
        for (let i = 1; i < particle.trail.length; i++) {
          this.ctx.lineTo(particle.trail[i].x, particle.trail[i].y);
        }
        this.ctx.lineTo(particle.x, particle.y);
        this.ctx.strokeStyle = particle.color + '4D';
        this.ctx.lineWidth = particle.radius * 1.5;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.stroke();
      }

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = particle.color;
      this.ctx.shadowColor = particle.color;
      this.ctx.shadowBlur = 15;
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private drawEmitter(emitter: RenderState['emitter'], frequency: number): void {
    const { x, y, radius, angle, ringRotation } = emitter;

    this.ctx.save();
    this.ctx.translate(x, y);

    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius + 12, 0, Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(88, 166, 255, 0.2)';
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([5, 5]);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    this.ctx.rotate(ringRotation);
    for (let i = 0; i < 3; i++) {
      this.ctx.rotate((Math.PI * 2) / 3);
      this.ctx.beginPath();
      this.ctx.arc(0, 0, radius + 6, 0, Math.PI / 4);
      this.ctx.strokeStyle = `rgba(88, 166, 255, ${0.4 + i * 0.2})`;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
    this.ctx.rotate(-ringRotation);

    const pulseScale = 1 + Math.sin(Date.now() / 300) * 0.05;
    this.ctx.scale(pulseScale, pulseScale);

    const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    gradient.addColorStop(0, 'rgba(88, 166, 255, 0.4)');
    gradient.addColorStop(0.7, 'rgba(31, 111, 235, 0.3)');
    gradient.addColorStop(1, 'rgba(31, 111, 235, 0.1)');
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(88, 166, 255, 0.6)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.rotate((angle * Math.PI) / 180);

    const dirColor = this.getFrequencyColor(frequency);
    this.ctx.beginPath();
    this.ctx.moveTo(radius - 2, -3);
    this.ctx.lineTo(radius + 25, 0);
    this.ctx.lineTo(radius - 2, 3);
    this.ctx.closePath();
    this.ctx.fillStyle = dirColor;
    this.ctx.shadowColor = dirColor;
    this.ctx.shadowBlur = 10;
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    this.ctx.rotate((-angle * Math.PI) / 180);

    this.ctx.fillStyle = 'rgba(201, 209, 217, 0.9)';
    this.ctx.font = 'bold 11px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${angle}°`, 0, -radius - 10);

    this.ctx.restore();
  }

  getFrequencyColor(frequency: number): string {
    const t = (frequency - 200) / (2000 - 200);
    if (t < 0.33) {
      return this.lerpColor('#FF4136', '#FF851B', t / 0.33);
    } else if (t < 0.66) {
      return this.lerpColor('#FF851B', '#2ECC40', (t - 0.33) / 0.33);
    } else {
      return this.lerpColor('#2ECC40', '#0074D9', (t - 0.66) / 0.34);
    }
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 0, g: 0, b: 0 };
  }

  private lightenColor(color: string, percent: number): string {
    const c = this.hexToRgb(color);
    const r = Math.min(255, Math.round(c.r + (255 - c.r) * (percent / 100)));
    const g = Math.min(255, Math.round(c.g + (255 - c.g) * (percent / 100)));
    const b = Math.min(255, Math.round(c.b + (255 - c.b) * (percent / 100)));
    return `rgb(${r}, ${g}, ${b})`;
  }

  private darkenColor(color: string, percent: number): string {
    const c = this.hexToRgb(color);
    const r = Math.max(0, Math.round(c.r * (1 - percent / 100)));
    const g = Math.max(0, Math.round(c.g * (1 - percent / 100)));
    const b = Math.max(0, Math.round(c.b * (1 - percent / 100)));
    return `rgb(${r}, ${g}, ${b})`;
  }
}
