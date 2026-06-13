export const COLOR_PALETTE: string[] = [
  '#e63946',
  '#f4a261',
  '#e9c46a',
  '#2a9d8f',
  '#457b9d',
  '#9b5de5',
  '#00b4d8',
  '#f72585',
  '#4cc9f0',
  '#ffb703',
  '#3a0ca3',
  '#d00000'
];

export interface BeatData {
  intensity: number;
  isKick: boolean;
  lowFreqEnergy: number;
  timestamp: number;
}

interface HSLColor {
  h: number;
  s: number;
  l: number;
}

interface ParticleOptions {
  x: number;
  y: number;
  color?: string;
  baseSize?: number;
  spreadAngle?: number;
  speedMultiplier?: number;
}

function hexToHsl(hex: string): HSLColor {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
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

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function hslToString(hsl: HSLColor, alpha: number = 1): string {
  return `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${alpha})`;
}

function getRandomPaletteColor(): string {
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
}

export class Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public baseSpeed: number;
  public color: string;
  public hslColor: HSLColor;
  public size: number;
  public currentSize: number;
  public life: number;
  public age: number;
  public alpha: number;
  public isBeatHighlight: boolean;
  public beatHighlightTime: number;
  public rotation: number;
  public speedMultiplier: number;
  public createdAt: number;
  public lastBeatDeflectTime: number;

  constructor(options: ParticleOptions) {
    const { x, y, color, baseSize = 10, spreadAngle = Math.random() * Math.PI * 2, speedMultiplier = 1 } = options;

    this.x = x;
    this.y = y;

    const angle = spreadAngle + (Math.random() - 0.5) * 0.6;
    const baseVel = (40 + Math.random() * 80) * speedMultiplier;
    this.vx = Math.cos(angle) * baseVel;
    this.vy = Math.sin(angle) * baseVel;
    this.baseSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 1;

    this.color = color || getRandomPaletteColor();
    this.hslColor = hexToHsl(this.color);

    this.size = baseSize * (0.7 + Math.random() * 0.6);
    this.currentSize = this.size;

    this.life = 8 + Math.random() * 4;
    this.age = 0;
    this.alpha = 1;

    this.isBeatHighlight = false;
    this.beatHighlightTime = 0;
    this.rotation = Math.random() * Math.PI * 2;
    this.speedMultiplier = 1;
    this.createdAt = performance.now();
    this.lastBeatDeflectTime = 0;
  }

  public triggerBeat(beatData: BeatData): void {
    const now = performance.now();
    if (now - this.lastBeatDeflectTime < 80) return;
    this.lastBeatDeflectTime = now;

    this.isBeatHighlight = true;
    this.beatHighlightTime = 0.3;

    const deflectAngle = (Math.PI / 180) * (15 + Math.random() * 15) * (Math.random() > 0.5 ? 1 : -1);
    const cosA = Math.cos(deflectAngle);
    const sinA = Math.sin(deflectAngle);
    const newVx = this.vx * cosA - this.vy * sinA;
    const newVy = this.vx * sinA + this.vy * cosA;
    this.vx = newVx;
    this.vy = newVy;

    const beatBoost = 1.5;
    const currentSpd = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 1;
    const targetSpd = this.baseSpeed * beatBoost;
    const scale = targetSpd / currentSpd;
    this.vx *= scale;
    this.vy *= scale;

    this.speedMultiplier = 1.2;
  }

  public update(dt: number, beatData: BeatData | null): boolean {
    this.age += dt;

    if (this.age >= this.life) {
      return false;
    }

    if (this.isBeatHighlight) {
      this.beatHighlightTime -= dt;
      if (this.beatHighlightTime <= 0) {
        this.isBeatHighlight = false;
        this.beatHighlightTime = 0;
      }
    }

    if (beatData && beatData.isKick) {
      this.triggerBeat(beatData);
    }

    if (!this.isBeatHighlight) {
      this.speedMultiplier += (0.2 - this.speedMultiplier) * Math.min(1, dt * 2);
      if (beatData) {
        const waveBoost = 0.3 + beatData.intensity * 0.9;
        this.speedMultiplier = Math.max(this.speedMultiplier, waveBoost);
      }
    }

    const friction = 0.985;
    this.vx *= friction;
    this.vy *= friction;

    this.x += this.vx * this.speedMultiplier * dt;
    this.y += this.vy * this.speedMultiplier * dt;

    this.rotation += dt * 0.5;

    const lifeRatio = this.age / this.life;
    if (lifeRatio < 0.1) {
      this.alpha = lifeRatio / 0.1;
    } else if (lifeRatio > 0.75) {
      this.alpha = Math.max(0, (1 - lifeRatio) / 0.25);
    } else {
      this.alpha = 1;
    }

    const fadeStart = 0.6;
    if (lifeRatio > fadeStart) {
      const shrinkProgress = (lifeRatio - fadeStart) / (1 - fadeStart);
      this.currentSize = this.size * (1 - shrinkProgress * 0.85);
    } else {
      this.currentSize = this.size;
    }

    return true;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (this.alpha <= 0 || this.currentSize <= 0.5) return;

    const drawSize = Math.max(0.5, this.currentSize);
    const glowSize = drawSize * 3;

    let lightBoost = 0;
    if (this.isBeatHighlight) {
      const t = 1 - this.beatHighlightTime / 0.3;
      lightBoost = (1 - t * t) * 0.5;
    }

    const hsl: HSLColor = {
      h: this.hslColor.h,
      s: Math.min(100, this.hslColor.s + lightBoost * 10),
      l: Math.min(95, this.hslColor.l + lightBoost * 50)
    };

    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, glowSize
    );

    const coreAlpha = Math.min(1, this.alpha * (1 + lightBoost * 0.5));
    gradient.addColorStop(0, hslToString({ h: hsl.h, s: hsl.s, l: Math.min(98, hsl.l + 20) }, coreAlpha));
    gradient.addColorStop(0.25, hslToString(hsl, this.alpha * 0.7));
    gradient.addColorStop(0.55, hslToString(hsl, this.alpha * 0.25));
    gradient.addColorStop(1, hslToString(hsl, 0));

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hslToString({ h: hsl.h, s: 100, l: Math.min(98, hsl.l + 30) }, coreAlpha);
    ctx.beginPath();
    ctx.arc(this.x, this.y, drawSize * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
