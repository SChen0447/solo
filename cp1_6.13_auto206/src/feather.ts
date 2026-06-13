export const PALETTE = ['#ff6b6b', '#48dbfb', '#feca57', '#ff9ff3', '#54a0ff', '#a29bfe'] as const;

export type PaletteColor = (typeof PALETTE)[number];

export enum FloatMode {
  Drift = 1,
  Gather = 2,
  Scatter = 3,
}

export interface Particle {
  rx: number;
  ry: number;
  size: number;
  baseSize: number;
  phase: number;
  pulseFreq: number;
  opacity: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  color: string;
  alpha: number;
  born: number;
}

export interface Sparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  born: number;
  life: number;
}

export interface MergedInfo {
  partnerId: number;
  splitAt: number;
  originalFeather: Feather | null;
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToString(h: number, s: number, l: number, a: number = 1): string {
  return `hsla(${h.toFixed(1)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%, ${a.toFixed(3)})`;
}

let nextId = 0;

export class Feather {
  id: number;
  x: number;
  y: number;
  vx: number = 0;
  vy: number = 0;
  scale: number = 1;
  angle: number = 0;
  targetAngle: number = 0;
  baseLength: number;
  shaftLines: number;
  particles: Particle[];
  baseColor: PaletteColor;
  hsl: { h: number; s: number; l: number };
  opacity: number;
  colorPhase: number;
  colorCyclePeriod: number;
  driftPhase: number;
  driftAmplitude: number;
  driftPeriod: number;
  baseVy: number = 0;
  scatterVx: number = 0;
  scatterVy: number = 0;
  scatterStart: number = 0;
  isDragging: boolean = false;
  mergedInfo: MergedInfo | null = null;
  glowIntensity: number = 1;
  orbitAngle: number = 0;
  orbitRadius: number = 0;
  gatherSpeed: number = 0;

  constructor(x: number, y: number) {
    this.id = nextId++;
    this.x = x;
    this.y = y;
    this.baseLength = rand(40, 60);
    this.shaftLines = Math.floor(rand(10, 16));
    this.baseColor = PALETTE[Math.floor(Math.random() * PALETTE.length)] as PaletteColor;
    this.hsl = hexToHSL(this.baseColor);
    this.opacity = rand(0.7, 1.0);
    this.colorPhase = Math.random() * Math.PI * 2;
    this.colorCyclePeriod = rand(2, 4) * 1000;
    this.driftPhase = Math.random() * Math.PI * 2;
    this.driftAmplitude = rand(10, 15);
    this.driftPeriod = rand(2, 4) * 1000;
    this.orbitAngle = Math.random() * Math.PI * 2;
    this.orbitRadius = rand(20, 40);
    this.angle = rand(-0.3, 0.3);
    this.baseVy = rand(0.3, 0.8);
    this.gatherSpeed = rand(0.5, 1.5);

    const particleCount = Math.floor(rand(50, 81));
    this.particles = [];
    for (let i = 0; i < particleCount; i++) {
      const t = i / particleCount;
      const rx = rand(-this.baseLength * 0.4, this.baseLength * 0.4);
      const ry = t * this.baseLength - this.baseLength * 0.5;
      const widthAtT = Math.sin(t * Math.PI) * this.baseLength * 0.35;
      const px = rx * 0.3 + rand(-widthAtT, widthAtT);
      const baseSize = rand(1, 3);
      this.particles.push({
        rx: px,
        ry: ry + rand(-3, 3),
        size: baseSize,
        baseSize: baseSize,
        phase: Math.random() * Math.PI * 2,
        pulseFreq: rand(0.5, 1.0),
        opacity: rand(0.5, 0.9),
      });
    }
  }

  getCurrentColor(time: number): string {
    const cycleProgress = ((time + this.colorPhase * 500) % this.colorCyclePeriod) / this.colorCyclePeriod;
    const hueShift = Math.sin(cycleProgress * Math.PI * 2) * 30;
    const h = (this.hsl.h + hueShift + 360) % 360;
    const s = Math.max(70, Math.min(90, this.hsl.s + Math.sin(cycleProgress * Math.PI * 2) * 10));
    const l = Math.max(60, Math.min(80, this.hsl.l + Math.sin(cycleProgress * Math.PI * 2) * 10));
    return hslToString(h, s, l);
  }

