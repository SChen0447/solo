import { Particle, ParticleConfig, SprayMode } from './particle';

const MAX_PARTICLES = 5000;
const CONE_ANGLE = (15 * Math.PI) / 180;

export interface SprayerState {
  isSpraying: boolean;
  x: number;
  y: number;
  lastX: number;
  lastY: number;
  mouseSpeed: number;
  currentColor: string;
  currentMode: SprayMode;
  particleDensity: number;
}

export class Sprayer {
  public state: SprayerState;
  private particles: Particle[];
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement, initialColor: string) {
    this.canvas = canvas;
    this.particles = [];
    this.state = {
      isSpraying: false,
      x: 0,
      y: 0,
      lastX: 0,
      lastY: 0,
      mouseSpeed: 0,
      currentColor: initialColor,
      currentMode: 'standard',
      particleDensity: 0
    };
  }

  public setColor(color: string): void {
    this.state.currentColor = color;
  }

  public setMode(mode: SprayMode): void {
    this.state.currentMode = mode;
  }

  public startSpray(x: number, y: number): void {
    this.state.isSpraying = true;
    this.state.x = x;
    this.state.y = y;
    this.state.lastX = x;
    this.state.lastY = y;
    this.state.mouseSpeed = 0;
  }

  public moveSpray(x: number, y: number): void {
    const dx = x - this.state.lastX;
    const dy = y - this.state.lastY;
    this.state.mouseSpeed = Math.sqrt(dx * dx + dy * dy);
    this.state.lastX = this.state.x;
    this.state.lastY = this.state.y;
    this.state.x = x;
    this.state.y = y;
  }

  public stopSpray(): void {
    this.state.isSpraying = false;
    this.state.mouseSpeed = 0;
  }

  private calculateParticleCount(): number {
    const speed = this.state.mouseSpeed;
    if (speed < 3) {
      return 20 + Math.floor(Math.random() * 11);
    } else if (speed > 10) {
      return 5 + Math.floor(Math.random() * 6);
    } else {
      const t = (speed - 3) / 7;
      const count = 30 - t * 20;
      return Math.floor(count + Math.random() * 5);
    }
  }

  private calculateSpreadRadius(): number {
    const speed = this.state.mouseSpeed;
    if (speed < 3) {
      return 10;
    } else if (speed > 10) {
      return 20;
    } else {
      const t = (speed - 3) / 7;
      return 10 + t * 10;
    }
  }

  public emit(): void {
    if (!this.state.isSpraying) {
      this.state.particleDensity = 0;
      return;
    }

    const count = this.calculateParticleCount();
    this.state.particleDensity = count;
    const spreadRadius = this.calculateSpreadRadius();

    const config: ParticleConfig = {
      color: this.state.currentColor,
      mode: this.state.currentMode,
      sourceX: this.state.x,
      sourceY: this.state.y,
      spreadRadius,
      coneAngle: CONE_ANGLE
    };

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) {
        this.particles.shift();
      }
      this.particles.push(new Particle(config));
    }
  }

  public getParticles(): Particle[] {
    return this.particles;
  }

  public updateParticles(canvasWidth: number, canvasHeight: number): Particle[] {
    const newParticles: Particle[] = [];

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const alive = p.update(canvasWidth, canvasHeight);
      if (alive) {
        newParticles.push(p);
        const trails = p.createTrailParticles();
        for (const trail of trails) {
          if (newParticles.length < MAX_PARTICLES) {
            newParticles.push(trail);
          }
        }
      }
    }

    while (newParticles.length > MAX_PARTICLES) {
      newParticles.shift();
    }

    this.particles = newParticles;
    return this.particles;
  }

  public clear(): void {
    this.particles = [];
  }

  public getParticleCount(): number {
    return this.particles.length;
  }
}
