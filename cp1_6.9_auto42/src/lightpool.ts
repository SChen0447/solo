import type p5 from 'p5';

type Phase = 'expand' | 'hold' | 'fade';

interface ReflectionLine {
  y: number;
  width: number;
  offset: number;
}

export class LightPool {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: p5.Color;
  baseColor: p5.Color;
  phase: Phase;
  age: number;
  opacity: number;
  reflectionLines: ReflectionLine[];
  shadowBlur: number;
  isHighlighted: boolean;
  highlightBoost: number;

  private static readonly EXPAND_DURATION = 1.5;
  private static readonly HOLD_DURATION = 3.0;
  private static readonly FADE_DURATION = 0.5;
  private static readonly INITIAL_RADIUS = 5;

  constructor(p: p5, x: number, y: number, color: p5.Color) {
    this.x = x;
    this.y = y;
    this.radius = LightPool.INITIAL_RADIUS;
    this.maxRadius = 35;
    this.baseColor = color;
    this.color = color;
    this.phase = 'expand';
    this.age = 0;
    this.opacity = 1;
    this.shadowBlur = p.random(8, 12);
    this.isHighlighted = false;
    this.highlightBoost = 0;

    const lineCount = Math.floor(p.random(2, 5));
    this.reflectionLines = [];
    for (let i = 0; i < lineCount; i++) {
      this.reflectionLines.push({
        y: p.random(-this.maxRadius * 0.6, this.maxRadius * 0.6),
        width: p.random(this.maxRadius * 0.3, this.maxRadius * 0.8),
        offset: p.random(-this.maxRadius * 0.2, this.maxRadius * 0.2)
      });
    }
  }

  update(dt: number) {
    this.age += dt;

    if (this.isHighlighted) {
      this.highlightBoost = Math.min(1, this.highlightBoost + dt * 10);
    } else {
      this.highlightBoost = Math.max(0, this.highlightBoost - dt * 10);
    }

    switch (this.phase) {
      case 'expand':
        const expandProgress = this.age / LightPool.EXPAND_DURATION;
        const t = Math.min(1, expandProgress);
        this.radius = LightPool.INITIAL_RADIUS + (this.maxRadius - LightPool.INITIAL_RADIUS) * t;
        if (this.age >= LightPool.EXPAND_DURATION) {
          this.phase = 'hold';
          this.age = 0;
        }
        break;

      case 'hold':
        this.radius = this.maxRadius;
        if (this.age >= LightPool.HOLD_DURATION) {
          this.phase = 'fade';
          this.age = 0;
        }
        break;

      case 'fade':
        const fadeProgress = this.age / LightPool.FADE_DURATION;
        this.opacity = Math.max(0, 1 - fadeProgress);
        if (this.age >= LightPool.FADE_DURATION) {
          this.opacity = 0;
        }
        break;
    }
  }

  draw(p: p5) {
    if (this.opacity <= 0) return;

    const ctx = p.drawingContext as CanvasRenderingContext2D;
    const currentColor = this.getCurrentColor(p);
    const r = p.red(currentColor);
    const g = p.green(currentColor);
    const b = p.blue(currentColor);

    ctx.save();

    ctx.shadowBlur = this.shadowBlur * this.opacity;
    ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${this.opacity * 0.8})`;

    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.radius * 2, this.radius * 1.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${this.opacity * 0.6})`;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.radius * 1.6, this.radius * 0.9, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${this.opacity * 0.3})`;
    ctx.fill();

    ctx.restore();

    this.drawReflectionLines(p, r, g, b);
  }

  private drawReflectionLines(p: p5, r: number, g: number, b: number) {
    if (this.opacity <= 0) return;

    const brightR = Math.min(255, r + 50);
    const brightG = Math.min(255, g + 50);
    const brightB = Math.min(255, b + 50);

    p.noFill();
    for (const line of this.reflectionLines) {
      const lineWidth = line.width * (this.radius / this.maxRadius);
      const ly = this.y + line.y * (this.radius / this.maxRadius);
      const lx = this.x + line.offset * (this.radius / this.maxRadius);

      p.stroke(brightR, brightG, brightB, this.opacity * 128);
      p.strokeWeight(1);
      p.line(lx - lineWidth / 2, ly, lx + lineWidth / 2, ly);
    }
    p.noStroke();
  }

  private getCurrentColor(p: p5): p5.Color {
    if (this.highlightBoost <= 0) {
      return this.baseColor;
    }
    const baseR = p.red(this.baseColor);
    const baseG = p.green(this.baseColor);
    const baseB = p.blue(this.baseColor);
    const boostAmount = this.highlightBoost * 0.3;
    const hr = Math.min(255, baseR + (255 - baseR) * boostAmount);
    const hg = Math.min(255, baseG + (255 - baseG) * boostAmount);
    const hb = Math.min(255, baseB + (255 - baseB) * boostAmount);
    return p.color(hr, hg, hb);
  }

  isDead(): boolean {
    return this.phase === 'fade' && this.opacity <= 0;
  }

  containsPoint(px: number, py: number): boolean {
    if (this.opacity <= 0) return false;
    const dx = px - this.x;
    const dy = (py - this.y) * (2 / 1.2);
    return dx * dx + dy * dy <= this.radius * this.radius;
  }

  getColor(): p5.Color {
    return this.baseColor;
  }

  setHighlight(highlighted: boolean) {
    this.isHighlighted = highlighted;
  }
}
