export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  type: 'spark' | 'bubble';
  trail: Array<{ x: number; y: number }>;
  active: boolean;
}

const MAX_PARTICLES = 300;
const TRAIL_LENGTH = 5;

export class ParticleSystem {
  private pool: Particle[] = [];
  private activeParticles: Particle[] = [];

  constructor() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.pool.push(this.createEmptyParticle());
    }
  }

  private createEmptyParticle(): Particle {
    return {
      x: 0, y: 0,
      vx: 0, vy: 0,
      size: 0,
      life: 0, maxLife: 0,
      color: '',
      type: 'spark',
      trail: [],
      active: false,
    };
  }

  private acquire(): Particle | null {
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) {
        this.pool[i].active = true;
        this.pool[i].trail.length = 0;
        this.activeParticles.push(this.pool[i]);
        return this.pool[i];
      }
    }
    return null;
  }

  private recycle(p: Particle): void {
    p.active = false;
    p.trail.length = 0;
    const idx = this.activeParticles.indexOf(p);
    if (idx !== -1) {
      this.activeParticles.splice(idx, 1);
    }
  }

  emitSpark(originX: number, originY: number, count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.activeParticles.length >= MAX_PARTICLES) break;
      const p = this.acquire();
      if (!p) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      const edgeOffset = 20 + Math.random() * 30;
      const edgeAngle = Math.random() * Math.PI * 2;

      p.type = 'spark';
      p.x = originX + Math.cos(edgeAngle) * edgeOffset * 0.5;
      p.y = originY + Math.sin(edgeAngle) * edgeOffset * 0.5;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 30;
      p.size = 3 + Math.random() * 3;
      p.maxLife = 0.35 + Math.random() * 0.1;
      p.life = p.maxLife;
      p.color = this.randomSparkColor();
      p.trail.length = 0;
    }
  }

  emitBubble(originX: number, originY: number, count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.activeParticles.length >= MAX_PARTICLES) break;
      const p = this.acquire();
      if (!p) break;

      p.type = 'bubble';
      p.x = originX + (Math.random() - 0.5) * 60;
      p.y = originY + Math.random() * 20;
      p.vx = (Math.random() - 0.5) * 15;
      p.vy = -(30 + Math.random() * 50);
      p.size = 4 + Math.random() * 10;
      p.maxLife = 0.8 + Math.random() * 0.5;
      p.life = p.maxLife;
      p.color = 'rgba(255, 255, 255, 0.7)';
      p.trail.length = 0;
    }
  }

  private randomSparkColor(): string {
    const r = 255;
    const g = 180 + Math.floor(Math.random() * 75);
    const b = Math.floor(Math.random() * 100);
    return `rgb(${r}, ${g}, ${b})`;
  }

  update(dt: number): void {
    const gravity = 180;
    const toRecycle: Particle[] = [];

    for (let i = 0; i < this.activeParticles.length; i++) {
      const p = this.activeParticles[i];

      if (p.trail.length >= TRAIL_LENGTH) {
        p.trail.shift();
      }
      p.trail.push({ x: p.x, y: p.y });

      p.life -= dt;
      if (p.life <= 0) {
        toRecycle.push(p);
        continue;
      }

      if (p.type === 'spark') {
        p.vy += gravity * dt;
        p.vx *= 1 - 0.8 * dt;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.type === 'bubble') {
        p.size += 8 * dt;
      }
    }

    for (let i = 0; i < toRecycle.length; i++) {
      this.recycle(toRecycle[i]);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.activeParticles.length; i++) {
      const p = this.activeParticles[i];
      const lifeRatio = p.life / p.maxLife;

      if (p.type === 'spark') {
        this.renderSpark(ctx, p, lifeRatio);
      } else {
        this.renderBubble(ctx, p, lifeRatio);
      }
    }
  }

  private renderSpark(ctx: CanvasRenderingContext2D, p: Particle, lifeRatio: number): void {
    if (p.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(p.trail[0].x, p.trail[0].y);
      for (let i = 1; i < p.trail.length; i++) {
        ctx.lineTo(p.trail[i].x, p.trail[i].y);
      }
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = this.alphaColor(p.color, lifeRatio * 0.6);
      ctx.lineWidth = p.size * lifeRatio;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * lifeRatio * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = this.alphaColor(p.color, lifeRatio);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * lifeRatio * 1.8, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * lifeRatio * 1.8);
    grad.addColorStop(0, this.alphaColor(p.color, lifeRatio * 0.5));
    grad.addColorStop(1, this.alphaColor(p.color, 0));
    ctx.fillStyle = grad;
    ctx.fill();
  }

  private renderBubble(ctx: CanvasRenderingContext2D, p: Particle, lifeRatio: number): void {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${lifeRatio * 0.4})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${lifeRatio * 0.8})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(200, 230, 255, ${lifeRatio * 0.5})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private alphaColor(rgbStr: string, alpha: number): string {
    const match = rgbStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
    }
    return rgbStr;
  }

  reset(): void {
    while (this.activeParticles.length > 0) {
      this.recycle(this.activeParticles[0]);
    }
  }

  getActiveCount(): number {
    return this.activeParticles.length;
  }
}
