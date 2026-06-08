import { Particle } from './particle';
import { Spark } from './spark';

export interface FireworksConfig {
  launchAngle: number;
  explosionRadius: number;
  particleCount: number;
  particleLifetime: number;
  startColor: string;
  endColor: string;
}

interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

type FireworksPhase = 'idle' | 'launching' | 'exploding';

export class ParticleSystem {
  private particles: Particle[] = [];
  private sparks: Spark[] = [];
  private stars: Star[] = [];
  private config: FireworksConfig;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private phase: FireworksPhase = 'idle';
  private launchParticle: Particle | null = null;
  private maxSparks: number = 2000;
  private gravity: number = 9.8;
  private windBase: number = 0;
  private windVariation: number = 50;
  private launchSpeed: number = 400;
  private centerX: number = 0;
  private centerY: number = 0;
  private time: number = 0;
  private launchStartX: number = 0;
  private launchStartY: number = 0;
  private onExplosionCallback: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement, config: FireworksConfig) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.config = config;
    this.initStars();
    this.updateCenter();
  }

  private initStars(): void {
    this.stars = [];
    const starCount = 100;
    for (let i = 0; i < starCount; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 1.5 + 0.5,
        baseAlpha: Math.random() * 0.2 + 0.1,
        twinkleSpeed: Math.random() * 2 + 1,
        twinkleOffset: Math.random() * Math.PI * 2
      });
    }
  }

  public updateCenter(): void {
    this.centerX = this.canvas.width / 2;
    this.centerY = this.canvas.height / 2;
    this.initStars();
  }

  public setConfig(config: FireworksConfig): void {
    this.config = { ...config };
  }

  public getConfig(): FireworksConfig {
    return { ...this.config };
  }

  public launch(): void {
    if (this.phase !== 'idle') return;

    this.phase = 'launching';

    const angleRad = this.config.launchAngle * (Math.PI / 180);
    const vx = Math.cos(angleRad) * this.launchSpeed;
    const vy = -Math.sin(angleRad) * this.launchSpeed;

    const startX = this.centerX;
    const startY = this.centerY;

    this.launchStartX = startX;
    this.launchStartY = startY;

    this.launchParticle = new Particle({
      x: startX,
      y: startY,
      vx: vx,
      vy: vy,
      color: this.config.startColor,
      endColor: this.config.endColor,
      lifetime: 10,
      size: 5,
      gravity: this.gravity,
      wind: 0
    });
  }

  public onExplosion(callback: () => void): void {
    this.onExplosionCallback = callback;
  }

  private explode(x: number, y: number): void {
    const count = this.config.particleCount;
    const sparkCount = count * 2;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.2;
      const speed = this.config.explosionRadius * 2 + Math.random() * 50;
      const wind = (Math.random() - 0.5) * this.windVariation + this.windBase;

      const particle = new Particle({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: this.config.startColor,
        endColor: this.config.endColor,
        lifetime: this.config.particleLifetime + (Math.random() - 0.5) * 0.5,
        size: 3 + Math.random() * 2,
        gravity: this.gravity,
        wind: wind
      });

      this.particles.push(particle);
    }

    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = this.config.explosionRadius * 1.5 + Math.random() * 100;
      const wind = (Math.random() - 0.5) * this.windVariation + this.windBase;

      const spark = new Spark({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: this.config.startColor,
        endColor: this.config.endColor,
        lifetime: 0.5 + Math.random() * 0.5,
        size: 2 + Math.random() * 2,
        gravity: this.gravity * 0.5,
        wind: wind,
        trailLength: 5
      });

      this.sparks.push(spark);
    }

    if (this.sparks.length > this.maxSparks) {
      const excess = this.sparks.length - this.maxSparks;
      this.sparks.splice(0, excess);
    }

    if (this.onExplosionCallback) {
      this.onExplosionCallback();
    }

    this.phase = 'exploding';
    this.launchParticle = null;
  }

  public update(dt: number): void {
    this.time += dt;

    if (this.phase === 'launching' && this.launchParticle) {
      this.launchParticle.update(dt);

      const distFromStart = Math.sqrt(
        Math.pow(this.launchParticle.x - this.launchStartX, 2) +
        Math.pow(this.launchParticle.y - this.launchStartY, 2)
      );

      const reachedRadius = distFromStart >= this.config.explosionRadius;
      const goingDown = this.launchParticle.vy > 0;

      if (reachedRadius || goingDown || this.launchParticle.y < 50) {
        this.explode(this.launchParticle.x, this.launchParticle.y);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (!this.particles[i].alive) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      this.sparks[i].update(dt);
      if (!this.sparks[i].alive) {
        this.sparks.splice(i, 1);
      }
    }

    if (this.phase === 'exploding' && this.particles.length === 0 && this.sparks.length === 0) {
      this.phase = 'idle';
    }
  }

  public draw(): void {
    this.ctx.fillStyle = '#0a0a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawStars();

    if (this.phase === 'launching' && this.launchParticle) {
      this.drawLaunchTrail();
      this.launchParticle.draw(this.ctx);
    }

    for (const spark of this.sparks) {
      spark.draw(this.ctx);
    }

    for (const particle of this.particles) {
      particle.draw(this.ctx);
    }
  }

  private drawStars(): void {
    for (const star of this.stars) {
      const twinkle = Math.sin(this.time * star.twinkleSpeed + star.twinkleOffset);
      const alpha = star.baseAlpha + twinkle * 0.1;
      const clampedAlpha = Math.max(0.1, Math.min(0.3, alpha));

      this.ctx.save();
      this.ctx.globalAlpha = clampedAlpha;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private drawLaunchTrail(): void {
    if (!this.launchParticle) return;

    const startX = this.centerX;
    const startY = this.canvas.height - 50;

    const gradient = this.ctx.createLinearGradient(
      startX, startY,
      this.launchParticle.x, this.launchParticle.y
    );

    gradient.addColorStop(0, 'rgba(0, 255, 157, 0)');
    gradient.addColorStop(0.5, 'rgba(0, 255, 157, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 255, 157, 0.8)');

    this.ctx.save();
    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.shadowColor = '#00ff9d';
    this.ctx.shadowBlur = 15;
    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);
    this.ctx.lineTo(this.launchParticle.x, this.launchParticle.y);
    this.ctx.stroke();
    this.ctx.restore();
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public getSparkCount(): number {
    return this.sparks.length;
  }

  public isIdle(): boolean {
    return this.phase === 'idle';
  }

  public clear(): void {
    this.particles = [];
    this.sparks = [];
    this.launchParticle = null;
    this.phase = 'idle';
  }
}
