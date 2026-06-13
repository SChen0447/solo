export interface InkParticleConfig {
  x: number;
  y: number;
  initialRadius: number;
  maxRadius: number;
  duration: number;
}

export interface SplashParticleConfig {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  life: number;
}

export class SplashParticle {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  active: boolean;
  opacity: number;

  constructor(config: SplashParticleConfig) {
    this.x = config.x;
    this.y = config.y;
    this.size = config.size;
    this.vx = config.vx;
    this.vy = config.vy;
    this.life = config.life;
    this.maxLife = config.life;
    this.active = true;
    this.opacity = 1;
  }

  update(deltaTime: number, canvasWidth: number, canvasHeight: number): void {
    if (!this.active) return;
    
    this.x += this.vx * deltaTime * 0.06;
    this.y += this.vy * deltaTime * 0.06;
    this.vy += 0.015 * deltaTime * 0.06;
    this.life -= deltaTime;
    this.opacity = Math.max(0, this.life / this.maxLife);
    
    if (this.life <= 0 || 
        this.x < -20 || this.x > canvasWidth + 20 || 
        this.y < -20 || this.y > canvasHeight + 20) {
      this.active = false;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    
    ctx.save();
    ctx.globalAlpha = this.opacity * 0.8;
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  reset(config: SplashParticleConfig): void {
    this.x = config.x;
    this.y = config.y;
    this.size = config.size;
    this.vx = config.vx;
    this.vy = config.vy;
    this.life = config.life;
    this.maxLife = config.life;
    this.active = true;
    this.opacity = 1;
  }
}

export class InkParticle {
  x: number;
  y: number;
  initialRadius: number;
  maxRadius: number;
  currentRadius: number;
  duration: number;
  elapsed: number;
  active: boolean;
  opacity: number;
  hasSplashed: boolean;
  seed: number;

  constructor(config: InkParticleConfig) {
    this.x = config.x;
    this.y = config.y;
    this.initialRadius = config.initialRadius;
    this.maxRadius = config.maxRadius;
    this.currentRadius = config.initialRadius;
    this.duration = config.duration;
    this.elapsed = 0;
    this.active = true;
    this.opacity = 1;
    this.hasSplashed = false;
    this.seed = Math.random() * 1000;
  }

  update(deltaTime: number): void {
    if (!this.active) return;
    
    this.elapsed += deltaTime;
    const progress = Math.min(1, this.elapsed / this.duration);
    
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    this.currentRadius = this.initialRadius + (this.maxRadius - this.initialRadius) * easeProgress;
    this.opacity = 1 - progress * 0.7;
    
    if (this.elapsed >= this.duration) {
      this.opacity = 0;
      this.active = false;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    
    const layers = 5;
    for (let i = 0; i < layers; i++) {
      const layerProgress = i / layers;
      const layerRadius = this.currentRadius * (0.3 + layerProgress * 0.7);
      const layerOpacity = this.opacity * (1 - layerProgress * 0.8);
      
      this.renderInkLayer(ctx, layerRadius, layerOpacity, i);
    }
  }

  private renderInkLayer(ctx: CanvasRenderingContext2D, radius: number, opacity: number, layerIndex: number): void {
    ctx.save();
    ctx.globalAlpha = opacity;
    
    const time = this.elapsed * 0.002;
    const points = 24;
    
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, radius
    );
    
    const grayValue = Math.floor(10 + layerIndex * 25);
    gradient.addColorStop(0, `rgba(${grayValue}, ${grayValue}, ${grayValue}, 0.9)`);
    gradient.addColorStop(0.5, `rgba(${grayValue + 30}, ${grayValue + 30}, ${grayValue + 30}, 0.5)`);
    gradient.addColorStop(1, `rgba(${grayValue + 60}, ${grayValue + 60}, ${grayValue + 60}, 0)`);
    
    ctx.beginPath();
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const noise = this.perlinNoise(angle * 3 + this.seed + layerIndex, time) * radius * 0.15;
      const r = radius + noise;
      const px = this.x + Math.cos(angle) * r;
      const py = this.y + Math.sin(angle) * r;
      
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.restore();
  }

  private perlinNoise(x: number, y: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1;
  }

  shouldGenerateSplash(): boolean {
    const progress = this.elapsed / this.duration;
    if (progress >= 0.3 && !this.hasSplashed) {
      this.hasSplashed = true;
      return true;
    }
    return false;
  }

  reset(config: InkParticleConfig): void {
    this.x = config.x;
    this.y = config.y;
    this.initialRadius = config.initialRadius;
    this.maxRadius = config.maxRadius;
    this.currentRadius = config.initialRadius;
    this.duration = config.duration;
    this.elapsed = 0;
    this.active = true;
    this.opacity = 1;
    this.hasSplashed = false;
    this.seed = Math.random() * 1000;
  }
}

export class InkDropSystem {
  private inkParticles: InkParticle[] = [];
  private splashParticles: SplashParticle[] = [];
  private maxInkParticles = 5;
  private maxSplashParticles = 40;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  createInkDrop(x: number, y: number, initialRadius: number = 20, maxRadius: number = 120, duration: number = 1500): InkParticle | null {
    if (this.inkParticles.filter(p => p.active).length >= this.maxInkParticles) {
      return null;
    }
    
    const config: InkParticleConfig = { x, y, initialRadius, maxRadius, duration };
    
    const inactive = this.inkParticles.find(p => !p.active);
    if (inactive) {
      inactive.reset(config);
      return inactive;
    }
    
    const particle = new InkParticle(config);
    this.inkParticles.push(particle);
    return particle;
  }

  createSplashParticles(x: number, y: number, count: number = 30): void {
    const activeCount = this.splashParticles.filter(p => p.active).length;
    const availableSlots = this.maxSplashParticles - activeCount;
    const actualCount = Math.min(count, availableSlots);
    
    for (let i = 0; i < actualCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      const config: SplashParticleConfig = {
        x,
        y,
        size: 2 + Math.random() * 3,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 600 + Math.random() * 400
      };
      
      const inactive = this.splashParticles.find(p => !p.active);
      if (inactive) {
        inactive.reset(config);
      } else if (this.splashParticles.length < this.maxSplashParticles) {
        this.splashParticles.push(new SplashParticle(config));
      }
    }
  }

  update(deltaTime: number): void {
    for (const ink of this.inkParticles) {
      if (ink.active) {
        ink.update(deltaTime);
        if (ink.shouldGenerateSplash()) {
          this.createSplashParticles(ink.x, ink.y, 30);
        }
      }
    }
    
    for (const splash of this.splashParticles) {
      if (splash.active) {
        splash.update(deltaTime, this.canvasWidth, this.canvasHeight);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const ink of this.inkParticles) {
      if (ink.active) {
        ink.render(ctx);
      }
    }
    
    for (const splash of this.splashParticles) {
      if (splash.active) {
        splash.render(ctx);
      }
    }
  }

  clear(duration: number = 300): void {
    for (const ink of this.inkParticles) {
      if (ink.active) {
        ink.active = false;
      }
    }
    for (const splash of this.splashParticles) {
      if (splash.active) {
        splash.active = false;
      }
    }
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  getActiveParticleCount(): { ink: number; splash: number } {
    return {
      ink: this.inkParticles.filter(p => p.active).length,
      splash: this.splashParticles.filter(p => p.active).length
    };
  }
}
