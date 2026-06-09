import { Brick } from './objects';
import { MAX_PARTICLES } from './physics';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  rotation: number;
  rotationSpeed: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  twinkleSpeed: number;
  phase: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number;
  private gravity: number = 0.2;

  constructor(maxParticles: number = 300) {
    this.maxParticles = maxParticles;
  }

  public emitBrickBreak(brick: Brick): void {
    const box = brick.getCollisionBox();
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    const particleCount = 20 + Math.floor(Math.random() * 11);

    for (let i = 0; i < particleCount; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      const offsetX = (Math.random() - 0.5) * box.width * 0.8;
      const offsetY = (Math.random() - 0.5) * box.height * 0.8;

      const particle: Particle = {
        x: centerX + offsetX,
        y: centerY + offsetY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        color: brick.color,
        size: 2 + Math.random() * 4,
        life: 1500,
        maxLife: 1500,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3
      };

      this.particles.push(particle);
    }
  }

  public emitHitSpark(x: number, y: number, color: string): void {
    for (let i = 0; i < 5; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2;

      const particle: Particle = {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 1 + Math.random() * 2,
        life: 400,
        maxLife: 400,
        rotation: 0,
        rotationSpeed: 0
      };

      this.particles.push(particle);
    }
  }

  public update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.vy += this.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const lifeRatio = p.life / p.maxLife;
      const alpha = Math.max(0, lifeRatio);
      const size = p.size * lifeRatio;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  public getCount(): number {
    return this.particles.length;
  }

  public clear(): void {
    this.particles = [];
  }
}

export class ScreenShake {
  private intensity: number = 0;
  private duration: number = 0;
  private startTime: number = 0;
  private active: boolean = false;

  public trigger(intensity: number, duration: number, currentTime: number): void {
    this.intensity = intensity;
    this.duration = duration;
    this.startTime = currentTime;
    this.active = true;
  }

  public getOffset(currentTime: number): { x: number; y: number } {
    if (!this.active) {
      return { x: 0, y: 0 };
    }

    const elapsed = currentTime - this.startTime;
    if (elapsed >= this.duration) {
      this.active = false;
      return { x: 0, y: 0 };
    }

    const progress = 1 - elapsed / this.duration;
    const currentIntensity = this.intensity * progress;

    return {
      x: (Math.random() - 0.5) * 2 * currentIntensity,
      y: (Math.random() - 0.5) * 2 * currentIntensity
    };
  }

  public isActive(): boolean {
    return this.active;
  }
}

export class VictoryEffect {
  private stars: Star[] = [];
  private startTime: number = 0;
  private active: boolean = false;
  private duration: number = 3000;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  public start(currentTime: number): void {
    this.startTime = currentTime;
    this.active = true;
    this.stars = [];

    for (let i = 0; i < 40; i++) {
      this.stars.push({
        x: Math.random() * this.canvasWidth,
        y: Math.random() * this.canvasHeight,
        size: 2 + Math.random() * 6,
        alpha: 0,
        twinkleSpeed: 0.003 + Math.random() * 0.005,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  public update(currentTime: number): boolean {
    if (!this.active) return false;

    const elapsed = currentTime - this.startTime;
    if (elapsed >= this.duration) {
      this.active = false;
      return false;
    }

    const progress = elapsed / this.duration;
    for (const star of this.stars) {
      const twinkle = Math.sin(currentTime * star.twinkleSpeed + star.phase);
      star.alpha = 0.5 + 0.5 * twinkle;

      if (progress < 0.5) {
        star.alpha *= progress * 2;
      } else {
        star.alpha *= (1 - progress) * 2;
      }
    }

    return true;
  }

  public render(ctx: CanvasRenderingContext2D, currentTime: number, ballX: number, ballY: number): void {
    if (!this.active) return;

    const elapsed = currentTime - this.startTime;
    const progress = elapsed / this.duration;

    for (const star of this.stars) {
      ctx.save();
      ctx.translate(star.x, star.y);
      ctx.globalAlpha = star.alpha;
      this.drawStar(ctx, star.size, '#FFD700');
      ctx.restore();
    }

    ctx.globalAlpha = 1;

    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;
    const easedProgress = this.easeOutCubic(Math.min(1, progress * 1.5));

    const animatedX = ballX + (centerX - ballX) * easedProgress;
    const animatedY = ballY + (centerY - ballY) * easedProgress;
    const scale = 1 + progress * 3;
    const rotation = progress * Math.PI * 4;

    ctx.save();
    ctx.translate(animatedX, animatedY);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);

    const gradient = ctx.createRadialGradient(-2, -2, 0, 0, 0, 8);
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(0.5, '#F0F0FF');
    gradient.addColorStop(1, '#AADDFF');

    ctx.shadowBlur = 30 + progress * 20;
    ctx.shadowColor = 'rgba(255, 215, 0, 0.9)';

    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.restore();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  private drawStar(ctx: CanvasRenderingContext2D, size: number, color: string): void {
    const spikes = 5;
    const outerRadius = size;
    const innerRadius = size * 0.4;

    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    ctx.shadowBlur = size * 2;
    ctx.shadowColor = color;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  public isActive(): boolean {
    return this.active;
  }

  public getProgress(currentTime: number): number {
    if (!this.active) return 1;
    return Math.min(1, (currentTime - this.startTime) / this.duration);
  }
}

export class BackgroundGrid {
  private canvasWidth: number;
  private canvasHeight: number;
  private gridSize: number = 32;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  public render(ctx: CanvasRenderingContext2D, top: number, bottom: number): void {
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
    ctx.lineWidth = 1;

    const clampedTop = Math.max(0, top);
    const clampedBottom = Math.min(this.canvasHeight, bottom);

    for (let x = 0; x <= this.canvasWidth; x += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, clampedTop);
      ctx.lineTo(x, clampedBottom);
      ctx.stroke();
    }

    for (let y = clampedTop; y <= clampedBottom; y += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvasWidth, y);
      ctx.stroke();
    }
  }
}
