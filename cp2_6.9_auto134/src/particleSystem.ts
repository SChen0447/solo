export type ColorTheme = 'warm' | 'cool' | 'random';

export const COLOR_PALETTES: Record<ColorTheme, string[]> = {
  warm: ['#FF6B35', '#FFD166', '#E94560'],
  cool: ['#118AB2', '#06D6A0', '#073B4C'],
  random: ['#FF6B35', '#FFD166', '#06D6A0', '#118AB2', '#073B4C']
};

export interface Settings {
  maxParticles: number;
  particleLifetime: number;
  colorTheme: ColorTheme;
}

export interface MouseState {
  x: number;
  y: number;
  isInside: boolean;
  isPressed: boolean;
  lastX: number;
  lastY: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  targetColor: string;
  colorTransition: number;
  opacity: number;
  initialOpacity: number;
  age: number;
  lifetime: number;
  isTrail: boolean;
  trailTimer: number;
  attraction: number;
  scale: number;
  scaleTarget: number;
  scaleDuration: number;
  scaleElapsed: number;
  fadeOut: boolean;
  fadeDuration: number;
  fadeElapsed: number;
}

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 600;
const ATTRACTION_RADIUS = 150;
const ATTRACTION_FORCE = 0.05;
const MAX_ACCELERATION = 3;
const TRANSITION_TIME = 1000;
const TRAIL_MIN_PARTICLES = 5;
const TRAIL_MAX_PARTICLES = 8;
const TRAIL_MIN_SPEED = 3;
const TRAIL_MAX_SPEED = 6;
const TRAIL_DURATION = 800;
const TRAIL_ANGLE = Math.PI / 4;

export class ParticleSystem {
  private particles: Particle[] = [];
  private settings: Settings;
  private lastTrailSpawn = 0;

  constructor(settings: Settings) {
    this.settings = { ...settings };
    this.initParticles();
  }

  private initParticles(): void {
    for (let i = 0; i < this.settings.maxParticles; i++) {
      this.particles.push(this.createBaseParticle());
    }
  }

  private randomFromPalette(): string {
    const palette = COLOR_PALETTES[this.settings.colorTheme];
    return palette[Math.floor(Math.random() * palette.length)];
  }

