export interface EngineConfig {
  brushSize: number;
  inkOpacity: number;
  diffusionSpeed: number;
}

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  opacity: number;
  initialOpacity: number;
  bornTime: number;
  diffAngle: number;
  diffRadius: number;
}

const MAX_PARTICLES = 1500;
const PARTICLE_LIFETIME = 40000;
const BASE_DIFFUSION = 0.5;
const MAX_DIFFUSION_RADIUS = 8;
const INK_COLOR = '#1a1a1a';
const PAPER_COLOR = '#f5e6c8';

export class CalligraphyEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private dpr: number;

  private particles: Particle[] = [];
  private lastX: number = 0;
  private lastY: number = 0;
  private lastTime: number = 0;
  private isDrawing: boolean = false;

  private config: EngineConfig;
  private paperNoisePattern: CanvasPattern | null = null;

  constructor(canvas: HTMLCanvasElement, config: EngineConfig) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = ctx;
    this.config = config;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
    this.generatePaperPattern();
    this.clear();
  }

  private generatePaperPattern(): void {
    const size = 256;
    const noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = size;
    noiseCanvas.height = size;
    const nctx = noiseCanvas.getContext('2d');
    if (!nctx) return;

    nctx.fillStyle = PAPER_COLOR;
    nctx.fillRect(0, 0, size, size);

    const imgData = nctx.getImageData(0, 0, size, size);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 18;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }

    nctx.putImageData(imgData, 0, 0);
    this.paperNoisePattern = this.ctx.createPattern(noiseCanvas, 'repeat');
  }

  public resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.redraw();
  }

  public setConfig(config: Partial<EngineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public startStroke(x: number, y: number): void {
    this.isDrawing = true;
    this.lastX = x;
    this.lastY = y;
    this.lastTime = performance.now();
    this.spawnParticles(x, y, x, y, 0);
  }

  public continueStroke(x: number, y: number): void {
    if (!this.isDrawing) return;

    const now = performance.now();
    const speed = this.calculateSpeed(x, y, this.lastX, this.lastY, now - this.lastTime);
    this.spawnParticles(this.lastX, this.lastY, x, y, speed);
    this.lastX = x;
    this.lastY = y;
    this.lastTime = now;
  }

  public endStroke(): void {
    this.isDrawing = false;
  }

  private calculateSpeed(x1: number, y1: number, x2: number, y2: number, dt: number): number {
    if (dt <= 0) return 0;
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy) / dt;
  }

  private spawnParticles(fromX: number, fromY: number, toX: number, toY: number, speed: number): void {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const opacity = this.calculateOpacity(speed);
    const now = performance.now();
    const size = this.config.brushSize;

    const minSpacing = Math.max(1.5, size * 0.18);
    const steps = Math.max(1, Math.ceil(distance / minSpacing));

    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const px = fromX + dx * t;
      const py = fromY + dy * t;
      this.addParticle(px, py, size, opacity, now);
    }

    if (distance === 0) {
      this.addParticle(toX, toY, size, opacity, now);
    }
  }

  private calculateOpacity(speed: number): number {
    const maxSpeed = 1.5;
    const normalized = Math.min(1, speed / maxSpeed);
    const base = 0.3 + normalized * 0.6;
    return Math.min(1, base * this.config.inkOpacity);
  }

  private addParticle(x: number, y: number, size: number, opacity: number, now: number): void {
    if (this.particles.length >= MAX_PARTICLES) {
      this.particles.shift();
    }

    const jitter = size * 0.3;
    this.particles.push({
      x: x + (Math.random() - 0.5) * jitter,
      y: y + (Math.random() - 0.5) * jitter,
      baseX: x,
      baseY: y,
      size: size * (0.6 + Math.random() * 0.8),
      opacity,
      initialOpacity: opacity,
      bornTime: now,
      diffAngle: Math.random() * Math.PI * 2,
      diffRadius: 0
    });
  }

  public update(now: number): void {
    const dt = 16.67;
    const diffFactor = BASE_DIFFUSION * this.config.diffusionSpeed;
    const diffPerFrame = (diffFactor / 1000) * dt;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const elapsed = now - p.bornTime;

      if (elapsed >= PARTICLE_LIFETIME) {
        this.particles.splice(i, 1);
        continue;
      }

      p.opacity = p.initialOpacity * (1 - elapsed / PARTICLE_LIFETIME);

      if (p.diffRadius < MAX_DIFFUSION_RADIUS) {
        p.diffRadius = Math.min(MAX_DIFFUSION_RADIUS, p.diffRadius + diffPerFrame);
        p.x = p.baseX + Math.cos(p.diffAngle) * p.diffRadius;
        p.y = p.baseY + Math.sin(p.diffAngle) * p.diffRadius;
      }
    }
  }

  public render(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    if (this.paperNoisePattern) {
      this.ctx.fillStyle = this.paperNoisePattern;
    } else {
      this.ctx.fillStyle = PAPER_COLOR;
    }
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = INK_COLOR;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      this.ctx.globalAlpha = p.opacity;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  }

  public clear(): void {
    this.particles.length = 0;
    this.redraw();
  }

  private redraw(): void {
    if (this.paperNoisePattern) {
      this.ctx.fillStyle = this.paperNoisePattern;
    } else {
      this.ctx.fillStyle = PAPER_COLOR;
    }
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
}
