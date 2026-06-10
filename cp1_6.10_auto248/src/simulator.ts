import { config } from './config';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  initialAlpha: number;
  life: number;
  maxLife: number;
  radius: number;
  color: { r: number; g: number; b: number };
}

export interface ClearAnimation {
  active: boolean;
  startTime: number;
  centerX: number;
  centerY: number;
  maxRadius: number;
}

export type SimulatorFrame = {
  particles: Particle[];
  clearAnimation: ClearAnimation;
};

const PARTICLES_PER_POINT = 40;
const MAX_PARTICLES = 2000;
const MIN_RADIUS = 8;
const MAX_RADIUS = 12;
const COLOR = { r: 26, g: 26, b: 26 };
const DRIED_GRAY = { r: 120, g: 120, b: 120 };
const BASE_MAX_LIFE = 9000;

class Simulator {
  private particles: Particle[] = [];
  private lastPosition: { x: number; y: number; time: number } | null = null;
  private clearAnim: ClearAnimation = {
    active: false,
    startTime: 0,
    centerX: 0,
    centerY: 0,
    maxRadius: 0
  };
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;

  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  addInkPoint(x: number, y: number, speed: number): void {
    if (this.clearAnim.active) return;

    const concentration = config.get('concentration');
    const dryingSpeed = config.get('dryingSpeed');

    const baseAlpha = 0.5 + (concentration / 10) * 0.4;
    const speedFactor = Math.max(0.3, 1 - speed * 0.005);
    const alpha = baseAlpha * speedFactor;

    const maxLife = BASE_MAX_LIFE / dryingSpeed;

    const radius = MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS);
    const numParticles = Math.min(
      PARTICLES_PER_POINT,
      MAX_PARTICLES - this.particles.length
    );

    for (let i = 0; i < numParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;

      const particle: Particle = {
        x: px,
        y: py,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        alpha: alpha * (0.6 + Math.random() * 0.4),
        initialAlpha: alpha * (0.6 + Math.random() * 0.4),
        life: 0,
        maxLife: maxLife * (0.7 + Math.random() * 0.6),
        radius: 2.5 + Math.random() * 3.5,
        color: { ...COLOR }
      };

      this.particles.push(particle);
    }

    if (this.particles.length > MAX_PARTICLES) {
      this.particles.splice(0, this.particles.length - MAX_PARTICLES);
    }

    this.lastPosition = { x, y, time: performance.now() };
  }

  getSpeed(x: number, y: number): number {
    if (!this.lastPosition) return 0;
    const dx = x - this.lastPosition.x;
    const dy = y - this.lastPosition.y;
    const dt = performance.now() - this.lastPosition.time;
    if (dt === 0) return 0;
    return Math.sqrt(dx * dx + dy * dy) / dt * 16;
  }

  resetLastPosition(): void {
    this.lastPosition = null;
  }

  startClearAnimation(): void {
    this.clearAnim = {
      active: true,
      startTime: performance.now(),
      centerX: this.canvasWidth / 2,
      centerY: this.canvasHeight / 2,
      maxRadius: Math.sqrt(
        this.canvasWidth * this.canvasWidth + this.canvasHeight * this.canvasHeight
      ) / 2 + 100
    };
  }

  update(): SimulatorFrame {
    const diffusionSpeed = config.get('diffusionSpeed');
    const dryingSpeed = config.get('dryingSpeed');
    const now = performance.now();

    if (this.clearAnim.active) {
      const elapsed = now - this.clearAnim.startTime;
      const duration = 800;
      if (elapsed >= duration) {
        this.clearAnim.active = false;
        this.particles = [];
      }
    }

    const aliveParticles: Particle[] = [];
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life += 16;

      const lifeRatio = Math.min(1, p.life / p.maxLife);
      p.alpha = p.initialAlpha * (1 - lifeRatio * dryingSpeed * 0.3);
      p.alpha = Math.max(0, p.alpha);

      const grayRatio = lifeRatio;
      p.color.r = Math.round(COLOR.r + (DRIED_GRAY.r - COLOR.r) * grayRatio);
      p.color.g = Math.round(COLOR.g + (DRIED_GRAY.g - COLOR.g) * grayRatio);
      p.color.b = Math.round(COLOR.b + (DRIED_GRAY.b - COLOR.b) * grayRatio);

      const noiseX = (Math.random() - 0.5) * 2;
      const noiseY = (Math.random() - 0.5) * 2;
      p.vx += noiseX * 0.05;
      p.vy += noiseY * 0.05;
      p.vx *= 0.95;
      p.vy *= 0.95;

      const step = diffusionSpeed * (0.5 + (1 - lifeRatio) * 0.5);
      p.x += p.vx * step;
      p.y += p.vy * step;

      if (p.alpha > 0.005 && lifeRatio < 1) {
        aliveParticles.push(p);
      }
    }

    this.particles = aliveParticles;

    return {
      particles: this.particles,
      clearAnimation: this.clearAnim
    };
  }
}

export const simulator = new Simulator();
