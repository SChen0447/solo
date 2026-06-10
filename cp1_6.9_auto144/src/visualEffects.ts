import p5 from 'p5';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface ExplosionConfig {
  x: number;
  y: number;
  particleColors: string[];
  glowColor: string;
}

export class VisualEffects {
  private p: p5;
  private particles: Particle[] = [];
  private flashAlpha: number = 0;
  private flashColor: string = '#ffffff';
  private readonly MAX_PARTICLES: number = 60;
  private readonly PARTICLE_LIFE: number = 90;
  private readonly FLASH_DURATION: number = 18;

  constructor(p: p5) {
    this.p = p;
  }

  triggerExplosion(config: ExplosionConfig): void {
    const particleCount = this.p.random(30, 51);
    const availableSlots = this.MAX_PARTICLES - this.particles.length;
    const countToAdd = Math.min(Math.floor(particleCount), availableSlots);

    for (let i = 0; i < countToAdd; i++) {
      const angle = this.p.random(0, this.p.TWO_PI);
      const speed = this.p.random(1, 3);
      const colorIndex = Math.floor(this.p.random(0, config.particleColors.length));
      this.particles.push({
        x: config.x,
        y: config.y,
        vx: this.p.cos(angle) * speed,
        vy: this.p.sin(angle) * speed,
        size: this.p.random(3, 8),
        color: config.particleColors[colorIndex],
        life: this.PARTICLE_LIFE,
        maxLife: this.PARTICLE_LIFE
      });
    }

    this.flashColor = config.glowColor;
    this.flashAlpha = this.FLASH_DURATION;
  }

  update(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life--;
      if (particle.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    if (this.flashAlpha > 0) {
      this.flashAlpha--;
    }
  }

  render(): void {
    const p = this.p;

    if (this.flashAlpha > 0) {
      const alpha = (this.flashAlpha / this.FLASH_DURATION) * 120;
      p.noStroke();
      p.fill(this.hexToRgba(this.flashColor, alpha));
      p.rect(0, 0, p.width, p.height);
    }

    for (const particle of this.particles) {
      const alpha = (particle.life / particle.maxLife) * 255;
      p.noStroke();
      p.fill(this.hexToRgba(particle.color, alpha));
      p.ellipse(particle.x, particle.y, particle.size, particle.size);
    }
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  private hexToRgba(hex: string, alpha: number): p5.Color {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return this.p.color(r, g, b, alpha);
  }
}
