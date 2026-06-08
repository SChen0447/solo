import { ParticleConfig } from '../types';
import { frequencyToColor } from './index';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  frequency: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: ParticleConfig;
  private audioData: Uint8Array = new Uint8Array(0);

  constructor(canvas: HTMLCanvasElement, config: ParticleConfig) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = config;
    this.initParticles();
  }

  private initParticles(): void {
    this.particles = [];
    for (let i = 0; i < this.config.count; i++) {
      this.particles.push(this.createParticle());
    }
  }

  private createParticle(): Particle {
    const x = Math.random() * this.canvas.width;
    const y = Math.random() * this.canvas.height;
    const angle = Math.random() * Math.PI * 2;
    const speed = (Math.random() * 0.5 + 0.5) * this.config.speed;
    const frequency = Math.random();

    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: (Math.random() * 0.5 + 0.5) * this.config.size,
      life: 1,
      maxLife: Math.random() * 100 + 50,
      color: frequencyToColor(frequency * 20000, 20, 20000),
      frequency,
    };
  }

  public update(audioData: Uint8Array): void {
    this.audioData = audioData;

    while (this.particles.length < this.config.count) {
      this.particles.push(this.createParticle());
    }
    while (this.particles.length > this.config.count) {
      this.particles.pop();
    }

    const avgAmplitude = audioData.length > 0
      ? audioData.reduce((sum, val) => sum + val, 0) / audioData.length / 255
      : 0;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      const freqIndex = Math.floor(p.frequency * audioData.length);
      const freqValue = audioData[Math.min(freqIndex, audioData.length - 1)] || 0;
      const normalizedFreq = freqValue / 255;

      const speedMultiplier = 1 + normalizedFreq * 2;
      p.x += p.vx * speedMultiplier;
      p.y += p.vy * speedMultiplier;

      p.size = (0.5 + normalizedFreq * 1.5) * this.config.size;

      p.life -= 0.01;

      if (p.life <= 0 || p.x < 0 || p.x > this.canvas.width || p.y < 0 || p.y > this.canvas.height) {
        this.particles[i] = this.createParticle();
      }
    }
  }

  public draw(): void {
    const { ctx } = this;

    for (const p of this.particles) {
      const alpha = p.life * 0.8;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  public setConfig(config: ParticleConfig): void {
    this.config = { ...config };
  }

  public resize(): void {
    for (const p of this.particles) {
      if (p.x > this.canvas.width) p.x = Math.random() * this.canvas.width;
      if (p.y > this.canvas.height) p.y = Math.random() * this.canvas.height;
    }
  }
}
