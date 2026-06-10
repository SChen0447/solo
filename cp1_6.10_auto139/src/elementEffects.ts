import { RuneType, RUNE_COLORS } from './frenShapes.js';

export interface Point {
  x: number;
  y: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'fire' | 'water' | 'wind' | 'earth';
  angle?: number;
  radius?: number;
  startRadius?: number;
  endRadius?: number;
  ringAlpha?: number;
  originX?: number;
  originY?: number;
}

export class ParticleSystem {
  particles: Particle[] = [];

  spawnFireEffect(center: Point): void {
    const rayCount = 8;
    for (let r = 0; r < rayCount; r++) {
      const baseAngle = (r / rayCount) * Math.PI * 2;
      const particlesPerRay = 6;
      for (let i = 0; i < particlesPerRay; i++) {
        const spread = (Math.random() - 0.5) * 0.4;
        const angle = baseAngle + spread;
        const speed = 80 + Math.random() * 120;
        const colorT = Math.random();
        const r1 = parseInt('#ff4500'.slice(1, 3), 16);
        const g1 = parseInt('#ff4500'.slice(3, 5), 16);
        const b1 = parseInt('#ff4500'.slice(5, 7), 16);
        const r2 = parseInt('#ffd700'.slice(1, 3), 16);
        const g2 = parseInt('#ffd700'.slice(3, 5), 16);
        const b2 = parseInt('#ffd700'.slice(5, 7), 16);
        const cr = Math.round(r1 + (r2 - r1) * colorT);
        const cg = Math.round(g1 + (g2 - g1) * colorT);
        const cb = Math.round(b1 + (b2 - b1) * colorT);
        this.particles.push({
          x: center.x,
          y: center.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.8,
          maxLife: 0.8,
          color: `rgb(${cr},${cg},${cb})`,
          size: 4 + Math.random() * 6,
          type: 'fire',
        });
      }
    }
  }

  spawnWaterEffect(center: Point): void {
    const rings = 3;
    for (let r = 0; r < rings; r++) {
      this.particles.push({
        x: center.x,
        y: center.y,
        vx: 0,
        vy: 0,
        life: 1.0,
        maxLife: 1.0,
        color: RUNE_COLORS[RuneType.WATER],
        size: 2,
        type: 'water',
        startRadius: 10,
        endRadius: 120,
        ringAlpha: 1,
      });
    }
  }

  spawnWindEffect(center: Point): void {
    const particleCount = 10;
    for (let i = 0; i < particleCount; i++) {
      const startAngle = Math.random() * Math.PI * 2;
      const startRadius = 10 + Math.random() * 20;
      this.particles.push({
        x: center.x + Math.cos(startAngle) * startRadius,
        y: center.y + Math.sin(startAngle) * startRadius,
        vx: 0,
        vy: 0,
        life: 0.6,
        maxLife: 0.6,
        color: RUNE_COLORS[RuneType.WIND],
        size: 4 + Math.random() * 4,
        type: 'wind',
        angle: startAngle,
        radius: startRadius,
        originX: center.x,
        originY: center.y,
      });
    }
  }

  spawnEarthEffect(center: Point): void {
    this.particles.push({
      x: center.x,
      y: center.y,
      vx: 0,
      vy: 0,
      life: 0.9,
      maxLife: 0.9,
      color: RUNE_COLORS[RuneType.EARTH],
      size: 4,
      type: 'earth',
      startRadius: 80,
      endRadius: 0,
      ringAlpha: 1,
    });
  }

  spawnEffect(type: RuneType, center: Point): void {
    switch (type) {
      case RuneType.FIRE:
        this.spawnFireEffect(center);
        break;
      case RuneType.WATER:
        this.spawnWaterEffect(center);
        break;
      case RuneType.WIND:
        this.spawnWindEffect(center);
        break;
      case RuneType.EARTH:
        this.spawnEarthEffect(center);
        break;
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      const lifeT = 1 - p.life / p.maxLife;

      switch (p.type) {
        case 'fire':
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.96;
          p.vy *= 0.96;
          p.vy -= 30 * dt;
          break;
        case 'water':
          p.ringAlpha = 1 - lifeT;
          break;
        case 'wind': {
          const riseAmount = lifeT * 120;
          const spiralTightness = 1.5;
          const currentRadius = (p.radius ?? 20) * (1 - lifeT * 0.7);
          const currentAngle = (p.angle ?? 0) + lifeT * Math.PI * 2 * spiralTightness;
          const originX = p.originX ?? 0;
          const originY = (p.originY ?? 0) - riseAmount;
          p.x = originX + Math.cos(currentAngle) * currentRadius;
          p.y = originY + Math.sin(currentAngle) * currentRadius;
          break;
        }
        case 'earth':
          p.ringAlpha = 1 - lifeT * 0.3;
          break;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);

      switch (p.type) {
        case 'fire': {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'water': {
          const waterT = 1 - p.life / p.maxLife;
          const radius = (p.startRadius ?? 10) + ((p.endRadius ?? 120) - (p.startRadius ?? 10)) * waterT;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 3;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 12;
          ctx.globalAlpha = Math.max(0, p.ringAlpha ?? alpha);
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 'wind': {
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (0.5 + alpha * 0.5), 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'earth': {
          const earthT = 1 - p.life / p.maxLife;
          const radius = (p.startRadius ?? 80) + ((p.endRadius ?? 0) - (p.startRadius ?? 80)) * earthT;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 5;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 15;
          ctx.globalAlpha = Math.max(0, p.ringAlpha ?? alpha);
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0, radius), 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
      }
      ctx.restore();
    }
  }

  clear(): void {
    this.particles = [];
  }
}
