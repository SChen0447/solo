export type ThemeColor = 'deepSpace' | 'lavaRed' | 'auroraGreen';

export interface Theme {
  name: ThemeColor;
  bgStart: string;
  bgEnd: string;
  colorStart: { r: number; g: number; b: number };
  colorEnd: { r: number; g: number; b: number };
}

export const THEMES: Record<ThemeColor, Theme> = {
  deepSpace: {
    name: 'deepSpace',
    bgStart: '#0a0e27',
    bgEnd: '#1a1f4a',
    colorStart: { r: 0, g: 229, b: 255 },
    colorEnd: { r: 255, g: 64, b: 129 }
  },
  lavaRed: {
    name: 'lavaRed',
    bgStart: '#1a0505',
    bgEnd: '#3d1010',
    colorStart: { r: 255, g: 200, b: 50 },
    colorEnd: { r: 255, g: 60, b: 60 }
  },
  auroraGreen: {
    name: 'auroraGreen',
    bgStart: '#051a10',
    bgEnd: '#103d28',
    colorStart: { r: 0, g: 255, b: 180 },
    colorEnd: { r: 100, g: 220, b: 255 }
  }
};

export interface ParticleConfig {
  count: number;
  lifetime: number;
}

export class Star {
  x: number;
  y: number;
  radius: number;
  baseOpacity: number;
  opacity: number;
  phase: number;
  speed: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.radius = Math.random() * 1.5 + 0.3;
    this.baseOpacity = Math.random() * 0.6 + 0.2;
    this.opacity = this.baseOpacity;
    this.phase = Math.random() * Math.PI * 2;
    this.speed = Math.random() * 0.015 + 0.005;
  }

  update(time: number): void {
    this.opacity = this.baseOpacity + Math.sin(time * this.speed + this.phase) * 0.25;
    this.opacity = Math.max(0.1, Math.min(1, this.opacity));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
    ctx.fill();
  }
}

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: { r: number; g: number; b: number };
  life: number;
  maxLife: number;
  gravity: number;
  speedMultiplier: number;

  constructor(
    x: number,
    y: number,
    color: { r: number; g: number; b: number },
    lifetime: number
  ) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 5 + 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = Math.random() * 4 + 1.5;
    this.color = color;
    this.maxLife = lifetime * 1000;
    this.life = this.maxLife;
    this.gravity = 0.03;
    this.speedMultiplier = 1;
  }

  update(deltaTime: number, boostActive: boolean): void {
    const dtFactor = deltaTime / 16.67;
    const mult = boostActive ? 3 : this.speedMultiplier;
    this.x += this.vx * mult * dtFactor;
    this.y += this.vy * mult * dtFactor;
    this.vy += this.gravity * dtFactor;
    this.vx *= 0.99;
    this.vy *= 0.99;
    this.life -= boostActive ? deltaTime * 2 : deltaTime;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const alpha = Math.max(0, this.life / this.maxLife);
    const { r, g, b } = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.radius * 2
    );
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
    gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${alpha * 0.5})`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  isDead(): boolean {
    return this.life <= 0;
  }
}

export class Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.radius = 0;
    this.maxRadius = 300;
    this.maxLife = 1200;
    this.life = this.maxLife;
  }

  update(deltaTime: number): void {
    const progress = 1 - this.life / this.maxLife;
    this.radius = this.maxRadius * progress;
    this.life -= deltaTime;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const alpha = Math.max(0, this.life / this.maxLife);
    const hueShift = (1 - this.life / this.maxLife) * 360;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${hueShift}, 100%, 90%, ${alpha * 0.6})`;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.92, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  isDead(): boolean {
    return this.life <= 0;
  }
}

export class FlashEffect {
  life: number;
  maxLife: number;

  constructor() {
    this.maxLife = 300;
    this.life = this.maxLife;
  }

  update(deltaTime: number): void {
    this.life -= deltaTime;
  }

  getBrightness(): number {
    const progress = this.life / this.maxLife;
    if (progress > 0.5) {
      return 1 + (1 - progress) * 3;
    } else {
      return 1 + progress * 3;
    }
  }

