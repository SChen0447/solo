export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  initialSize: number;
  color: string;
  colorStart: string;
  colorEnd: string;
  type: 'explosion' | 'engine' | 'shield' | 'boundary' | 'star';
  angle: number;
  speed: number;
  alive: boolean;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

export class EffectSystem {
  private particles: Particle[] = [];
  private readonly maxParticles: number = 500;
  public stars: Star[] = [];
  private boundaryParticles: Particle[] = [];
  private readonly boundaryParticleCount: number = 120;
  private canvasWidth: number = 1200;
  private canvasHeight: number = 800;
  private shieldFlashPlayer: number = 0;
  private shieldFlashAI: number = 0;

  public init(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.initStars();
    this.initBoundaryParticles();
  }

  private initStars(): void {
    this.stars = [];
    for (let i = 0; i < 200; i++) {
      this.stars.push({
        x: Math.random() * this.canvasWidth,
        y: Math.random() * this.canvasHeight,
        size: 1 + Math.random() * 2,
        alpha: 0.3 + Math.random() * 0.5,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  private initBoundaryParticles(): void {
    this.boundaryParticles = [];
    const perimeter = 2 * (this.canvasWidth + this.canvasHeight);
    for (let i = 0; i < this.boundaryParticleCount; i++) {
      const pos = (i / this.boundaryParticleCount) * perimeter;
      const { x, y, angle } = this.getBoundaryPosition(pos);
      this.boundaryParticles.push({
        x,
        y,
        vx: 0,
        vy: 0,
        life: Infinity,
        maxLife: Infinity,
        size: 2,
        initialSize: 2,
        color: '#66ffff',
        colorStart: '#66ffff',
        colorEnd: '#3366ff',
        type: 'boundary',
        angle,
        speed: 0.5,
        alive: true,
      });
    }
  }

  private getBoundaryPosition(pos: number): { x: number; y: number; angle: number } {
    const w = this.canvasWidth;
    const h = this.canvasHeight;
    if (pos < w) {
      return { x: pos, y: 0, angle: 0 };
    } else if (pos < w + h) {
      return { x: w, y: pos - w, angle: Math.PI / 2 };
    } else if (pos < 2 * w + h) {
      return { x: 2 * w + h - pos, y: h, angle: Math.PI };
    } else {
      return { x: 0, y: 2 * (w + h) - pos, angle: -Math.PI / 2 };
    }
  }

  public spawnEngineParticle(x: number, y: number, rotation: number): void {
    if (this.particles.length >= this.maxParticles) return;

    const spread = 0.3;
    const angle = rotation + Math.PI + (Math.random() - 0.5) * spread;
    const speed = 0.5 + Math.random() * 1.5;

    this.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 300,
      maxLife: 300,
      size: 4,
      initialSize: 4,
      color: '#ff6600',
      colorStart: '#ff3300',
      colorEnd: '#ffaa00',
      type: 'engine',
      angle,
      speed,
      alive: true,
    });
  }

  public spawnExplosion(
    x: number,
    y: number,
    count: number,
    isBig: boolean = false
  ): void {
    const minSpeed = isBig ? 4 : 2;
    const maxSpeed = isBig ? 10 : 6;
    const life = isBig ? 2000 : 1500;
    const startSize = isBig ? 8 : 6;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size: startSize,
        initialSize: startSize,
        color: isBig ? '#ffffff' : '#ffff00',
        colorStart: isBig ? '#ffffff' : '#ffff00',
        colorEnd: isBig ? '#ff0000' : '#ff3300',
        type: 'explosion',
        angle,
        speed,
        alive: true,
      });
    }
  }

  public triggerShieldFlash(owner: 'player' | 'ai'): void {
    if (owner === 'player') {
      this.shieldFlashPlayer = 300;
    } else {
      this.shieldFlashAI = 300;
    }
  }

  public update(
    deltaTime: number,
    ships: Array<{ x: number; y: number }>,
    bulletPositions: Array<{ x: number; y: number }>
  ): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p.alive) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx;
      p.y += p.vy;
      p.life -= deltaTime;

      if (p.type === 'explosion') {
        p.vx *= 0.98;
        p.vy *= 0.98;
      }

      const lifeRatio = p.life / p.maxLife;
      p.size = p.initialSize * lifeRatio;

      if (p.life <= 0) {
        p.alive = false;
      }
    }

    this.updateBoundaryParticles(deltaTime, ships, bulletPositions);

    if (this.shieldFlashPlayer > 0) this.shieldFlashPlayer -= deltaTime;
    if (this.shieldFlashAI > 0) this.shieldFlashAI -= deltaTime;
  }

  private updateBoundaryParticles(
    deltaTime: number,
    ships: Array<{ x: number; y: number }>,
    bulletPositions: Array<{ x: number; y: number }>
  ): void {
    const perimeter = 2 * (this.canvasWidth + this.canvasHeight);

    for (const p of this.boundaryParticles) {
      p.x += Math.cos(p.angle) * p.speed;
      p.y += Math.sin(p.angle) * p.speed;

      if (p.x < 0) {
        p.x = 0;
        p.y = Math.max(0, Math.min(this.canvasHeight, p.y));
        p.angle = p.y < this.canvasHeight / 2 ? Math.PI / 2 : -Math.PI / 2;
      } else if (p.x > this.canvasWidth) {
        p.x = this.canvasWidth;
        p.angle = p.y < this.canvasHeight / 2 ? -Math.PI / 2 : Math.PI / 2;
      }
      if (p.y < 0) {
        p.y = 0;
        p.angle = p.x < this.canvasWidth / 2 ? 0 : Math.PI;
      } else if (p.y > this.canvasHeight) {
        p.y = this.canvasHeight;
        p.angle = p.x < this.canvasWidth / 2 ? Math.PI : 0;
      }

      let nearDanger = false;
      for (const s of ships) {
        const dx = p.x - s.x;
        const dy = p.y - s.y;
        if (Math.sqrt(dx * dx + dy * dy) < 50) {
          nearDanger = true;
          break;
        }
      }
      if (!nearDanger) {
        for (const b of bulletPositions) {
          const dx = p.x - b.x;
          const dy = p.y - b.y;
          if (Math.sqrt(dx * dx + dy * dy) < 30) {
            nearDanger = true;
            break;
          }
        }
      }

      const flashInterval = nearDanger ? 200 : 500;
      const flashPhase = (performance.now() % flashInterval) / flashInterval;
      const baseAlpha = nearDanger ? 1.0 : 0.7;
      (p as any)._alpha = baseAlpha * (0.5 + 0.5 * Math.sin(flashPhase * Math.PI * 2));
    }
  }

  public draw(ctx: CanvasRenderingContext2D, time: number): void {
    this.drawStars(ctx, time);
    this.drawBoundaryParticles(ctx);
    this.drawParticles(ctx);
  }

  private drawStars(ctx: CanvasRenderingContext2D, time: number): void {
    for (const star of this.stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(time * star.twinkleSpeed * 0.002 + star.twinkleOffset);
      const alpha = star.alpha * (0.5 + 0.5 * twinkle);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawBoundaryParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.boundaryParticles) {
      const alpha = (p as any)._alpha !== undefined ? (p as any)._alpha : 0.7;
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
      gradient.addColorStop(0, `rgba(102, 255, 255, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(51, 102, 255, ${alpha * 0.6})`);
      gradient.addColorStop(1, 'rgba(51, 102, 255, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(150, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      if (!p.alive) continue;

      const lifeRatio = p.life / p.maxLife;
      const alpha = Math.max(0, lifeRatio);

      let r: number, g: number, b: number;
      if (p.type === 'explosion') {
        r = Math.floor(255);
        g = Math.floor(255 * lifeRatio);
        b = Math.floor(50 * lifeRatio * lifeRatio);
      } else if (p.type === 'engine') {
        r = 255;
        g = Math.floor(100 + 100 * lifeRatio);
        b = Math.floor(50 * lifeRatio);
      } else {
        r = 255;
        g = 255;
        b = 255;
      }

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  public drawShieldFlash(
    ctx: CanvasRenderingContext2D,
    playerPos: { x: number; y: number },
    aiPos: { x: number; y: number }
  ): void {
    if (this.shieldFlashPlayer > 0) {
      const alpha = this.shieldFlashPlayer / 300;
      ctx.strokeStyle = `rgba(0, 212, 255, ${alpha * 0.8})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(playerPos.x, playerPos.y, 40, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (this.shieldFlashAI > 0) {
      const alpha = this.shieldFlashAI / 300;
      ctx.strokeStyle = `rgba(255, 68, 68, ${alpha * 0.8})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(aiPos.x, aiPos.y, 38, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  public getParticleCount(): number {
    return this.particles.length + this.boundaryParticles.length;
  }

  public clear(): void {
    this.particles.length = 0;
    this.shieldFlashPlayer = 0;
    this.shieldFlashAI = 0;
  }
}


