import type { WeatherCondition } from './weatherData';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface ColorTheme {
  id: string;
  name: string;
  topColor: RGB;
  bottomColor: RGB;
  particleColor: RGB;
  textColor: RGB;
  accentColor: RGB;
}

export const weatherDefaultThemes: Record<WeatherCondition, ColorTheme> = {
  sunny: {
    id: 'weather-sunny',
    name: '晴天',
    topColor: { r: 255, g: 200, b: 100 },
    bottomColor: { r: 255, g: 107, b: 107 },
    particleColor: { r: 255, g: 245, b: 200 },
    textColor: { r: 80, g: 40, b: 20 },
    accentColor: { r: 255, g: 150, b: 80 },
  },
  cloudy: {
    id: 'weather-cloudy',
    name: '阴天',
    topColor: { r: 180, g: 185, b: 195 },
    bottomColor: { r: 105, g: 110, b: 125 },
    particleColor: { r: 230, g: 235, b: 245 },
    textColor: { r: 60, g: 60, b: 70 },
    accentColor: { r: 160, g: 165, b: 180 },
  },
  rainy: {
    id: 'weather-rainy',
    name: '雨天',
    topColor: { r: 35, g: 75, b: 135 },
    bottomColor: { r: 65, g: 125, b: 140 },
    particleColor: { r: 200, g: 220, b: 245 },
    textColor: { r: 240, g: 245, b: 255 },
    accentColor: { r: 100, g: 160, b: 200 },
  },
  snowy: {
    id: 'weather-snowy',
    name: '雪天',
    topColor: { r: 175, g: 205, b: 235 },
    bottomColor: { r: 240, g: 248, b: 255 },
    particleColor: { r: 255, g: 255, b: 255 },
    textColor: { r: 60, g: 80, b: 110 },
    accentColor: { r: 180, g: 210, b: 240 },
  },
  thunder: {
    id: 'weather-thunder',
    name: '雷暴',
    topColor: { r: 30, g: 30, b: 70 },
    bottomColor: { r: 70, g: 60, b: 120 },
    particleColor: { r: 210, g: 220, b: 255 },
    textColor: { r: 245, g: 245, b: 255 },
    accentColor: { r: 180, g: 140, b: 255 },
  },
  foggy: {
    id: 'weather-foggy',
    name: '雾天',
    topColor: { r: 190, g: 195, b: 205 },
    bottomColor: { r: 150, g: 155, b: 165 },
    particleColor: { r: 235, g: 238, b: 245 },
    textColor: { r: 70, g: 72, b: 80 },
    accentColor: { r: 170, g: 175, b: 185 },
  },
};

export const presetThemes: ColorTheme[] = [
  {
    id: 'dawn',
    name: '晨曦',
    topColor: { r: 255, g: 175, b: 195 },
    bottomColor: { r: 255, g: 200, b: 110 },
    particleColor: { r: 255, g: 230, b: 220 },
    textColor: { r: 90, g: 40, b: 50 },
    accentColor: { r: 255, g: 150, b: 170 },
  },
  {
    id: 'forest',
    name: '森林',
    topColor: { r: 90, g: 170, b: 90 },
    bottomColor: { r: 45, g: 125, b: 80 },
    particleColor: { r: 200, g: 240, b: 200 },
    textColor: { r: 230, g: 250, b: 230 },
    accentColor: { r: 120, g: 200, b: 140 },
  },
  {
    id: 'ocean',
    name: '海洋',
    topColor: { r: 65, g: 140, b: 230 },
    bottomColor: { r: 25, g: 180, b: 200 },
    particleColor: { r: 190, g: 230, b: 250 },
    textColor: { r: 235, g: 248, b: 255 },
    accentColor: { r: 100, g: 180, b: 230 },
  },
  {
    id: 'sunset',
    name: '日落',
    topColor: { r: 140, g: 70, b: 170 },
    bottomColor: { r: 255, g: 120, b: 80 },
    particleColor: { r: 255, g: 200, b: 200 },
    textColor: { r: 255, g: 235, b: 230 },
    accentColor: { r: 220, g: 100, b: 140 },
  },
  {
    id: 'neon',
    name: '霓虹',
    topColor: { r: 120, g: 40, b: 180 },
    bottomColor: { r: 230, g: 60, b: 170 },
    particleColor: { r: 240, g: 180, b: 255 },
    textColor: { r: 255, g: 240, b: 255 },
    accentColor: { r: 200, g: 100, b: 220 },
  },
];

