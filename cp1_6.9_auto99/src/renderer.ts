import p5 from 'p5';
import { FluidSolver } from './fluid_solver';

export type RenderMode = 'fluid' | 'particles';

interface Particle {
  x: number;
  y: number;
  life: number;
}

export class Renderer {
  private readonly p: p5;
  private readonly solver: FluidSolver;
  private readonly gridSize: number;
  private canvasSize: number;
  private cellSize: number;

  public mode: RenderMode = 'fluid';

  private particles: Particle[] = [];
  private readonly particleCount = 1000;
  private readonly particleSize = 2;

  private fadeAlpha: number = 0;

  constructor(p: p5, solver: FluidSolver, canvasSize: number) {
    this.p = p;
    this.solver = solver;
    this.gridSize = solver.N;
    this.canvasSize = canvasSize;
    this.cellSize = canvasSize / this.gridSize;
    this.initParticles();
  }

  resize(canvasSize: number): void {
    this.canvasSize = canvasSize;
    this.cellSize = canvasSize / this.gridSize;
  }

  private initParticles(): void {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.gridSize,
        y: Math.random() * this.gridSize,
        life: Math.random()
      });
    }
  }

  resetParticles(): void {
    this.initParticles();
  }

  setMode(mode: RenderMode): void {
    this.mode = mode;
    this.fadeAlpha = 1;
  }

  render(): void {
    const p = this.p;

    if (this.fadeAlpha > 0) {
      this.fadeAlpha = Math.max(0, this.fadeAlpha - 0.05);
    }

    if (this.mode === 'fluid') {
      this.renderFluid();
    } else {
      this.renderParticles();
    }

    if (this.fadeAlpha > 0) {
      p.noStroke();
      p.fill(10, 10, 26, this.fadeAlpha * 255);
      p.rect(0, 0, this.canvasSize, this.canvasSize);
    }
  }

  private renderFluid(): void {
    const p = this.p;
    const density = this.solver.getDensityField();
    const size = this.canvasSize;

    p.loadPixels();
    const imgPixels = p.pixels;

    const cellW = size / this.gridSize;
    const cellH = size / this.gridSize;

    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const gx = Math.floor(px / cellW);
        const gy = Math.floor(py / cellH);
        const idx = this.solver['IX'](gx + 1, gy + 1);

        const r = Math.min(255, density.r[idx] * 2);
        const g = Math.min(255, density.g[idx] * 2);
        const b = Math.min(255, density.b[idx] * 2);

        const pixelIdx = (py * size + px) * 4;
        imgPixels[pixelIdx] = r;
        imgPixels[pixelIdx + 1] = g;
        imgPixels[pixelIdx + 2] = b;
        imgPixels[pixelIdx + 3] = 255;
      }
    }

    p.updatePixels();
  }

  private renderParticles(): void {
    const p = this.p;

    p.background(10, 10, 26);

    p.noStroke();
    for (const particle of this.particles) {
      const vel = this.solver.getVelocity(particle.x, particle.y);
      const speed = Math.sqrt(vel.vx * vel.vx + vel.vy * vel.vy);

      particle.x += vel.vx * 0.5;
      particle.y += vel.vy * 0.5;

      if (particle.x < 0 || particle.x >= this.gridSize ||
          particle.y < 0 || particle.y >= this.gridSize) {
        particle.x = Math.random() * this.gridSize;
        particle.y = Math.random() * this.gridSize;
      }

      const hue = Math.min(360, speed * 10);
      const saturation = 80;
      const brightness = 60 + Math.min(40, speed * 2);

      const screenX = particle.x * this.cellSize;
      const screenY = particle.y * this.cellSize;

      p.colorMode(p.HSB, 360, 100, 100, 100);
      p.fill(hue, saturation, brightness, 80);
      p.ellipse(screenX, screenY, this.particleSize, this.particleSize);
    }

    p.colorMode(p.RGB, 255);
  }
}
