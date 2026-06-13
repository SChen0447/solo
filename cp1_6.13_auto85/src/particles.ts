export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'flame' | 'explosion' | 'crystalTrail';
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 200;

  constructor() {}

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.type === 'flame') {
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.size *= 0.99;
      } else if (p.type === 'explosion') {
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.size *= 0.97;
      }

      if (p.life <= 0 || p.size <= 0.5) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;

      if (p.type === 'flame') {
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'explosion') {
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.life * 5);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      } else if (p.type === 'crystalTrail') {
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        gradient.addColorStop(0, '#ffd700');
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  emitFlame(x: number, y: number, angle: number, speed: number): void {
    const count = Math.min(Math.floor(speed / 2) + 1, 8);
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const spread = 0.4 + Math.random() * 0.3;
      const a = angle + (Math.random() - 0.5) * spread;
      const particleSpeed = 80 + Math.random() * 120 + speed * 5;

      const speedRatio = Math.min(speed / 15, 1);
      const r = Math.floor(100 + speedRatio * 155);
      const g = Math.floor(180 - speedRatio * 100);
      const b = Math.floor(255 - speedRatio * 155);
      const color = `rgb(${r}, ${g}, ${b})`;

      this.particles.push({
        x: x + Math.cos(angle) * 15,
        y: y + Math.sin(angle) * 15,
        vx: -Math.cos(a) * particleSpeed + (Math.random() - 0.5) * 30,
        vy: -Math.sin(a) * particleSpeed + (Math.random() - 0.5) * 30,
        life: 0.3 + Math.random() * 0.4,
        maxLife: 0.7,
        size: 3 + Math.random() * 5 + speed * 0.2,
        color,
        type: 'flame'
      });
    }
  }

  emitExplosion(x: number, y: number, count: number = 30): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 100 + Math.random() * 200;
      const colors = ['#ff6600', '#ffaa00', '#ff4400', '#cc3300', '#ff8800'];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0 + Math.random() * 0.5,
        maxLife: 1.5,
        size: 4 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: 'explosion'
      });
    }
  }

  emitCrystalTrail(x: number, y: number): void {
    if (this.particles.length >= this.maxParticles) return;

    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 20,
      life: 0.3,
      maxLife: 0.3,
      size: 6 + Math.random() * 4,
      color: '#ffd700',
      type: 'crystalTrail'
    });
  }

  getFlameCount(): number {
    return this.particles.filter(p => p.type === 'flame').length;
  }

  getTotalCount(): number {
    return this.particles.length;
  }

  clear(): void {
    this.particles = [];
  }
}