  getCurrentHSL(time: number): { h: number; s: number; l: number } {
    const cycleProgress = ((time + this.colorPhase * 500) % this.colorCyclePeriod) / this.colorCyclePeriod;
    const hueShift = Math.sin(cycleProgress * Math.PI * 2) * 30;
    const h = (this.hsl.h + hueShift + 360) % 360;
    const s = Math.max(70, Math.min(90, this.hsl.s + Math.sin(cycleProgress * Math.PI * 2) * 10));
    const l = Math.max(60, Math.min(80, this.hsl.l + Math.sin(cycleProgress * Math.PI * 2) * 10));
    return { h, s, l };
  }

  update(time: number, dt: number, mode: FloatMode, mouseX: number, mouseY: number, canvasW: number, canvasH: number): void {
    if (this.isDragging) return;

    const dtSec = dt / 1000;

    switch (mode) {
      case FloatMode.Drift: {
        this.vy = this.baseVy;
        const angularFreq = (2 * Math.PI) / (this.driftPeriod / 1000);
        this.vx = this.driftAmplitude * angularFreq * Math.cos(angularFreq * (time / 1000) + this.driftPhase);
        this.vx = Math.max(-15, Math.min(15, this.vx));
        break;
      }
      case FloatMode.Gather: {
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > this.orbitRadius + 5) {
          this.vx = (dx / dist) * this.gatherSpeed;
          this.vy = (dy / dist) * this.gatherSpeed;
        } else {
          this.orbitAngle += dtSec * 1.5;
          const orbitSpeed = this.orbitRadius * 1.5;
          this.vx = -Math.sin(this.orbitAngle) * orbitSpeed;
          this.vy = Math.cos(this.orbitAngle) * orbitSpeed;
        }
        break;
      }
      case FloatMode.Scatter: {
        if (this.scatterStart === 0) {
          this.scatterStart = time;
          const angle = Math.random() * Math.PI * 2;
          const speed = rand(2, 4);
          this.scatterVx = Math.cos(angle) * speed;
          this.scatterVy = Math.sin(angle) * speed;
        }
        const elapsed = (time - this.scatterStart) / 1000;
        if (elapsed < 3) {
          this.scatterVx *= Math.pow(0.95, dtSec * 60);
          this.scatterVy *= Math.pow(0.95, dtSec * 60);
          this.vx = this.scatterVx;
          this.vy = this.scatterVy;
        } else {
          this.vx *= 0.9;
          this.vy *= 0.9;
        }
        break;
      }
    }

    this.x += this.vx * dtSec * 60;
    this.y += this.vy * dtSec * 60;

    if (this.x < -50) this.x = canvasW + 50;
    if (this.x > canvasW + 50) this.x = -50;
    if (this.y > canvasH + 50) {
      this.y = -50;
    }
    if (this.y < -50 && mode === FloatMode.Drift) {
      this.y = canvasH + 50;
    }

    const angleDiff = this.targetAngle - this.angle;
    this.angle += angleDiff * Math.min(1, dtSec * 5);

    for (const p of this.particles) {
      const pulse = Math.sin((time / 1000) * p.pulseFreq * Math.PI * 2 + p.phase);
      p.size = p.baseSize + pulse * 0.8;
    }
  }

  render(ctx: CanvasRenderingContext2D, time: number): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.scale(this.scale, this.scale);

    const currentHSL = this.getCurrentHSL(time);
    const colorStr = hslToString(currentHSL.h, currentHSL.s, currentHSL.l, this.opacity * this.glowIntensity);

    ctx.shadowColor = hslToString(currentHSL.h, currentHSL.s, currentHSL.l, 0.6);
    ctx.shadowBlur = 8 * this.glowIntensity;

    ctx.strokeStyle = colorStr;
    ctx.lineWidth = 0.8;
    ctx.lineCap = 'round';

    const shaftLen = this.baseLength * 0.9;
    ctx.beginPath();
    ctx.moveTo(0, -shaftLen * 0.5);
    ctx.lineTo(0, shaftLen * 0.5);
    ctx.stroke();