const defaultTheme: ColorTheme = {
  id: 'default',
  name: '默认',
  topColor: { r: 20, g: 50, b: 120 },
  bottomColor: { r: 80, g: 160, b: 220 },
  particleColor: { r: 200, g: 230, b: 255 },
  textColor: { r: 255, g: 255, b: 255 },
  accentColor: { r: 100, g: 180, b: 240 },
};

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(lerp(a.r, b.r, t)),
    g: Math.round(lerp(a.g, b.g, t)),
    b: Math.round(lerp(a.b, b.b, t)),
  };
}

function rgbToCss(c: RGB, alpha = 1): string {
  return `rgba(${c.r},${c.g},${c.b},${alpha})`;
}

type ParticleType = 'rain' | 'snow' | 'float';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
  maxLife: number;
  type: ParticleType;
}

interface ColorTransition {
  fromTop: RGB;
  fromBottom: RGB;
  fromParticle: RGB;
  fromText: RGB;
  toTop: RGB;
  toBottom: RGB;
  toParticle: RGB;
  toText: RGB;
  progress: number;
  duration: number;
  startTime: number;
}

export interface RendererCallbacks {
  onTextColorChange: (color: RGB) => void;
}

export class WeatherRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: RendererCallbacks;

  private width = 0;
  private height = 0;
  private dpr = 1;

  private currentTop: RGB;
  private currentBottom: RGB;
  private currentParticle: RGB;
  private currentText: RGB;

  private transition: ColorTransition | null = null;

  private particles: Particle[] = [];
  private activeWeather: WeatherCondition | null = null;
  private maxParticles = 200;
  private currentMaxParticles = 200;

  private lastTime = 0;
  private fpsAccumulator = 0;
  private fpsFrameCount = 0;
  private currentFps = 60;
  private lastFpsCheck = 0;

  private animationId: number | null = null;
  private isRunning = false;

  private _floatParticleTimer = 0;

  constructor(canvas: HTMLCanvasElement, callbacks: RendererCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas 2D上下文');
    this.ctx = ctx;
    this.callbacks = callbacks;

    this.currentTop = { ...defaultTheme.topColor };
    this.currentBottom = { ...defaultTheme.bottomColor };
    this.currentParticle = { ...defaultTheme.particleColor };
    this.currentText = { ...defaultTheme.textColor };

    this.resize();
    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = (): void => {
    this.resize();
  };

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  get currentTextColor(): RGB {
    return { ...this.currentText };
  }

  get currentColors() {
    return {
      top: { ...this.currentTop },
      bottom: { ...this.currentBottom },
      particle: { ...this.currentParticle },
      text: { ...this.currentText },
    };
  }

  applyWeatherTheme(condition: WeatherCondition, durationMs = 1500): void {
    const theme = weatherDefaultThemes[condition];
    this.activeWeather = condition;

    if (condition === 'rainy' || condition === 'thunder') {
      this.maxParticles = 220;
    } else if (condition === 'snowy') {
      this.maxParticles = 180;
    } else if (condition === 'foggy') {
      this.maxParticles = 60;
    } else {
      this.maxParticles = 30;
    }
    this.currentMaxParticles = Math.min(this.currentMaxParticles, this.maxParticles);

    this.startTransition(theme, durationMs);
  }

  applyPresetTheme(theme: ColorTheme, durationMs = 800): void {
    this.startTransition(theme, durationMs);
  }

  private startTransition(theme: ColorTheme, durationMs: number): void {
    const now = performance.now();
    this.transition = {
      fromTop: { ...this.currentTop },
      fromBottom: { ...this.currentBottom },
      fromParticle: { ...this.currentParticle },
      fromText: { ...this.currentText },
      toTop: { ...theme.topColor },
      toBottom: { ...theme.bottomColor },
      toParticle: { ...theme.particleColor },
      toText: { ...theme.textColor },
      progress: 0,
      duration: durationMs,
      startTime: now,
    };
  }

  private updateTransition(now: number): void {
    if (!this.transition) return;
    const elapsed = now - this.transition.startTime;
    const t = Math.min(1, elapsed / this.transition.duration);
    const eased = easeInOutCubic(t);

    this.currentTop = lerpRGB(this.transition.fromTop, this.transition.toTop, eased);
    this.currentBottom = lerpRGB(this.transition.fromBottom, this.transition.toBottom, eased);
    this.currentParticle = lerpRGB(this.transition.fromParticle, this.transition.toParticle, eased);
    this.currentText = lerpRGB(this.transition.fromText, this.transition.toText, eased);

    this.callbacks.onTextColorChange(this.currentText);

    if (t >= 1) {
      this.transition = null;
    }
  }

  private updateFps(dt: number, now: number): void {
    this.fpsAccumulator += dt;
    this.fpsFrameCount++;
    if (now - this.lastFpsCheck > 1500) {
      this.currentFps = 1000 / (this.fpsAccumulator / this.fpsFrameCount);
      this.fpsAccumulator = 0;
      this.fpsFrameCount = 0;
      this.lastFpsCheck = now;

      if (this.currentFps < 50 && this.currentMaxParticles > 30) {
        this.currentMaxParticles = Math.max(30, Math.floor(this.currentMaxParticles * 0.7));
      } else if (this.currentFps > 58 && this.currentMaxParticles < this.maxParticles) {
        this.currentMaxParticles = Math.min(
          this.maxParticles,
          Math.floor(this.currentMaxParticles * 1.15)
        );
      }
    }
  }

  private getParticleType(): ParticleType {
    if (!this.activeWeather) return 'float';
    switch (this.activeWeather) {
      case 'rainy':
      case 'thunder':
        return 'rain';
      case 'snowy':
        return 'snow';
      default:
        return 'float';
    }
  }

  private spawnParticle(): Particle {
    const type = this.getParticleType();
    if (type === 'rain') {
      const len = 8 + Math.random() * 18;
      return {
        x: Math.random() * this.width,
        y: -20 - Math.random() * 100,
        vx: 0.5 + Math.random() * 1.2,
        vy: 400 + Math.random() * 500,
        size: len,
        opacity: 0.25 + Math.random() * 0.5,
        rotation: 0,
        rotationSpeed: 0,
        life: 1,
        maxLife: 1,
        type: 'rain',
      };
    } else if (type === 'snow') {
      return {
        x: Math.random() * this.width,
        y: -20 - Math.random() * 80,
        vx: (Math.random() - 0.5) * 40,
        vy: 25 + Math.random() * 55,
        size: 1.5 + Math.random() * 4.5,
        opacity: 0.5 + Math.random() * 0.5,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 1.5,
        life: 1,
        maxLife: 1,
        type: 'snow',
      };
    } else {
      return {
        x: Math.random() * this.width,
        y: this.height + Math.random() * 100,
        vx: (Math.random() - 0.5) * 10,
        vy: -(10 + Math.random() * 25),
        size: 1 + Math.random() * 3,
        opacity: 0.15 + Math.random() * 0.35,
        rotation: 0,
        rotationSpeed: 0,
        life: 1,
        maxLife: 1,
        type: 'float',
      };
    }
  }

  private updateParticles(dtSec: number): void {
    const desiredCount = this.currentMaxParticles;

    while (this.particles.length < desiredCount) {
      this.particles.push(this.spawnParticle());
    }
    if (this.particles.length > desiredCount) {
      this.particles.length = desiredCount;
    }

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.rotation += p.rotationSpeed * dtSec;

      const w = this.width;
      const h = this.height;

      if (p.type === 'rain') {
        if (p.y > h + 30 || p.x < -30 || p.x > w + 30) {
          this.particles[i] = this.spawnParticle();
        }
      } else if (p.type === 'snow') {
        if (p.y > h + 20) {
          this.particles[i] = this.spawnParticle();
        }
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
      } else {
        if (p.y < -30 || p.x < -30 || p.x > w + 30) {
          this.particles[i] = this.spawnParticle();
        }
      }
    }
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, rgbToCss(this.currentTop));
    grad.addColorStop(1, rgbToCss(this.currentBottom));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    if (this.activeWeather === 'foggy') {
      ctx.save();
      for (let i = 0; i < 5; i++) {
        const y = h * (0.2 + i * 0.18);
        const g = ctx.createLinearGradient(0, y - 80, 0, y + 80);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.5, `rgba(240,245,250,${0.18 - i * 0.02})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, y - 80, w, 160);
      }
      ctx.restore();
    }
  }

  private drawHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rotation: number): void {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = rotation + (i * Math.PI) / 3;
      const px = x + r * Math.cos(a);
      const py = y + r * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  private drawParticles(): void {
    const ctx = this.ctx;
    const pc = this.currentParticle;
    const isRain = this.activeWeather === 'rainy' || this.activeWeather === 'thunder';
    const isSnow = this.activeWeather === 'snowy';

    for (const p of this.particles) {
      if (p.type === 'rain') {
        const alpha = p.opacity;
        const angle = Math.atan2(p.vy, p.vx);
        ctx.save();
        ctx.strokeStyle = rgbToCss(pc, alpha);
        ctx.lineWidth = 1.2;
        ctx.lineCap = 'round';
        const tailLen = p.size * 1.8;
        const x2 = p.x - Math.cos(angle) * tailLen;
        const y2 = p.y - Math.sin(angle) * tailLen;

        const grad = ctx.createLinearGradient(p.x, p.y, x2, y2);
        grad.addColorStop(0, rgbToCss(pc, alpha));
        grad.addColorStop(1, rgbToCss(pc, 0));
        ctx.strokeStyle = grad;

        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
        void isRain;
      } else if (p.type === 'snow') {
        ctx.save();
        ctx.fillStyle = rgbToCss(pc, p.opacity);
        ctx.shadowColor = rgbToCss(pc, p.opacity * 0.5);
        ctx.shadowBlur = p.size * 2;
        this.drawHexagon(ctx, p.x, p.y, p.size, p.rotation);
        ctx.fill();
        ctx.restore();
        void isSnow;
      } else {
        ctx.save();
        ctx.fillStyle = rgbToCss(pc, p.opacity);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    if (this.activeWeather === 'sunny') {
      this._floatParticleTimer += 0.016;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const cx = this.width * 0.8;
      const cy = this.height * 0.15;
      for (let i = 0; i < 6; i++) {
        const angle = this._floatParticleTimer * 0.3 + (i * Math.PI) / 3;
        const r = 30 + Math.sin(this._floatParticleTimer + i) * 8;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        const rad = ctx.createRadialGradient(px, py, 0, px, py, 60);
        rad.addColorStop(0, 'rgba(255,240,180,0.35)');
        rad.addColorStop(1, 'rgba(255,240,180,0)');
        ctx.fillStyle = rad;
        ctx.fillRect(px - 60, py - 60, 120, 120);
      }
      ctx.restore();
    }
  }

  private renderFrame = (now: number): void => {
    if (!this.isRunning) return;
    if (this.lastTime === 0) this.lastTime = now;
    const dt = Math.min(50, now - this.lastTime);
    const dtSec = dt / 1000;
    this.lastTime = now;

    this.updateFps(dt, now);
    this.updateTransition(now);
    this.updateParticles(dtSec);

    this.drawBackground();
    this.drawParticles();

    this.animationId = requestAnimationFrame(this.renderFrame);
  };

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = 0;
    this.lastFpsCheck = performance.now();
    this.callbacks.onTextColorChange(this.currentText);
    this.animationId = requestAnimationFrame(this.renderFrame);
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  destroy(): void {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
  }

  debugInfo(): { fps: number; particles: number; maxParticles: number } {
    return {
      fps: Math.round(this.currentFps),
      particles: this.particles.length,
      maxParticles: this.currentMaxParticles,
    };
  }
}

export function cssRGB(color: RGB, alpha = 1): string {
  return rgbToCss(color, alpha);
}

export { defaultTheme };
