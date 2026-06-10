import type p5 from 'p5';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  createdAt: number;
}

export interface LightPillar {
  x: number;
  y: number;
  color: string;
  progress: number;
  duration: number;
  createdAt: number;
}

export class ParticleSystem {
  private p: p5;
  private particles: Particle[] = [];
  private pillars: LightPillar[] = [];
  private readonly MAX_PARTICLES = 300;
  private readonly PARTICLES_PER_BURST = 80;
  private readonly PILLAR_HEIGHT = 100;
  private readonly PILLAR_WIDTH = 4;

  constructor(p: p5) {
    this.p = p;
  }

  emitBurst(x: number, y: number, color: string): void {
    for (let i = 0; i < this.PARTICLES_PER_BURST; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      const particle: Particle = {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 3,
        color,
        life: 1.0,
        maxLife: 90,
        createdAt: this.p.millis(),
      };
      this.particles.push(particle);
    }
    this.trimParticles();
  }

  spawnPillar(x: number, y: number, color: string): void {
    this.pillars.push({
      x,
      y,
      color,
      progress: 0,
      duration: 180,
      createdAt: this.p.millis(),
    });
  }

  update(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= 1 / p.maxLife;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.pillars.length - 1; i >= 0; i--) {
      const pillar = this.pillars[i];
      pillar.progress += 1 / pillar.duration;
      if (pillar.progress >= 1) {
        this.pillars.splice(i, 1);
      }
    }
  }

  render(): void {
    const p = this.p;

    for (const particle of this.particles) {
      const alpha = Math.max(0, particle.life);
      p.push();
      p.noStroke();
      p.drawingContext.shadowBlur = 10;
      p.drawingContext.shadowColor = particle.color;
      p.fill(this.hexToRgba(particle.color, alpha));
      p.ellipse(particle.x, particle.y, particle.size, particle.size);
      p.pop();
    }

    for (const pillar of this.pillars) {
      const t = pillar.progress;
      const growPhase = Math.min(1, t * 3);
      const height = this.PILLAR_HEIGHT * growPhase;
      const flicker = 0.7 + 0.3 * Math.sin(t * 30);
      const alpha = t < 0.9 ? 1 : (1 - t) * 10;

      p.push();
      p.noStroke();
      p.drawingContext.shadowBlur = 20;
      p.drawingContext.shadowColor = pillar.color;
      p.fill(this.hexToRgba(pillar.color, alpha * flicker));
      p.rectMode(p.CENTER);
      p.rect(pillar.x, pillar.y - height / 2, this.PILLAR_WIDTH, height);
      p.pop();
    }
  }

  private trimParticles(): void {
    while (this.particles.length > this.MAX_PARTICLES) {
      this.particles.shift();
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  clear(): void {
    this.particles = [];
    this.pillars = [];
  }
}
