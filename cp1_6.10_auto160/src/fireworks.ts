import { ParticleEngine, TrailDot } from './particles';

export type ThemeName = 'rainbow' | 'ice' | 'sunset' | 'aurora';

interface ThemeColors {
  primary: string;
  pool: string[];
  accent: string;
}

const THEMES: Record<ThemeName, ThemeColors> = {
  rainbow: {
    primary: '#FFD700',
    pool: ['#FF0000', '#FF7F00', '#FFD700', '#00FF00', '#0000FF', '#4B0082', '#9400D3', '#FF1493'],
    accent: '#FF69B4'
  },
  ice: {
    primary: '#87CEEB',
    pool: ['#E0FFFF', '#B0E0E6', '#87CEEB', '#4682B4', '#ADD8E6', '#F0FFFF', '#AFEEEE', '#E6E6FA'],
    accent: '#00CED1'
  },
  sunset: {
    primary: '#FFD700',
    pool: ['#FFD700', '#FFA500', '#FF4500', '#FF6347', '#DC143C', '#FF8C00', '#FFE4B5', '#FF69B4'],
    accent: '#FF4500'
  },
  aurora: {
    primary: '#00FF7F',
    pool: ['#00FF7F', '#7FFFD4', '#9370DB', '#8A2BE2', '#00FA9A', '#DA70D6', '#98FB98', '#DDA0DD'],
    accent: '#9370DB'
  }
};

interface Ray {
  x: number;
  y: number;
  angle: number;
  speed: number;
  maxLength: number;
  currentLength: number;
  color: { r: number; g: number; b: number };
  life: number;
  maxLife: number;
}

export function getThemePrimaryColor(theme: ThemeName): string {
  return THEMES[theme].primary;
}

export function getThemeAccentColor(theme: ThemeName): string {
  return THEMES[theme].accent;
}

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

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  l /= 100;
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

function shiftHue(color: { r: number; g: number; b: number }, degrees: number): { r: number; g: number; b: number } {
  const hsl = rgbToHsl(color.r, color.g, color.b);
  hsl.h = (hsl.h + degrees + 360) % 360;
  return hslToRgb(hsl.h, hsl.s, hsl.l);
}

function getRandomFromTheme(theme: ThemeName): { r: number; g: number; b: number } {
  const pool = THEMES[theme].pool;
  const hex = pool[Math.floor(Math.random() * pool.length)];
  return hexToRgb(hex);
}

export class FireworkSystem {
  private engine: ParticleEngine;
  private rays: Ray[] = [];
  private currentTheme: ThemeName = 'rainbow';

  constructor(engine: ParticleEngine) {
    this.engine = engine;
  }

  setTheme(theme: ThemeName): void {
    this.currentTheme = theme;
  }

  getTheme(): ThemeName {
    return this.currentTheme;
  }

  spawnFirework(x: number, y: number, scale: number = 1): void {
    const rayCount = Math.floor((10 + Math.random() * 11) * scale);
    const baseColor = getRandomFromTheme(this.currentTheme);

    for (let i = 0; i < rayCount; i++) {
      const angle = (Math.PI * 2 * i) / rayCount + Math.random() * 0.2;
      const ray: Ray = {
        x,
        y,
        angle,
        speed: 4 + Math.random() * 2,
        maxLength: 60 + Math.random() * 40 * scale,
        currentLength: 0,
        color: { ...baseColor },
        life: 30,
        maxLife: 30
      };
      this.rays.push(ray);
    }

    setTimeout(() => {
      this.explodeParticles(x, y, baseColor, scale);
    }, 500);
  }

  private explodeParticles(
    x: number,
    y: number,
    baseColor: { r: number; g: number; b: number },
    scale: number
  ): void {
    const particleCount = Math.floor((60 + Math.random() * 41) * scale);

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 3;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const hueShift = (Math.random() - 0.5) * 60;
      const color = shiftHue(baseColor, hueShift);
      const size = 2 + Math.random() * 2;
      const life = Math.floor((480 + Math.random() * 240));

      const particle = this.engine.createParticle(x, y, vx, vy, color, size, life);
      this.engine.addParticle(particle);
    }
  }

  addTrailDot(
    x: number,
    y: number,
    speed: number,
    size: number
  ): void {
    const lowColor = hexToRgb('#4FC3F7');
    const highColor = hexToRgb('#E57373');
    const t = Math.min(1, Math.max(0, speed / 8));

    const color = {
      r: Math.round(lowColor.r + (highColor.r - lowColor.r) * t),
      g: Math.round(lowColor.g + (highColor.g - lowColor.g) * t),
      b: Math.round(lowColor.b + (highColor.b - lowColor.b) * t)
    };

    const dot: TrailDot = {
      x,
      y,
      size,
      color,
      alpha: 0.8,
      life: 60,
      maxLife: 60
    };
    this.engine.addTrailDot(dot);
  }

  update(): void {
    for (let i = this.rays.length - 1; i >= 0; i--) {
      const ray = this.rays[i];
      ray.currentLength += ray.speed;
      ray.life -= 1;

      if (ray.currentLength >= ray.maxLength || ray.life <= 0) {
        this.rays.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const ray of this.rays) {
      const lifeRatio = ray.life / ray.maxLife;
      const endX = ray.x + Math.cos(ray.angle) * ray.currentLength;
      const endY = ray.y + Math.sin(ray.angle) * ray.currentLength;

      const gradient = ctx.createLinearGradient(ray.x, ray.y, endX, endY);
      gradient.addColorStop(0, `rgba(${ray.color.r}, ${ray.color.g}, ${ray.color.b}, ${lifeRatio})`);
      gradient.addColorStop(1, `rgba(255, 255, 255, ${lifeRatio * 0.8})`);

      ctx.beginPath();
      ctx.moveTo(ray.x, ray.y);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2.5 * lifeRatio;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }
}