    for (let i = 0; i < this.shaftLines; i++) {
      const t = (i + 1) / (this.shaftLines + 1);
      const y = -shaftLen * 0.5 + t * shaftLen;
      const width = Math.sin(t * Math.PI) * this.baseLength * 0.3;
      const alpha = this.opacity * this.glowIntensity * 0.7;

      ctx.strokeStyle = hslToString(currentHSL.h, currentHSL.s, currentHSL.l, alpha);
      ctx.lineWidth = 0.5;

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.quadraticCurveTo(-width * 0.5, y - 2, -width, y + 1);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.quadraticCurveTo(width * 0.5, y - 2, width, y + 1);
      ctx.stroke();
    }

    ctx.shadowBlur = 4 * this.glowIntensity;
    for (const p of this.particles) {
      const alpha = p.opacity * this.opacity * this.glowIntensity;
      ctx.fillStyle = hslToString(currentHSL.h, currentHSL.s, currentHSL.l, alpha);
      ctx.beginPath();
      ctx.arc(p.rx, p.ry, Math.max(0.5, p.size), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.restore();
  }

  containsPoint(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return Math.sqrt(dx * dx + dy * dy) < this.baseLength * this.scale * 0.6;
  }

  distanceTo(px: number, py: number): number {
    const dx = px - this.x;
    const dy = py - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static checkFusion(f1: Feather, f2: Feather): 'none' | 'glow' | 'merge' {
    const dist = f1.distanceTo(f2.x, f2.y);
    const combinedRadius = (f1.baseLength + f2.baseLength) * 0.5 * Math.max(f1.scale, f2.scale);

    if (dist < 30) {
      if (dist < combinedRadius * 0.5) {
        return 'merge';
      }
      return 'glow';
    }
    return 'none';
  }

  static merge(f1: Feather, f2: Feather, time: number): Feather {
    const merged = new Feather((f1.x + f2.x) / 2, (f1.y + f2.y) / 2);
    merged.baseLength = (f1.baseLength + f2.baseLength) * 0.8;
    merged.scale = Math.max(f1.scale, f2.scale) * 1.2;
    merged.opacity = Math.max(f1.opacity, f2.opacity);

    const h1 = f1.hsl;
    const h2 = f2.hsl;
    merged.hsl = {
      h: (h1.h + h2.h) / 2,
      s: (h1.s + h2.s) / 2,
      l: (h1.l + h2.l) / 2,
    };

    const totalParticles = Math.min(80, f1.particles.length + f2.particles.length);
    merged.particles = [];
    for (let i = 0; i < totalParticles; i++) {
      const src = i < f1.particles.length ? f1.particles[i % f1.particles.length] : f2.particles[i % f2.particles.length];
      const baseSize = rand(1, 3);
      merged.particles.push({
        rx: src.rx * 1.1 + rand(-3, 3),
        ry: src.ry * 1.1 + rand(-3, 3),
        size: baseSize,
        baseSize: baseSize,
        phase: Math.random() * Math.PI * 2,
        pulseFreq: rand(0.5, 1.0),
        opacity: rand(0.5, 0.9),
      });
    }

    merged.mergedInfo = {
      partnerId: f2.id,
      splitAt: time + 5000,
      originalFeather: f1,
    };

    return merged;
  }

  static renderFusionGlow(ctx: CanvasRenderingContext2D, f1: Feather, f2: Feather, time: number): void {
    const mx = (f1.x + f2.x) / 2;
    const my = (f1.y + f2.y) / 2;
    const h1 = f1.getCurrentHSL(time);
    const h2 = f2.getCurrentHSL(time);
    const avgH = (h1.h + h2.h) / 2;
    const avgS = (h1.s + h2.s) / 2;
    const avgL = (h1.l + h2.l) / 2;

    const gradient = ctx.createRadialGradient(mx, my, 0, mx, my, 25);
    gradient.addColorStop(0, hslToString(avgH, avgS, avgL, 0.3));
    gradient.addColorStop(1, hslToString(avgH, avgS, avgL, 0));

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(mx, my, 25, 0, Math.PI * 2);
    ctx.fill();
  }
}
