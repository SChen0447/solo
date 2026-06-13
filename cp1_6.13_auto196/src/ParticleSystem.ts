export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'spark' | 'star' | 'stardust' | 'trail' | 'shockwave' | 'hexstar' | 'rainbow' | 'note' | 'afterimage';
  rotation?: number;
  rotationSpeed?: number;
  alpha?: number;
  radius?: number;
  startRadius?: number;
  endRadius?: number;
  thickness?: number;
  points?: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private pool: Particle[] = [];
  private maxPoolSize = 500;

  spawn(particle: Partial<Particle> & Pick<Particle, 'x' | 'y' | 'type'>): void {
    let p: Particle;
    if (this.pool.length > 0) {
      p = this.pool.pop()!;
    } else if (this.particles.length < this.maxPoolSize) {
      p = {} as Particle;
    } else {
      return;
    }
    Object.assign(p, {
      vx: 0,
      vy: 0,
      life: 1,
      maxLife: 1,
      size: 2,
      color: '#ffffff',
      alpha: 1,
      rotation: 0,
      rotationSpeed: 0,
      ...particle
    });
    this.particles.push(p);
  }

  spawnSparks(x: number, y: number, count: number, color: string = '#ffaa00'): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 120;
      this.spawn({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1,
        size: 2 + Math.random() * 3,
        color,
        type: 'spark'
      });
    }
  }

  spawnHexStars(x: number, y: number, count: number): void {
    const colors = ['#ff3366', '#33ff66', '#66ccff', '#ffcc00', '#ff66ff'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 150;
      this.spawn({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8,
        maxLife: 0.8,
        size: 8 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: 'hexstar',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 8,
        points: 6
      });
    }
  }

  spawnStarDust(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      this.spawn({
        x: x + (Math.random() - 0.5) * 200,
        y: y + (Math.random() - 0.5) * 50,
        vx: (Math.random() - 0.5) * 20,
        vy: 30 + Math.random() * 20,
        life: 2,
        maxLife: 2,
        size: 2 + Math.random() * 2,
        color: '#ffcc00',
        type: 'stardust'
      });
    }
  }

  spawnMicroStars(x: number, y: number, count: number): void {
    const colors = ['#ff3366', '#33ff66', '#66ccff', '#ffcc00', '#ff66ff', '#ffffff', '#00ffff'];
    for (let i = 0; i < count; i++) {
      this.spawn({
        x: x + (Math.random() - 0.5) * 400,
        y: y - 100 - Math.random() * 50,
        vx: (Math.random() - 0.5) * 15,
        vy: 30,
        life: 1.5,
        maxLife: 1.5,
        size: 2 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: 'star'
      });
    }
  }

  spawnRainbow(centerX: number, centerY: number, radius: number): void {
    this.spawn({
      x: centerX,
      y: centerY,
      radius,
      startRadius: radius,
      endRadius: radius,
      life: 2,
      maxLife: 2,
      type: 'rainbow',
      thickness: 4
    });
  }

  spawnShockwave(x: number, y: number, maxRadius: number): void {
    this.spawn({
      x, y,
      startRadius: 0,
      endRadius: maxRadius,
      radius: 0,
      life: 1,
      maxLife: 1,
      type: 'shockwave',
      color: '#ff3366',
      thickness: 6
    });
  }

  spawnTrail(x1: number, y1: number, x2: number, y2: number): void {
    const segments = 8;
    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      this.spawn({
        x: x1 + (x2 - x1) * t,
        y: y1 + (y2 - y1) * t,
        life: 0.3,
        maxLife: 0.3,
        size: 4,
        color: '#ffffff',
        type: 'trail'
      });
    }
  }

  spawnAfterimage(x: number, y: number, rotation: number, alpha: number): void {
    this.spawn({
      x, y,
      life: 0.3,
      maxLife: 0.3,
      alpha,
      rotation,
      type: 'afterimage'
    });
  }

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        if (this.pool.length < this.maxPoolSize) {
          this.pool.push(p);
        }
        continue;
      }

      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.vy += 50 * deltaTime;

      if (p.rotationSpeed) {
        p.rotation = (p.rotation || 0) + p.rotationSpeed * deltaTime;
      }

      if (p.type === 'shockwave') {
        const t = 1 - p.life / p.maxLife;
        p.radius = (p.startRadius || 0) + ((p.endRadius || 0) - (p.startRadius || 0)) * t;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, renderAfterimage?: (ctx: CanvasRenderingContext2D, p: Particle) => void): void {
    for (const p of this.particles) {
      const lifeRatio = p.life / p.maxLife;
      ctx.save();

      switch (p.type) {
        case 'spark':
          this.renderSpark(ctx, p, lifeRatio);
          break;
        case 'star':
        case 'stardust':
          this.renderStar(ctx, p, lifeRatio);
          break;
        case 'hexstar':
          this.renderHexStar(ctx, p, lifeRatio);
          break;
        case 'trail':
          this.renderTrail(ctx, p, lifeRatio);
          break;
        case 'shockwave':
          this.renderShockwave(ctx, p, lifeRatio);
          break;
        case 'rainbow':
          this.renderRainbow(ctx, p, lifeRatio);
          break;
        case 'afterimage':
          if (renderAfterimage) {
            renderAfterimage(ctx, p);
          }
          break;
      }
      ctx.restore();
    }
  }

  private renderSpark(ctx: CanvasRenderingContext2D, p: Particle, lifeRatio: number): void {
    const alpha = lifeRatio;
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
    gradient.addColorStop(0, p.color);
    gradient.addColorStop(0.4, this.withAlpha(p.color, alpha * 0.6));
    gradient.addColorStop(1, this.withAlpha(p.color, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderStar(ctx: CanvasRenderingContext2D, p: Particle, lifeRatio: number): void {
    const alpha = p.type === 'stardust' ? lifeRatio : (lifeRatio > 0.5 ? 1 : lifeRatio * 2);
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = p.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderHexStar(ctx: CanvasRenderingContext2D, p: Particle, lifeRatio: number): void {
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation || 0);
    ctx.globalAlpha = lifeRatio;
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 15;
    ctx.shadowColor = p.color;
    const outerR = p.size;
    const innerR = p.size * 0.4;
    const points = 6;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = (i * Math.PI) / points - Math.PI / 2;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private renderTrail(ctx: CanvasRenderingContext2D, p: Particle, lifeRatio: number): void {
    ctx.globalAlpha = lifeRatio;
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderShockwave(ctx: CanvasRenderingContext2D, p: Particle, lifeRatio: number): void {
    const alpha = lifeRatio;
    const r = p.radius || 0;
    const gradient = ctx.createRadialGradient(p.x, p.y, Math.max(0, r - 20), p.x, p.y, r);
    gradient.addColorStop(0, `rgba(255, 51, 102, 0)`);
    gradient.addColorStop(0.5, `rgba(255, 51, 102, ${alpha * 0.5})`);
    gradient.addColorStop(1, `rgba(255, 51, 102, ${alpha})`);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = p.thickness || 6;
    ctx.shadowBlur = 30;
    ctx.shadowColor = `rgba(255, 51, 102, ${alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  private renderRainbow(ctx: CanvasRenderingContext2D, p: Particle, lifeRatio: number): void {
    ctx.globalAlpha = lifeRatio;
    const colors = ['#ff0000', '#ff8800', '#ffee00', '#00ff00', '#00ccff', '#6633ff', '#cc00ff'];
    const r = p.radius || 200;
    for (let i = 0; i < colors.length; i++) {
      ctx.strokeStyle = colors[i];
      ctx.lineWidth = p.thickness || 4;
      ctx.shadowBlur = 10;
      ctx.shadowColor = colors[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, r - i * 6, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
  }

  private withAlpha(hex: string, alpha: number): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  clear(): void {
    this.pool.push(...this.particles);
    this.particles = [];
  }
}
