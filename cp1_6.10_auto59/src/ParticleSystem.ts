export type ParticleType = 'brick' | 'ring' | 'confetti';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: ParticleType;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private readonly MAX_PARTICLES = 100;
  private lowPerformance = false;
  private particlePool: Particle[] = [];

  setLowPerformance(low: boolean): void {
    this.lowPerformance = low;
  }

  private acquireParticle(): Particle | null {
    if (this.particles.length >= this.MAX_PARTICLES) {
      return null;
    }
    if (this.particlePool.length > 0) {
      return this.particlePool.pop()!;
    }
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      color: '#ffffff',
      size: 1,
      type: 'brick'
    };
  }

  private releaseParticle(p: Particle): void {
    this.particlePool.push(p);
  }

  createBrickParticles(x: number, y: number, color: string): void {
    const count = this.lowPerformance ? 5 : 10;
    for (let i = 0; i < count; i++) {
      const p = this.acquireParticle();
      if (!p) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 0.8;
      p.maxLife = 0.8;
      p.color = color;
      p.size = 2 + Math.random() * 3;
      p.type = 'brick';
      this.particles.push(p);
    }
  }

  createBounceRing(x: number, y: number): void {
    const count = this.lowPerformance ? 2 : 3;
    for (let i = 0; i < count; i++) {
      const p = this.acquireParticle();
      if (!p) break;
      p.x = x;
      p.y = y;
      p.vx = 0;
      p.vy = 0;
      p.life = 0.5;
      p.maxLife = 0.5;
      p.color = '#4facfe';
      p.size = 5 + i * 10;
      p.type = 'ring';
      this.particles.push(p);
    }
  }

  createVictoryParticles(centerX: number, centerY: number): void {
    const colors = ['#ff4757', '#ffa502', '#ffd700', '#2ed573', '#1e90ff', '#5352ed', '#ff6b81'];
    const count = this.lowPerformance ? 40 : 80;
    for (let i = 0; i < count; i++) {
      const p = this.acquireParticle();
      if (!p) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      p.x = centerX;
      p.y = centerY;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 2;
      p.life = 3;
      p.maxLife = 3;
      p.color = colors[Math.floor(Math.random() * colors.length)];
      p.size = 3 + Math.random() * 4;
      p.type = 'confetti';
      this.particles.push(p);
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        this.releaseParticle(p);
        continue;
      }

      if (p.type === 'confetti') {
        p.vy += 0.1;
      }

      p.x += p.vx;
      p.y += p.vy;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;

      if (p.type === 'ring') {
        const currentRadius = p.size + (1 - alpha) * 30;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        if (p.type === 'confetti') {
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size * 1.5);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }
  }

  clear(): void {
    for (const p of this.particles) {
      this.particlePool.push(p);
    }
    this.particles.length = 0;
  }

  getCount(): number {
    return this.particles.length;
  }
}
