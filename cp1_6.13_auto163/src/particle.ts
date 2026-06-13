export interface ParticleConfig {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  secondaryColor: string;
  colorMix: number;
  size: number;
  lifetime: number;
  gravity: number;
  decay: number;
  easeOut?: boolean;
  sineWobble?: number;
}

export interface TrailParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  lifetime: number;
  maxLifetime: number;
  color: string;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

export class Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public color: string;
  public secondaryColor: string;
  public colorMix: number;
  public size: number;
  public initialSize: number;
  public lifetime: number;
  public maxLifetime: number;
  public gravity: number;
  public decay: number;
  public alpha: number = 1;
  public easeOut: boolean;
  public sineWobble: number;
  public age: number = 0;
  public initialVx: number;
  public initialVy: number;

  constructor(config: ParticleConfig) {
    this.x = config.x;
    this.y = config.y;
    this.vx = config.vx;
    this.vy = config.vy;
    this.initialVx = config.vx;
    this.initialVy = config.vy;
    this.color = config.color;
    this.secondaryColor = config.secondaryColor;
    this.colorMix = config.colorMix;
    this.size = config.size;
    this.initialSize = config.size;
    this.lifetime = config.lifetime;
    this.maxLifetime = config.lifetime;
    this.gravity = config.gravity;
    this.decay = config.decay;
    this.easeOut = config.easeOut ?? false;
    this.sineWobble = config.sineWobble ?? 0;
  }

  public update(deltaTime: number): boolean {
    this.age += deltaTime;
    
    const progress = this.age / this.maxLifetime;
    
    if (this.easeOut) {
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      this.x += this.initialVx * easeProgress * deltaTime * 60;
      this.y += this.initialVy * easeProgress * deltaTime * 60;
    } else {
      this.vx *= Math.pow(1 - this.decay, deltaTime * 60);
      this.vy *= Math.pow(1 - this.decay, deltaTime * 60);
      this.vy += this.gravity * deltaTime * 60;
      
      if (this.sineWobble > 0) {
        const wobble = Math.sin(this.age * 8) * this.sineWobble * deltaTime * 60;
        this.x += wobble;
      }
      
      this.x += this.vx * deltaTime * 60;
      this.y += this.vy * deltaTime * 60;
    }
    
    this.alpha = Math.max(0, 1 - progress);
    this.size = Math.max(0.8, this.initialSize * (1 - progress * 0.8));
    
    return this.age < this.maxLifetime;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const mixedColor = this.mixColors(this.color, this.secondaryColor, this.colorMix);
    
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = mixedColor;
    ctx.shadowColor = mixedColor;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private mixColors(color1: string, color2: string, ratio: number): string {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);
    
    const r = Math.round(r1 * ratio + r2 * (1 - ratio));
    const g = Math.round(g1 * ratio + g2 * (1 - ratio));
    const b = Math.round(b1 * ratio + b2 * (1 - ratio));
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private trails: TrailParticle[] = [];
  private stars: Star[] = [];
  private maxParticles: number = 300;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.initStars(canvasWidth, canvasHeight);
  }

  private initStars(width: number, height: number): void {
    this.stars = [];
    for (let i = 0; i < 200; i++) {
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.85,
        size: 1 + Math.random() * 2,
        baseAlpha: 0.3 + Math.random() * 0.7,
        alpha: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.5 + Math.random() * 1.5,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }
  }

  public addParticle(config: ParticleConfig): void {
    if (this.particles.length >= this.maxParticles) {
      this.particles.shift();
    }
    this.particles.push(new Particle(config));
  }

  public addTrail(x: number, y: number, vx: number, vy: number): void {
    this.trails.push({
      x,
      y,
      vx: vx * 0.3,
      vy: vy * 0.3,
      size: 2,
      alpha: 0.6,
      lifetime: 2,
      maxLifetime: 2,
      color: '#fffacd'
    });
    
    if (this.trails.length > 500) {
      this.trails.splice(0, this.trails.length - 500);
    }
  }

  public update(deltaTime: number): void {
    this.particles = this.particles.filter(p => p.update(deltaTime));
    
    this.trails = this.trails.filter(t => {
      t.x += t.vx * deltaTime * 60;
      t.y += t.vy * deltaTime * 60;
      t.vx *= Math.pow(0.98, deltaTime * 60);
      t.vy *= Math.pow(0.98, deltaTime * 60);
      t.lifetime -= deltaTime;
      t.alpha = Math.max(0, (t.lifetime / t.maxLifetime) * 0.6);
      return t.lifetime > 0;
    });
    
    const time = performance.now() / 1000;
    this.stars.forEach(star => {
      const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase);
      star.alpha = star.baseAlpha * (0.5 + twinkle * 0.5);
    });
  }

  public render(ctx: CanvasRenderingContext2D): void {
    this.stars.forEach(star => {
      ctx.save();
      ctx.globalAlpha = star.alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    
    this.trails.forEach(t => {
      ctx.save();
      ctx.globalAlpha = t.alpha;
      ctx.fillStyle = t.color;
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    
    this.particles.forEach(p => p.render(ctx));
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public clear(): void {
    this.particles = [];
    this.trails = [];
  }

  public resize(width: number, height: number): void {
    this.initStars(width, height);
  }
}

export function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  
  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }
  
  return `#${Math.round((r + m) * 255).toString(16).padStart(2, '0')}${Math.round((g + m) * 255).toString(16).padStart(2, '0')}${Math.round((b + m) * 255).toString(16).padStart(2, '0')}`;
}
