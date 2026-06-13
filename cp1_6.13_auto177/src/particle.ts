export type SprayMode = 'standard' | 'vignette' | 'sparkle' | 'mist';

export interface ParticleConfig {
  color: string;
  mode: SprayMode;
  sourceX: number;
  sourceY: number;
  spreadRadius: number;
  coneAngle: number;
}

export class Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public radius: number;
  public initialRadius: number;
  public color: string;
  public alpha: number;
  public mode: SprayMode;
  public life: number;
  public maxLife: number;
  public age: number;
  public sparklePhase: number;
  public isTrail: boolean;
  public settled: boolean;
  public settledAge: number;

  constructor(config: ParticleConfig) {
    const { color, mode, sourceX, sourceY, spreadRadius, coneAngle } = config;

    this.mode = mode;
    this.color = color;
    this.alpha = 1;
    this.isTrail = false;
    this.settled = false;
    this.settledAge = 0;
    this.sparklePhase = Math.random() * Math.PI * 2;

    const angle = (Math.random() - 0.5) * coneAngle + (-Math.PI / 2);
    const speed = 2 + Math.random() * 6;
    const offset = (Math.random() - 0.5) * spreadRadius * 0.5;

    this.x = sourceX + offset;
    this.y = sourceY;
    this.vx = Math.cos(angle) * speed + (Math.random() - 0.5) * 0.5;
    this.vy = Math.sin(angle) * speed - 1 + Math.random() * 1.5;

    this.radius = this.initialRadius = this.calculateInitialRadius();
    this.maxLife = this.calculateMaxLife();
    this.life = this.maxLife;
    this.age = 0;
  }

  private calculateInitialRadius(): number {
    switch (this.mode) {
      case 'standard':
        return 2 + Math.random() * 2;
      case 'vignette':
        return 3 + Math.random() * 2;
      case 'sparkle':
        return 1.5 + Math.random() * 1.5;
      case 'mist':
        return 1.5 + Math.random() * 1.5;
      default:
        return 2;
    }
  }

  private calculateMaxLife(): number {
    const fps = 60;
    switch (this.mode) {
      case 'standard':
        return (3 + Math.random() * 2) * fps;
      case 'vignette':
        return (2 + Math.random() * 1) * fps;
      case 'sparkle':
        return (1 + Math.random() * 1) * fps;
      case 'mist':
        return (4 + Math.random() * 2) * fps;
      default:
        return 3 * fps;
    }
  }

  public createTrailParticles(): Particle[] {
    if (this.mode !== 'mist' || this.isTrail || this.age < 5) return [];
    if (Math.random() > 0.15) return [];

    const trails: Particle[] = [];
    for (let i = 0; i < 2; i++) {
      const trail = Object.create(Particle.prototype) as Particle;
      trail.x = this.x + (Math.random() - 0.5) * 3;
      trail.y = this.y + (Math.random() - 0.5) * 3;
      trail.vx = this.vx * 0.3 + (Math.random() - 0.5) * 0.5;
      trail.vy = this.vy * 0.3 + (Math.random() - 0.5) * 0.5;
      trail.color = this.color;
      trail.alpha = this.alpha * 0.5;
      trail.mode = 'mist';
      trail.radius = this.radius * 0.5;
      trail.initialRadius = trail.radius;
      trail.maxLife = this.maxLife * 0.6;
      trail.life = trail.maxLife;
      trail.age = 0;
      trail.sparklePhase = Math.random() * Math.PI * 2;
      trail.isTrail = true;
      trail.settled = false;
      trail.settledAge = 0;
      trails.push(trail);
    }
    return trails;
  }

  public update(canvasWidth: number, canvasHeight: number): boolean {
    this.age++;
    this.life--;

    if (!this.settled) {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += 0.05;
      this.vx *= 0.98;
      this.vy *= 0.98;

      if (this.y >= canvasHeight - 2 || this.x <= 0 || this.x >= canvasWidth) {
        this.settled = true;
        this.vx *= 0.3;
        this.vy = 0;
      }
    } else {
      this.settledAge++;
      this.vx *= 0.9;
      this.x += this.vx;
    }

    const lifeRatio = this.life / this.maxLife;

    switch (this.mode) {
      case 'standard':
        this.radius = this.initialRadius * lifeRatio;
        this.alpha = Math.max(0, lifeRatio);
        break;
      case 'vignette':
        this.alpha = Math.max(0, lifeRatio);
        break;
      case 'sparkle':
        const blink = 0.5 + 0.5 * Math.sin(this.age * 0.6 + this.sparklePhase);
        this.alpha = Math.max(0, lifeRatio) * blink;
        break;
      case 'mist':
        this.alpha = Math.max(0, lifeRatio) * (this.isTrail ? 0.5 : 0.7);
        this.radius = this.initialRadius * (0.5 + 0.5 * lifeRatio);
        break;
    }

    return this.life > 0 && this.alpha > 0.01;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = this.alpha;

    switch (this.mode) {
      case 'standard':
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(0.1, this.radius), 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'vignette': {
        const gradient = ctx.createRadialGradient(
          this.x, this.y, 0,
          this.x, this.y, this.radius
        );
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, this.hexToRgba(this.color, 0));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'sparkle':
        ctx.fillStyle = this.color;
        const r = this.radius * (0.7 + 0.3 * Math.sin(this.age * 0.6 + this.sparklePhase));
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(0.1, r), 0, Math.PI * 2);
        ctx.fill();
        if (r > 1) {
          ctx.globalAlpha = this.alpha * 0.5;
          ctx.beginPath();
          ctx.arc(this.x, this.y, r * 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case 'mist':
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(0.1, this.radius), 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    ctx.restore();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

export function createParticle(config: ParticleConfig): Particle {
  return new Particle(config);
}
