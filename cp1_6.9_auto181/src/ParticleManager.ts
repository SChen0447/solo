import type { Point, Trail, Particle } from './types';
import { COLOR_PALETTE, MAX_PARTICLES } from './types';

export class ParticleManager {
  private particles: Particle[] = [];

  getParticles(): Particle[] {
    return this.particles;
  }

  spawnRippleParticles(point: Point, trailColor: string, speed: number, trailPoints: Point[]): void {
    const count = this.getParticleCount(speed);
    const pointIndex = trailPoints.indexOf(point);
    let nx = 0;
    let ny = 0;

    if (pointIndex > 0 && pointIndex < trailPoints.length - 1) {
      const prev = trailPoints[pointIndex - 1];
      const next = trailPoints[pointIndex + 1];
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      nx = -dy / len;
      ny = dx / len;
    } else {
      const angle = Math.random() * Math.PI * 2;
      nx = Math.cos(angle);
      ny = Math.sin(angle);
    }

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) {
        this.particles.shift();
      }

      const spreadFactor = (Math.random() - 0.5) * 2;
      const baseSpeed = 0.5 + Math.random() * 1.5;
      const speedMultiplier = 0.5 + (speed / 100) * 2.5;

      this.particles.push({
        x: point.x,
        y: point.y,
        vx: (nx * spreadFactor + (Math.random() - 0.5)) * baseSpeed * speedMultiplier,
        vy: (ny * spreadFactor + (Math.random() - 0.5)) * baseSpeed * speedMultiplier,
        color: Math.random() > 0.5 ? trailColor : COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)],
        size: 3 + Math.random() * 5,
        alpha: 0.8 + Math.random() * 0.2,
        life: 1,
        maxLife: 0.6 + Math.random() * 0.8
      });
    }
  }

  spawnFadeParticles(trail: Trail): void {
    const points = trail.points;
    const step = Math.max(1, Math.floor(points.length / 30));

    for (let i = 0; i < points.length; i += step) {
      const point = points[i];
      const count = 8;

      for (let j = 0; j < count; j++) {
        if (this.particles.length >= MAX_PARTICLES) {
          this.particles.shift();
        }

        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;

        this.particles.push({
          x: point.x,
          y: point.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: trail.color,
          size: 4 + Math.random() * 6,
          alpha: 1,
          life: 1,
          maxLife: 2
        });
      }
    }
  }

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= deltaTime / (p.maxLife * 1000);
      p.alpha = Math.max(0, p.life);

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  clearAll(): void {
    this.particles = [];
  }

  private getParticleCount(speed: number): number {
    const normalizedSpeed = Math.max(0, Math.min(100, speed)) / 100;
    return Math.round(5 + normalizedSpeed * 25);
  }
}
