export interface ParticleConfig {
  name: string;
  emissionRate: number;
  lifetime: number;
  startVelocityX: number;
  startVelocityY: number;
  startSize: number;
  endSize: number;
  gravity: number;
  startColor: string;
  endColor: string;
  colorMidpoint: number;
  opacity: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  startSize: number;
  endSize: number;
  startColorR: number;
  startColorG: number;
  startColorB: number;
  midColorR: number;
  midColorG: number;
  midColorB: number;
  endColorR: number;
  endColorG: number;
  endColorB: number;
  colorMidpoint: number;
  startOpacity: number;
}

export const Presets: Record<string, ParticleConfig> = {
  fire: {
    name: 'fire',
    emissionRate: 100,
    lifetime: 1.5,
    startVelocityX: 0,
    startVelocityY: -150,
    startSize: 8,
    endSize: 2,
    gravity: -50,
    startColor: '#ff4500',
    endColor: '#ffa500',
    colorMidpoint: 50,
    opacity: 1.0
  },
  smoke: {
    name: 'smoke',
    emissionRate: 40,
    lifetime: 3.0,
    startVelocityX: 0,
    startVelocityY: -80,
    startSize: 10,
    endSize: 30,
    gravity: -20,
    startColor: '#a9a9a9',
    endColor: '#ffffff',
    colorMidpoint: 50,
    opacity: 0.6
  },
  explosion: {
    name: 'explosion',
    emissionRate: 200,
    lifetime: 0.8,
    startVelocityX: 0,
    startVelocityY: 0,
    startSize: 6,
    endSize: 2,
    gravity: 100,
    startColor: '#ffff00',
    endColor: '#ff0000',
    colorMidpoint: 30,
    opacity: 1.0
  }
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 255, g: 255, b: 255 };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class ParticleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private particlePool: Particle[] = [];
  private maxParticles = 2000;
  private emitterX: number;
  private emitterY: number;
  private config: ParticleConfig;
  private isRunning = false;
  private animationFrameId: number | null = null;
  private lastTime = 0;
  private emissionAccumulator = 0;
  private fps = 60;
  private fpsCounter = 0;
  private fpsLastTime = 0;
  private onFpsUpdate?: (fps: number, count: number) => void;
  private canvasOpacity = 1;
  private isTransitioning = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.emitterX = canvas.width / 2;
    this.emitterY = canvas.height - 20;
    this.config = { ...Presets.fire };
  }

  setOnFpsUpdate(callback: (fps: number, count: number) => void): void {
    this.onFpsUpdate = callback;
  }

  addEmitter(config: ParticleConfig): void {
    this.config = { ...config };
    this.reset();
  }

  updateEmitterParams(params: Partial<ParticleConfig>): void {
    this.config = { ...this.config, ...params };
  }

  getConfig(): ParticleConfig {
    return { ...this.config };
  }

  reset(): void {
    this.particles = [];
    this.emissionAccumulator = 0;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.fpsLastTime = performance.now();
    this.loop();
  }

  pause(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  togglePause(): boolean {
    if (this.isRunning) {
      this.pause();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  setEmitterPosition(x: number, y: number): void {
    this.emitterX = Math.max(20, Math.min(this.canvas.width - 20, x));
    this.emitterY = y;
  }

  getEmitterPosition(): { x: number; y: number } {
    return { x: this.emitterX, y: this.emitterY };
  }

  transitionToConfig(config: ParticleConfig): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    const startOpacity = this.canvasOpacity;
    const duration = 250;
    const startTime = performance.now();

    const fadeOut = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      this.canvasOpacity = startOpacity * (1 - progress);

      if (progress < 1) {
        requestAnimationFrame(fadeOut);
      } else {
        this.config = { ...config };
        this.reset();
        const fadeInStart = performance.now();
        const fadeIn = (now2: number) => {
          const elapsed2 = now2 - fadeInStart;
          const progress2 = Math.min(elapsed2 / duration, 1);
          this.canvasOpacity = progress2;

          if (progress2 < 1) {
            requestAnimationFrame(fadeIn);
          } else {
            this.canvasOpacity = 1;
            this.isTransitioning = false;
          }
        };
        requestAnimationFrame(fadeIn);
      }
    };
    requestAnimationFrame(fadeOut);
  }

  private getParticle(): Particle | null {
    if (this.particlePool.length > 0) {
      return this.particlePool.pop()!;
    }
    if (this.particles.length < this.maxParticles) {
      return {} as Particle;
    }
    return null;
  }

  private releaseParticle(p: Particle): void {
    if (this.particlePool.length < this.maxParticles) {
      this.particlePool.push(p);
    }
  }

  private emitParticles(dt: number): void {
    this.emissionAccumulator += this.config.emissionRate * dt;
    while (this.emissionAccumulator >= 1) {
      this.emissionAccumulator -= 1;
      this.emitOne();
    }
  }

  private emitOne(): void {
    const p = this.getParticle();
    if (!p) return;

    const centerX = this.canvas.width / 2;
    const offsetFactor = (this.emitterX - centerX) / centerX;

    const angleJitter = (Math.random() - 0.5) * 0.8;
    const baseAngle = -Math.PI / 2 - offsetFactor * 0.6 + angleJitter;
    const speed = this.config.name === 'explosion'
      ? 800 * (0.5 + Math.random() * 0.5)
      : Math.sqrt(
          this.config.startVelocityX * this.config.startVelocityX +
          this.config.startVelocityY * this.config.startVelocityY
        ) * (0.7 + Math.random() * 0.6);

    const jitterX = (Math.random() - 0.5) * 20;
    const jitterY = (Math.random() - 0.5) * 10;

    p.x = this.emitterX + jitterX;
    p.y = this.emitterY + jitterY;

    if (this.config.name === 'explosion') {
      const angle = Math.random() * Math.PI * 2;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
    } else {
      p.vx = Math.cos(baseAngle) * speed + this.config.startVelocityX * 0.3;
      p.vy = Math.sin(baseAngle) * speed + this.config.startVelocityY * 0.3;
    }

    p.maxLife = this.config.lifetime * (0.7 + Math.random() * 0.6);
    p.life = p.maxLife;
    p.startSize = this.config.startSize;
    p.endSize = this.config.endSize;

    const startRgb = hexToRgb(this.config.startColor);
    const endRgb = hexToRgb(this.config.endColor);
    p.startColorR = startRgb.r;
    p.startColorG = startRgb.g;
    p.startColorB = startRgb.b;
    p.endColorR = endRgb.r;
    p.endColorG = endRgb.g;
    p.endColorB = endRgb.b;
    p.colorMidpoint = this.config.colorMidpoint / 100;
    p.midColorR = lerp(startRgb.r, endRgb.r, p.colorMidpoint);
    p.midColorG = lerp(startRgb.g, endRgb.g, p.colorMidpoint);
    p.midColorB = lerp(startRgb.b, endRgb.b, p.colorMidpoint);

    p.startOpacity = this.config.opacity;

    this.particles.push(p);
  }

  private update(dt: number): void {
    this.emitParticles(dt);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.releaseParticle(p);
        this.particles.splice(i, 1);
        continue;
      }

      p.vy += this.config.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  private render(): void {
    this.ctx.save();
    this.ctx.globalAlpha = this.canvasOpacity;

    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.globalCompositeOperation = 'lighter';

    for (const p of this.particles) {
      const lifeRatio = 1 - p.life / p.maxLife;
      let r: number, g: number, b: number;

      if (lifeRatio < p.colorMidpoint) {
        const t = lifeRatio / p.colorMidpoint;
        r = lerp(p.startColorR, p.midColorR, t);
        g = lerp(p.startColorG, p.midColorG, t);
        b = lerp(p.startColorB, p.midColorB, t);
      } else {
        const t = (lifeRatio - p.colorMidpoint) / (1 - p.colorMidpoint);
        r = lerp(p.midColorR, p.endColorR, t);
        g = lerp(p.midColorG, p.endColorG, t);
        b = lerp(p.midColorB, p.endColorB, t);
      }

      const size = lerp(p.startSize, p.endSize, lifeRatio);
      const alpha = p.startOpacity * (1 - lifeRatio);

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.fpsCounter++;
    if (now - this.fpsLastTime >= 500) {
      this.fps = Math.round((this.fpsCounter * 1000) / (now - this.fpsLastTime));
      this.fpsCounter = 0;
      this.fpsLastTime = now;
      if (this.onFpsUpdate) {
        this.onFpsUpdate(this.fps, this.particles.length);
      }
    }

    this.update(dt);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  exportConfig(): ParticleConfig {
    return { ...this.config };
  }

  importConfig(config: ParticleConfig): void {
    this.transitionToConfig(config);
  }
}