  isDead(): boolean {
    return this.life <= 0;
  }
}

export function lerpColor(
  start: { r: number; g: number; b: number },
  end: { r: number; g: number; b: number },
  t: number
): { r: number; g: number; b: number } {
  return {
    r: Math.round(start.r + (end.r - start.r) * t),
    g: Math.round(start.g + (end.g - start.g) * t),
    b: Math.round(start.b + (end.b - start.b) * t)
  };
}

export function getKeyColor(key: string, theme: Theme): { r: number; g: number; b: number } {
  const upperKey = key.toUpperCase();
  let t: number;

  if (/^[A-Z]$/.test(upperKey)) {
    t = (upperKey.charCodeAt(0) - 65) / 25;
  } else if (/^[0-9]$/.test(upperKey)) {
    t = parseInt(upperKey) / 9;
  } else {
    t = 0.5;
  }

  return lerpColor(theme.colorStart, theme.colorEnd, t);
}

export class ParticleSystem {
  particles: Particle[] = [];
  ripples: Ripple[] = [];
  stars: Star[] = [];
  flashes: FlashEffect[] = [];
  canvasWidth: number;
  canvasHeight: number;
  particleConfig: ParticleConfig;
  theme: Theme;

  constructor(
    canvasWidth: number,
    canvasHeight: number,
    particleConfig: ParticleConfig,
    theme: Theme
  ) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.particleConfig = particleConfig;
    this.theme = theme;
    this.initStars();
  }

  initStars(): void {
    this.stars = [];
    for (let i = 0; i < 150; i++) {
      this.stars.push(new Star(this.canvasWidth, this.canvasHeight));
    }
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.initStars();
  }

  emit(key: string, x: number, y: number): { r: number; g: number; b: number } {
    const color = getKeyColor(key, this.theme);
    const count = this.particleConfig.count;

    for (let i = 0; i < count; i++) {
      const jitterColor = {
        r: Math.min(255, Math.max(0, color.r + (Math.random() - 0.5) * 40)),
        g: Math.min(255, Math.max(0, color.g + (Math.random() - 0.5) * 40)),
        b: Math.min(255, Math.max(0, color.b + (Math.random() - 0.5) * 40))
      };
      this.particles.push(new Particle(x, y, jitterColor, this.particleConfig.lifetime));
    }

    return color;
  }

  addRipple(x: number, y: number): void {
    this.ripples.push(new Ripple(x, y));
  }

  addFlash(): void {
    this.flashes.push(new FlashEffect());
  }

  boostActive(): boolean {
    return this.flashes.some(f => !f.isDead());
  }

  update(deltaTime: number, time: number): void {
    for (const star of this.stars) {
      star.update(time);
    }

    const boost = this.boostActive();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(deltaTime, boost);
      if (this.particles[i].isDead()) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      this.ripples[i].update(deltaTime);
      if (this.ripples[i].isDead()) {
        this.ripples.splice(i, 1);
      }
    }

    for (let i = this.flashes.length - 1; i >= 0; i--) {
      this.flashes[i].update(deltaTime);
      if (this.flashes[i].isDead()) {
        this.flashes.splice(i, 1);
      }
    }
  }

  drawBackground(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createRadialGradient(
      this.canvasWidth / 2, this.canvasHeight / 2, 0,
      this.canvasWidth / 2, this.canvasHeight / 2, Math.max(this.canvasWidth, this.canvasHeight)
    );
    gradient.addColorStop(0, this.theme.bgEnd);
    gradient.addColorStop(1, this.theme.bgStart);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    let brightness = 1;
    for (const flash of this.flashes) {
      brightness = Math.max(brightness, flash.getBrightness());
    }

    this.drawBackground(ctx);

    ctx.save();
    if (brightness > 1) {
      ctx.filter = `brightness(${brightness})`;
    }

    for (const star of this.stars) {
      star.draw(ctx);
    }

    for (const ripple of this.ripples) {
      ripple.draw(ctx);
    }

    for (const particle of this.particles) {
      particle.draw(ctx);
    }

    ctx.restore();
  }
}