  private createBaseParticle(): Particle {
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    const x = centerX + (Math.random() - 0.5) * 400;
    const y = centerY + (Math.random() - 0.5) * 300;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 1.5;
    const opacity = 0.3 + Math.random() * 0.4;
    const color = this.randomFromPalette();

    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 4 + Math.random() * 8,
      color,
      targetColor: color,
      colorTransition: 1,
      opacity,
      initialOpacity: opacity,
      age: 0,
      lifetime: (this.settings.particleLifetime * 1000) * (0.8 + Math.random() * 0.4),
      isTrail: false,
      trailTimer: 0,
      attraction: 0,
      scale: 1,
      scaleTarget: 1,
      scaleDuration: 0,
      scaleElapsed: 0,
      fadeOut: false,
      fadeDuration: 0,
      fadeElapsed: 0
    };
  }

  private createTrailParticle(x: number, y: number, dirX: number, dirY: number): Particle {
    const angle = Math.atan2(dirY, dirX) + Math.PI + (Math.random() - 0.5) * TRAIL_ANGLE * 2;
    const speed = TRAIL_MIN_SPEED + Math.random() * (TRAIL_MAX_SPEED - TRAIL_MIN_SPEED);
    const color = this.randomFromPalette();
    const opacity = 0.4 + Math.random() * 0.5;

    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 2 + Math.random() * 4,
      color,
      targetColor: color,
      colorTransition: 1,
      opacity: 0,
      initialOpacity: opacity,
      age: 0,
      lifetime: (this.settings.particleLifetime * 1000) * (0.8 + Math.random() * 0.4),
      isTrail: true,
      trailTimer: 0,
      attraction: 1,
      scale: 0,
      scaleTarget: 1,
      scaleDuration: 300,
      scaleElapsed: 0,
      fadeOut: false,
      fadeDuration: 500,
      fadeElapsed: 0
    };
  }

  public getParticles(): Particle[] {
    return this.particles;
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public setMaxParticles(count: number): void {
    this.settings.maxParticles = count;
    const baseParticles = this.particles.filter(p => !p.isTrail);
    if (baseParticles.length > count) {
      const excess = baseParticles.length - count;
      for (let i = 0; i < excess; i++) {
        const idx = this.particles.findIndex(p => !p.isTrail && !p.fadeOut);
        if (idx !== -1) {
          this.particles[idx].fadeOut = true;
          this.particles[idx].fadeElapsed = 0;
          this.particles[idx].fadeDuration = 500;
        }
      }
    } else if (baseParticles.length < count) {
      const needed = count - baseParticles.length;
      for (let i = 0; i < needed; i++) {
        this.particles.push(this.createBaseParticle());
      }
    }
  }

  public setLifetime(seconds: number): void {
    this.settings.particleLifetime = seconds;
  }

  public setColorTheme(theme: ColorTheme): void {
    this.settings.colorTheme = theme;
    for (const p of this.particles) {
      p.targetColor = this.randomFromPalette();
      p.colorTransition = 0;
    }
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16)
    };
  }

  private lerpColor(c1: string, c2: string, t: number): string {
    const a = this.hexToRgb(c1);
    const b = this.hexToRgb(c2);
    const r = Math.round(a.r + (b.r - a.r) * t);
    const g = Math.round(a.g + (b.g - a.g) * t);
    const bl = Math.round(a.b + (b.b - a.b) * t);
    return `rgb(${r}, ${g}, ${bl})`;
  }

  private spawnTrailParticles(mouse: MouseState): void {
    const dx = mouse.x - mouse.lastX;
    const dy = mouse.y - mouse.lastY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;

    const count = TRAIL_MIN_PARTICLES + Math.floor(Math.random() * (TRAIL_MAX_PARTICLES - TRAIL_MIN_PARTICLES + 1));
    const dirX = dx / dist;
    const dirY = dy / dist;

    for (let i = 0; i < count; i++) {
      const offsetX = (Math.random() - 0.5) * 8;
      const offsetY = (Math.random() - 0.5) * 8;
      this.particles.push(this.createTrailParticle(mouse.x + offsetX, mouse.y + offsetY, dirX, dirY));
    }
  }

  public update(deltaTime: number, mouse: MouseState): void {
    if (mouse.isPressed && mouse.isInside) {
      this.spawnTrailParticles(mouse);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += deltaTime;

      if (p.colorTransition < 1) {
        p.colorTransition = Math.min(1, p.colorTransition + deltaTime / 300);
      }

      if (p.scaleElapsed < p.scaleDuration) {
        p.scaleElapsed += deltaTime;
        const t = p.scaleElapsed / p.scaleDuration;
        if (t < 0.5) {
          p.scale = (t * 2) * 1.2;
        } else {
          p.scale = 1.2 - ((t - 0.5) * 2) * 0.2;
        }
        if (p.scaleElapsed >= p.scaleDuration) {
          p.scale = 1;
        }
      }

      if (p.fadeOut) {
        p.fadeElapsed += deltaTime;
        const t = Math.min(1, p.fadeElapsed / p.fadeDuration);
        p.opacity = p.initialOpacity * (1 - t);
        if (t >= 1) {
          this.particles.splice(i, 1);
          continue;
        }
      } else if (p.isTrail) {
        const fadeStart = p.lifetime - p.fadeDuration;
        if (p.age >= fadeStart) {
          const t = Math.min(1, (p.age - fadeStart) / p.fadeDuration);
          p.opacity = p.initialOpacity * (1 - t);
        } else if (p.age < 300) {
          const t = p.age / 300;
          p.opacity = p.initialOpacity * t;
        } else {
          p.opacity = p.initialOpacity;
        }
      }

      if (p.age >= p.lifetime) {
        if (p.isTrail) {
          this.particles.splice(i, 1);
          continue;
        } else {
          this.particles.splice(i, 1);
          this.particles.push(this.createBaseParticle());
          continue;
        }
      }

      if (mouse.isInside && !p.fadeOut) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < ATTRACTION_RADIUS && dist > 0) {
          const strength = 1 - dist / ATTRACTION_RADIUS;
          p.attraction = Math.min(1, p.attraction + deltaTime / TRANSITION_TIME);
          let ax = (dx / dist) * ATTRACTION_FORCE * strength * p.attraction;
          let ay = (dy / dist) * ATTRACTION_FORCE * strength * p.attraction;
          const accel = Math.sqrt(ax * ax + ay * ay);
          if (accel > MAX_ACCELERATION) {
            ax = (ax / accel) * MAX_ACCELERATION;
            ay = (ay / accel) * MAX_ACCELERATION;
          }
          p.vx += ax;
          p.vy += ay;
        } else {
          p.attraction = Math.max(0, p.attraction - deltaTime / TRANSITION_TIME);
        }
      } else {
        p.attraction = Math.max(0, p.attraction - deltaTime / TRANSITION_TIME);
      }

      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (p.isTrail) {
        const friction = 0.985;
        p.vx *= friction;
        p.vy *= friction;
      } else {
        const maxSpeed = 2 + p.attraction * 2;
        if (speed > maxSpeed) {
          p.vx = (p.vx / speed) * maxSpeed;
          p.vy = (p.vy / speed) * maxSpeed;
        }
      }

      p.x += p.vx;
      p.y += p.vy;

      if (!p.isTrail) {
        const margin = p.radius;
        if (p.x < -margin) p.x = CANVAS_WIDTH + margin;
        if (p.x > CANVAS_WIDTH + margin) p.x = -margin;
        if (p.y < -margin) p.y = CANVAS_HEIGHT + margin;
        if (p.y > CANVAS_HEIGHT + margin) p.y = -margin;
      }
    }
  }

  public getInterpolatedColor(p: Particle): string {
    if (p.colorTransition >= 1) {
      return p.targetColor;
    }
    return this.lerpColor(p.color, p.targetColor, p.colorTransition);
  }

  public resize(scaleX: number, scaleY: number): void {
    for (const p of this.particles) {
      p.x *= scaleX;
      p.y *= scaleY;
    }
  }
}
