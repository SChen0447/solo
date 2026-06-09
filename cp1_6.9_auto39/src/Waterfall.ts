import type p5 from 'p5';
import { Droplet } from './Droplet';

const MAX_DROPLETS = 120;
const TARGET_DROPLETS = 100;
const CHAR_POOL =
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+-=[]{}|;:,.<>?';
const TRAIL_PARTICLES = 10;
const TRAIL_LIFETIME = 18;
const TRAIL_RADIUS = 6;
const DISTURBANCE_RADIUS = 50;

interface TrailParticle {
  x: number;
  y: number;
  life: number;
  maxLife: number;
}

export class Waterfall {
  private droplets: Droplet[] = [];
  private trailParticles: TrailParticle[] = [];
  private injectedChars: string[] = [];
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.initializeDroplets();
  }

  private initializeDroplets(): void {
    for (let i = 0; i < TARGET_DROPLETS; i++) {
      this.spawnDroplet(Math.random() * this.canvasHeight);
    }
  }

  private getRandomChar(): string {
    if (this.injectedChars.length > 0 && Math.random() < 0.6) {
      return this.injectedChars[
        Math.floor(Math.random() * this.injectedChars.length)
      ];
    }
    return CHAR_POOL.charAt(Math.floor(Math.random() * CHAR_POOL.length));
  }

  private spawnDroplet(startY: number = -10): void {
    const x = Math.random() * this.canvasWidth;
    const char = this.getRandomChar();
    const size = 14 + Math.random() * 10;
    const baseSpeed = 1 + Math.random() * 2;
    const droplet = new Droplet(x, startY, char, size, baseSpeed);
    this.droplets.push(droplet);
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public injectKeyword(keyword: string): void {
    this.injectedChars = keyword.split('');
  }

  public reset(): void {
    this.injectedChars = [];
    for (const droplet of this.droplets) {
      droplet.startFading();
    }
  }

  public applyDisturbance(
    x: number,
    y: number,
    dx: number,
    dy: number,
    speed: number
  ): void {
    const magnitude = Math.min(1, speed / 20);
    for (const droplet of this.droplets) {
      if (!droplet.alive || droplet.isFading) continue;
      const dist = droplet.distanceTo(x, y);
      if (dist < DISTURBANCE_RADIUS) {
        const influence = 1 - dist / DISTURBANCE_RADIUS;
        droplet.applyDisturbance(dx, dy, magnitude * influence);
      }
    }

    this.addTrailParticles(x, y);
  }

  private addTrailParticles(x: number, y: number): void {
    for (let i = 0; i < TRAIL_PARTICLES; i++) {
      const offset = (Math.random() - 0.5) * 20;
      this.trailParticles.push({
        x: x + offset,
        y: y + offset,
        life: TRAIL_LIFETIME,
        maxLife: TRAIL_LIFETIME
      });
    }
  }

  public update(): void {
    const aliveCount = this.droplets.filter(
      (d) => d.alive && !d.isFading
    ).length;
    if (aliveCount < TARGET_DROPLETS) {
      const toSpawn = Math.min(3, TARGET_DROPLETS - aliveCount);
      for (let i = 0; i < toSpawn; i++) {
        this.spawnDroplet();
      }
    }

    if (this.droplets.length > MAX_DROPLETS) {
      this.droplets
        .slice(0, this.droplets.length - MAX_DROPLETS)
        .forEach((d) => d.startFading());
    }

    for (const droplet of this.droplets) {
      droplet.update(this.canvasHeight);
    }

    this.droplets = this.droplets.filter((d) => d.alive);

    for (const particle of this.trailParticles) {
      particle.life--;
    }
    this.trailParticles = this.trailParticles.filter((p) => p.life > 0);
  }

  public draw(p: p5): void {
    for (const droplet of this.droplets) {
      droplet.draw(p, this.canvasHeight);
    }

    for (const particle of this.trailParticles) {
      const alpha = (particle.life / particle.maxLife) * 120;
      p.colorMode(p.RGB, 255, 255, 255, 255);
      p.noStroke();
      p.fill(0, 255, 255, alpha);
      p.ellipse(particle.x, particle.y, TRAIL_RADIUS * 2);
    }
  }
}
