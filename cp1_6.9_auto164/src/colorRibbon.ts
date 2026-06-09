import p5 from 'p5';
import { ColorDot, Ripple } from './colorDot';

interface Point {
  x: number;
  y: number;
  hue: number;
  speed: number;
}

export class ColorRibbon {
  p: p5;
  points: Point[];
  startDot: ColorDot;
  endDot: ColorDot | null;
  startHue: number;
  endHue: number;
  minWidth: number;
  maxWidth: number;
  isFading: boolean;
  fadeStartTime: number;
  fadeDuration: number;
  isAlive: boolean;
  breatheStartTime: number;
  breathePeriod: number;
  boostedTime: number;
  boostDuration: number;
  isBoosted: boolean;

  constructor(p: p5, startDot: ColorDot) {
    this.p = p;
    this.points = [];
    this.startDot = startDot;
    this.endDot = null;
    this.startHue = startDot.getHue();
    this.endHue = startDot.getHue();
    this.minWidth = 4;
    this.maxWidth = 8;
    this.isFading = false;
    this.fadeStartTime = 0;
    this.fadeDuration = 2000;
    this.isAlive = true;
    this.breatheStartTime = p.millis();
    this.breathePeriod = 800;
    this.boostedTime = 0;
    this.boostDuration = 500;
    this.isBoosted = false;

    this.points.push({
      x: startDot.x,
      y: startDot.y,
      hue: this.startHue,
      speed: 0
    });
  }

  addPoint(x: number, y: number, speed: number, hue: number): void {
    this.endHue = hue;
    this.points.push({ x, y, hue, speed });
  }

  setEndDot(dot: ColorDot): void {
    this.endDot = dot;
    this.endHue = dot.getHue();
  }

  startFading(): void {
    if (!this.isFading) {
      this.isFading = true;
      this.fadeStartTime = this.p.millis();
    }
  }

  triggerBoost(): void {
    this.isBoosted = true;
    this.boostedTime = this.p.millis();
  }

  checkRippleInteraction(ripples: Ripple[], dotX: number, dotY: number): void {
    for (const ripple of ripples) {
      for (const point of this.points) {
        const dx = point.x - dotX;
        const dy = point.y - dotY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (Math.abs(dist - ripple.radius) < 15) {
          this.triggerBoost();
          return;
        }
      }
    }
  }

  bezierPoint(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const mt = 1 - t;
    return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
  }

  getWidth(speed: number, baseBoost: number): number {
    const normalizedSpeed = Math.min(speed / 10, 1);
    const width = this.minWidth + (this.maxWidth - this.minWidth) * normalizedSpeed;
    return width + baseBoost;
  }

  lerpHue(h1: number, h2: number, t: number): number {
    let diff = h2 - h1;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return (h1 + diff * t + 360) % 360;
  }

  update(): boolean {
    if (this.isFading) {
      const elapsed = this.p.millis() - this.fadeStartTime;
      if (elapsed >= this.fadeDuration) {
        this.isAlive = false;
        return false;
      }
    }

    if (this.isBoosted) {
      const elapsed = this.p.millis() - this.boostedTime;
      if (elapsed >= this.boostDuration) {
        this.isBoosted = false;
      }
    }

    return true;
  }

  draw(): void {
    const p = this.p;

    if (this.points.length < 2) return;

    let fadeAlpha = 1;
    if (this.isFading) {
      const elapsed = p.millis() - this.fadeStartTime;
      fadeAlpha = 1 - elapsed / this.fadeDuration;
    }

    const breatheElapsed = p.millis() - this.breatheStartTime;
    const breathePhase = (breatheElapsed % this.breathePeriod) / this.breathePeriod;
    const breatheAlpha = 0.4 + 0.5 * (0.5 + 0.5 * Math.sin(breathePhase * Math.PI * 2));

    let boostAmount = 0;
    let brightnessBoost = 0;
    if (this.isBoosted) {
      const elapsed = p.millis() - this.boostedTime;
      const progress = elapsed / this.boostDuration;
      boostAmount = 2 * (1 - progress);
      brightnessBoost = 0.3 * (1 - progress);
    }

    p.noFill();

    const segments: { x: number; y: number; hue: number; speed: number }[] = [];

    for (let i = 0; i < this.points.length - 1; i++) {
      const p0 = this.points[Math.max(0, i - 1)];
      const p1 = this.points[i];
      const p2 = this.points[i + 1];
      const p3 = this.points[Math.min(this.points.length - 1, i + 2)];

      const steps = 20;
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const x = this.bezierPoint(t, p1.x, (p1.x + p2.x) / 2 + (p2.x - p0.x) / 6, (p1.x + p2.x) / 2 + (p1.x - p3.x) / 6, p2.x);
        const y = this.bezierPoint(t, p1.y, (p1.y + p2.y) / 2 + (p2.y - p0.y) / 6, (p1.y + p2.y) / 2 + (p1.y - p3.y) / 6, p2.y);
        const globalT = (i + t) / (this.points.length - 1);
        const hue = this.lerpHue(this.startHue, this.endHue, globalT);
        const speed = p1.speed + (p2.speed - p1.speed) * t;
        segments.push({ x, y, hue, speed });
      }
    }

    p.drawingContext.shadowBlur = 8;
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      const nextSeg = segments[i + 1];
      const avgSpeed = (seg.speed + nextSeg.speed) / 2;
      const width = this.getWidth(avgSpeed, boostAmount);
      const lightness = 70 + brightnessBoost * 30;
      const alpha = Math.min(breatheAlpha * fadeAlpha, 0.9);

      p.strokeWeight(width);
      const hue = (seg.hue + nextSeg.hue) / 2;
      p.drawingContext.shadowColor = `hsla(${hue}, 80%, ${lightness}%, ${alpha * 0.5})`;
      p.stroke(p.color(`hsla(${hue}, 80%, ${lightness}%, ${alpha})`));
      p.line(seg.x, seg.y, nextSeg.x, nextSeg.y);
    }
    p.drawingContext.shadowBlur = 0;
  }

  getEndPosition(): { x: number; y: number } | null {
    if (this.points.length === 0) return null;
    const last = this.points[this.points.length - 1];
    return { x: last.x, y: last.y };
  }
}
