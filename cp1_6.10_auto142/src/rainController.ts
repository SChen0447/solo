import { Particle } from './particle';

export interface PulseWave {
  x: number;
  y: number;
  startTime: number;
  duration: number;
  maxRadius: number;
  active: boolean;
}

export class RainController {
  private particles: Particle[] = [];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mouseX: number = -1000;
  private mouseY: number = -1000;
  private mouseActive: boolean = false;
  private pulseWave: PulseWave | null = null;
  private minParticles: number;
  private maxParticles: number;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.minParticles = this.isMobile() ? 250 : 500;
    this.maxParticles = this.isMobile() ? 400 : 800;
    this.initParticles();
  }

  private isMobile(): boolean {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
  }

  private initParticles(): void {
    const count = Math.floor((this.minParticles + this.maxParticles) / 2);
    for (let i = 0; i < count; i++) {
      const startY = Math.random() * this.canvas.height;
      this.particles.push(new Particle(this.canvas.width, this.canvas.height, startY));
    }
  }

  public setMousePosition(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
    this.mouseActive = true;
  }

  public clearMouse(): void {
    this.mouseActive = false;
  }

  public triggerPulse(x: number, y: number, currentTime: number): void {
    this.pulseWave = {
      x,
      y,
      startTime: currentTime,
      duration: 1000,
      maxRadius: 200,
      active: true,
    };
  }

  public resize(): void {
    for (const p of this.particles) {
      p.resize(this.canvas.width, this.canvas.height);
    }
  }

  public start(): void {
    this.resize();
  }

  public update(currentTime: number): void {
    const pulseX = this.pulseWave?.x ?? 0;
    const pulseY = this.pulseWave?.y ?? 0;
    const pulseActive = this.pulseWave?.active ?? false;
    let pulseRadius = 0;

    if (this.pulseWave && this.pulseWave.active) {
      const elapsed = currentTime - this.pulseWave.startTime;
      const progress = Math.min(elapsed / this.pulseWave.duration, 1);
      pulseRadius = this.pulseWave.maxRadius * progress;
      if (progress >= 1) {
        this.pulseWave.active = false;
      }
    }

    const surviving: Particle[] = [];
    for (const particle of this.particles) {
      const alive = particle.update(
        this.mouseX,
        this.mouseY,
        this.mouseActive,
        pulseX,
        pulseY,
        pulseActive,
        pulseRadius,
        currentTime
      );
      if (alive) {
        surviving.push(particle);
      }
    }
    this.particles = surviving;

    this.maintainParticleCount();
  }

  private maintainParticleCount(): void {
    const target = Math.floor((this.minParticles + this.maxParticles) / 2);
    while (this.particles.length < target) {
      this.particles.push(new Particle(this.canvas.width, this.canvas.height));
    }
    if (this.particles.length > this.maxParticles) {
      this.particles.length = this.maxParticles;
    }
  }

  private drawBottomGlow(): void {
    const bandHeight = 60;
    const y = this.canvas.height - bandHeight;
    const gradient = this.ctx.createLinearGradient(0, y, 0, this.canvas.height);
    gradient.addColorStop(0, 'rgba(0, 255, 136, 0)');
    gradient.addColorStop(1, 'rgba(0, 255, 136, 0.4)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, y, this.canvas.width, bandHeight);
  }

  private drawPulseWave(currentTime: number): void {
    if (!this.pulseWave || !this.pulseWave.active) return;
    const elapsed = currentTime - this.pulseWave.startTime;
    const progress = Math.min(elapsed / this.pulseWave.duration, 1);
    const radius = this.pulseWave.maxRadius * progress;
    const alpha = 1 - progress;

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(this.pulseWave.x, this.pulseWave.y, radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
    this.ctx.lineWidth = 2;
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawParticleCount(): void {
    this.ctx.save();
    this.ctx.font = '14px monospace';
    this.ctx.fillStyle = 'white';
    this.ctx.shadowColor = 'black';
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 1;
    this.ctx.shadowOffsetY = 1;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(`Particles: ${this.particles.length}`, 12, 12);
    this.ctx.restore();
  }

  public draw(currentTime: number): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawBottomGlow();

    for (const particle of this.particles) {
      particle.draw(this.ctx);
    }

    this.drawPulseWave(currentTime);
    this.drawParticleCount();
  }

  public getParticleCount(): number {
    return this.particles.length;
  }
}
