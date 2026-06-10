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

export const PAGE_PALETTE: string[] = [
  '#ff6688',
  '#ffaa33',
  '#88ddff',
  '#cc88ff',
  '#66ff99',
  '#ff66cc',
  '#88aaff',
  '#ffee66'
];

export const NEBULA_COLORS: string[] = [
  '#ff88cc',
  '#88ddff',
  '#ffaa00'
];

export class ParticleSystem {
  private p: p5;
  private particles: Particle[] = [];
  private readonly MAX_PARTICLES = 800;

  constructor(p: p5) {
    this.p = p;
  }

  emitPageParticles(
    x: number,
    y: number,
    directionX: number,
    directionY: number,
    speedFactor: number
  ): void {
    const count = this.p.floor(this.p.random(100, 151));
    for (let i = 0; i < count && this.particles.length < this.MAX_PARTICLES; i++) {
      const angle = this.p.atan2(directionY, directionX) + this.p.random(-0.8, 0.8);
      const speed = this.p.random(1, 4) * (0.5 + speedFactor * 1.5);
      this.particles.push({
        x: x + this.p.random(-10, 10),
        y: y + this.p.random(-10, 10),
        vx: this.p.cos(angle) * speed,
        vy: this.p.sin(angle) * speed,
        size: this.p.random(3, 6),
        color: this.p.random(PAGE_PALETTE),
        life: this.p.random(500, 1000),
        maxLife: 1000
      });
    }
  }

  emitNebulaBurst(x: number, y: number): void {
    const count = 300;
    for (let i = 0; i < count && this.particles.length < this.MAX_PARTICLES; i++) {
      const angle = this.p.random(0, this.p.TWO_PI);
      const speed = this.p.random(2, 6);
      const t = i / count;
      let color: string;
      if (t < 0.33) {
        color = NEBULA_COLORS[0];
      } else if (t < 0.66) {
        color = NEBULA_COLORS[1];
      } else {
        color = NEBULA_COLORS[2];
      }
      this.particles.push({
        x,
        y,
        vx: this.p.cos(angle) * speed,
        vy: this.p.sin(angle) * speed,
        size: this.p.random(8, 12),
        color,
        life: this.p.random(2000, 3000),
        maxLife: 3000
      });
    }
  }

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * (deltaTime / 16.67);
      p.y += p.vy * (deltaTime / 16.67);
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.vy += 0.01;
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(): void {
    const p = this.p;
    p.noStroke();
    for (const particle of this.particles) {
      const alpha = p.constrain(particle.life / particle.maxLife, 0, 1);
      p.drawingContext.save();
      p.drawingContext.globalAlpha = alpha;
      p.fill(particle.color);
      p.ellipse(particle.x, particle.y, particle.size, particle.size);
      p.drawingContext.shadowBlur = particle.size * 2;
      p.drawingContext.shadowColor = particle.color;
      p.drawingContext.restore();
    }
  }

  getCount(): number {
    return this.particles.length;
  }

  clear(): void {
    this.particles = [];
  }
}
