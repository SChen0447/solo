export type BrushType = 'fine' | 'wash' | 'splatter';

export interface Point {
  x: number;
  y: number;
  speed: number;
  timestamp: number;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
}

export class BrushEngine {
  private ctx: CanvasRenderingContext2D;
  private brushType: BrushType = 'fine';
  private brushColor: string = '#222222';
  private baseSize: number = 3;
  private particles: Particle[] = [];
  private lastPoint: Point | null = null;
  private readonly maxSpeed = 5;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  setBrush(type: BrushType): void {
    this.brushType = type;
    switch (type) {
      case 'fine':
        this.baseSize = 2;
        break;
      case 'wash':
        this.baseSize = 12;
        break;
      case 'splatter':
        this.baseSize = 6;
        break;
    }
  }

  setColor(color: string): void {
    this.brushColor = color;
  }

  getBrush(): BrushType {
    return this.brushType;
  }

  startStroke(x: number, y: number): void {
    this.lastPoint = {
      x,
      y,
      speed: 0,
      timestamp: performance.now()
    };
    this.drawPoint(x, y, 0);
  }

  continueStroke(x: number, y: number): void {
    if (!this.lastPoint) {
      this.startStroke(x, y);
      return;
    }

    const now = performance.now();
    const dt = now - this.lastPoint.timestamp;
    const dx = x - this.lastPoint.x;
    const dy = y - this.lastPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = Math.min(distance / Math.max(dt, 1) * 16, this.maxSpeed);

    const steps = Math.max(1, Math.floor(distance / 2));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = this.lastPoint.x + dx * t;
      const py = this.lastPoint.y + dy * t;
      const interpSpeed = this.lastPoint.speed + (speed - this.lastPoint.speed) * t;
      this.drawPoint(px, py, interpSpeed);
    }

    this.lastPoint = { x, y, speed, timestamp: now };
  }

  endStroke(): void {
    this.lastPoint = null;
  }

  private drawPoint(x: number, y: number, speed: number): void {
    const speedFactor = Math.min(speed / this.maxSpeed, 1);
    const alphaFactor = 1 - speedFactor * 0.7;
    const spreadFactor = 1 + speedFactor * 0.5;

    switch (this.brushType) {
      case 'fine':
        this.drawFineBrush(x, y, alphaFactor);
        break;
      case 'wash':
        this.drawWashBrush(x, y, alphaFactor, spreadFactor);
        break;
      case 'splatter':
        this.drawSplatterBrush(x, y, alphaFactor, spreadFactor);
        break;
    }
  }

  private drawFineBrush(x: number, y: number, alphaFactor: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alphaFactor;
    ctx.fillStyle = this.brushColor;
    ctx.beginPath();
    ctx.arc(x, y, this.baseSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawWashBrush(x: number, y: number, alphaFactor: number, spreadFactor: number): void {
    const ctx = this.ctx;
    const radius = this.baseSize * spreadFactor;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    
    const color = this.hexToRgb(this.brushColor);
    if (!color) return;

    gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alphaFactor * 0.6})`);
    gradient.addColorStop(0.4, `rgba(${color.r}, ${color.g}, ${color.b}, ${alphaFactor * 0.3})`);
    gradient.addColorStop(0.7, `rgba(${color.r}, ${color.g}, ${color.b}, ${alphaFactor * 0.1})`);
    gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (Math.random() < 0.3) {
      this.addDiffusionParticles(x, y, radius, alphaFactor);
    }
  }

  private drawSplatterBrush(x: number, y: number, alphaFactor: number, spreadFactor: number): void {
    const ctx = this.ctx;
    const count = Math.floor(3 + Math.random() * 5 * spreadFactor);
    const radius = this.baseSize * spreadFactor * 2;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;
      const size = (0.5 + Math.random() * 2) * (1 - dist / radius);

      ctx.save();
      ctx.globalAlpha = alphaFactor * (0.3 + Math.random() * 0.7) * (1 - dist / radius * 0.5);
      ctx.fillStyle = this.brushColor;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private addDiffusionParticles(x: number, y: number, radius: number, alphaFactor: number): void {
    const count = Math.floor(2 + Math.random() * 3);
    const color = this.hexToRgb(this.brushColor);
    if (!color) return;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = radius * (0.8 + Math.random() * 0.4);
      this.particles.push({
        x: x + Math.cos(angle) * dist * 0.5,
        y: y + Math.sin(angle) * dist * 0.5,
        vx: Math.cos(angle) * 0.3,
        vy: Math.sin(angle) * 0.3,
        size: 1 + Math.random() * 2,
        alpha: alphaFactor * 0.3,
        life: 0,
        maxLife: 30 + Math.random() * 20
      });
    }
  }

  updateParticles(): void {
    const color = this.hexToRgb(this.brushColor);
    if (!color) return;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      p.alpha *= 0.97;
      p.size *= 0.99;

      const lifeRatio = p.life / p.maxLife;
      if (lifeRatio > 1 || p.alpha < 0.01 || p.size < 0.3) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  hasActiveParticles(): boolean {
    return this.particles.length > 0;
  }

  clearParticles(): void {
    this.particles = [];
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
}
