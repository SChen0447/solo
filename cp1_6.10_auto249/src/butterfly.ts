import type { WindSystem } from './wind.js';

type Wing = 'left' | 'right' | 'body';

export interface ButterflyParticle {
  offsetX: number;
  offsetY: number;
  baseY: number;
  wing: Wing;
  radius: number;
}

const COLORS = [
  { r: 255, g: 107, b: 107 },
  { r: 254, g: 202, b: 87 },
  { r: 72, g: 219, b: 251 }
];

function lerpColor(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }, t: number): string {
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function buildColorPalette(): string[] {
  const palette: string[] = [];
  const steps = 360;
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * COLORS.length;
    const idx = Math.floor(t);
    const frac = t - idx;
    const a = COLORS[idx % COLORS.length];
    const b = COLORS[(idx + 1) % COLORS.length];
    palette.push(lerpColor(a, b, frac));
  }
  return palette;
}

function buildButterflyParticles(): ButterflyParticle[] {
  const particles: ButterflyParticle[] = [];
  const leftCount = 50;
  const rightCount = 50;
  const bodyCount = 20;

  for (let i = 0; i < leftCount; i++) {
    const t = i / leftCount;
    const x = -25 + t * 20;
    const yOffset = (1 - Math.abs(t - 0.5) * 2) * 15;
    particles.push({
      offsetX: x,
      offsetY: -yOffset + Math.random() * yOffset * 2,
      baseY: 0,
      wing: 'left',
      radius: 3 + Math.random() * 2
    });
  }

  for (let i = 0; i < rightCount; i++) {
    const t = i / rightCount;
    const x = 5 + t * 20;
    const yOffset = (1 - Math.abs(t - 0.5) * 2) * 15;
    particles.push({
      offsetX: x,
      offsetY: -yOffset + Math.random() * yOffset * 2,
      baseY: 0,
      wing: 'right',
      radius: 3 + Math.random() * 2
    });
  }

  for (let i = 0; i < bodyCount; i++) {
    const t = i / bodyCount;
    particles.push({
      offsetX: -2 + t * 4,
      offsetY: -12 + t * 24,
      baseY: 0,
      wing: 'body',
      radius: 3 + Math.random() * 1.5
    });
  }

  for (const p of particles) {
    p.baseY = p.offsetY;
  }

  return particles;
}

export class Butterfly {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  velocityX: number;
  velocityY: number;
  particles: ButterflyParticle[];
  wingPhase: number;
  wingFrequency: number;
  colorPalette: string[];
  colorPhase: number;
  trailHistory: { x: number; y: number }[];
  mousePrevX: number;
  mousePrevY: number;
  mouseSpeed: number;

  constructor(startX: number, startY: number) {
    this.x = startX;
    this.y = startY;
    this.targetX = startX;
    this.targetY = startY;
    this.velocityX = 0;
    this.velocityY = 0;
    this.particles = buildButterflyParticles();
    this.wingPhase = 0;
    this.wingFrequency = 1;
    this.colorPalette = buildColorPalette();
    this.colorPhase = 0;
    this.trailHistory = [];
    this.mousePrevX = startX;
    this.mousePrevY = startY;
    this.mouseSpeed = 0;
  }

  setTarget(x: number, y: number): void {
    const dx = x - this.mousePrevX;
    const dy = y - this.mousePrevY;
    this.mouseSpeed = Math.sqrt(dx * dx + dy * dy);
    this.mousePrevX = x;
    this.mousePrevY = y;
    this.targetX = x;
    this.targetY = y;

    const speedNorm = Math.min(1, this.mouseSpeed / 15);
    this.wingFrequency = 0.5 + speedNorm * 2.5;
  }

  update(windSystem: WindSystem): void {
    const wind = windSystem.getWindInfluence(this.x, this.y);
    const smoothFactor = 0.12;
    this.velocityX = (this.targetX - this.x) * smoothFactor + wind.vx;
    this.velocityY = (this.targetY - this.y) * smoothFactor + wind.vy;
    this.x += this.velocityX;
    this.y += this.velocityY;

    this.wingPhase += (Math.PI * 2 * this.wingFrequency) / 60;
    this.colorPhase += 0.8;
    if (this.colorPhase >= 360) this.colorPhase -= 360;

    this.trailHistory.unshift({ x: this.x, y: this.y });
    if (this.trailHistory.length > 40) {
      this.trailHistory.pop();
    }
  }

  getCurrentColor(): string {
    const idx = Math.floor(this.colorPhase) % this.colorPalette.length;
    return this.colorPalette[idx];
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const wingSin = Math.sin(this.wingPhase);
    const alphaCycle = 0.7 + (Math.abs(wingSin)) * 0.3;
    const color = this.getCurrentColor();

    for (const p of this.particles) {
      let px = this.x + p.offsetX;
      let py;

      if (p.wing === 'left') {
        const wingFlap = wingSin * 8 * (1 - Math.abs(p.offsetX + 15) / 20);
        py = this.y + p.baseY + wingFlap;
      } else if (p.wing === 'right') {
        const wingFlap = wingSin * 8 * (1 - Math.abs(p.offsetX - 15) / 20);
        py = this.y + p.baseY + wingFlap;
      } else {
        py = this.y + p.baseY;
      }

      ctx.globalAlpha = alphaCycle;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
