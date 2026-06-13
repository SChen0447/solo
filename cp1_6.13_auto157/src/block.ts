export interface TrailPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface DisplaySize {
  canvasWidth: number;
  canvasHeight: number;
  isSmall: boolean;
}

export class Block {
  public id: number;
  public x: number;
  public y: number;
  public baseColor: string;
  public currentColor: string;
  public targetColor: string | null = null;
  public colorTransitionStart: number = 0;
  public colorTransitionDuration: number = 0;
  public size: number = 32;
  public displaySize: number = 32;
  public scale: number = 1;
  public targetScale: number = 1;
  public isDragging: boolean = false;
  public dragOffsetX: number = 0;
  public dragOffsetY: number = 0;
  public showNumber: boolean = false;
  public trail: TrailPoint[] = [];
  public static readonly TRAIL_LENGTH = 5;
  public static readonly TRAIL_FADE_TIME = 500;
  public bounceStartTime: number = 0;
  public bounceStartScale: number = 1;
  public isBouncing: boolean = false;
  public static readonly BOUNCE_DURATION = 300;
  public static readonly BOUNCE_ELASTICITY = 0.8;

  private static readonly RAINBOW_COLORS: string[] = [
    '#e74c3c',
    '#e67e22',
    '#f1c40f',
    '#2ecc71',
    '#1abc9c',
    '#3498db',
    '#9b59b6',
    '#e91e63',
    '#00bcd4',
    '#ff9800',
  ];

  constructor(id: number, x: number, y: number) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.baseColor = Block.RAINBOW_COLORS[id % 10];
    this.currentColor = this.baseColor;
  }

  public get centerX(): number {
    return this.x + this.size / 2;
  }

  public get centerY(): number {
    return this.y + this.size / 2;
  }

  public setSize(newSize: number): void {
    this.size = newSize;
  }

  public containsPoint(px: number, py: number): boolean {
    return (
      px >= this.x &&
      px <= this.x + this.size &&
      py >= this.y &&
      py <= this.y + this.size
    );
  }

  public startDrag(pointerX: number, pointerY: number): void {
    this.isDragging = true;
    this.dragOffsetX = pointerX - this.x;
    this.dragOffsetY = pointerY - this.y;
    this.targetScale = 40 / this.size;
  }

  public updateDrag(pointerX: number, pointerY: number, canvasW: number, canvasH: number): void {
    if (!this.isDragging) return;
    let newX = pointerX - this.dragOffsetX;
    let newY = pointerY - this.dragOffsetY;
    const displaySize = this.size * this.targetScale;
    newX = Math.max(0, Math.min(canvasW - displaySize, newX));
    newY = Math.max(0, Math.min(canvasH - displaySize, newY));
    this.x = newX;
    this.y = newY;
  }

  public endDrag(): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.isBouncing = true;
    this.bounceStartTime = performance.now();
    this.bounceStartScale = this.targetScale;
    this.targetScale = 1;
  }

  public setTargetColor(color: string, durationMs: number): void {
    this.targetColor = color;
    this.colorTransitionStart = performance.now();
    this.colorTransitionDuration = durationMs;
  }

  public addTrailPoint(): void {
    const now = performance.now();
    this.trail.push({ x: this.x, y: this.y, timestamp: now });
    if (this.trail.length > Block.TRAIL_LENGTH) {
      this.trail.shift();
    }
  }

  public update(now: number): void {
    if (this.isBouncing) {
      const elapsed = now - this.bounceStartTime;
      const progress = Math.min(elapsed / Block.BOUNCE_DURATION, 1);
      const elasticT = 1 - Math.pow(1 - progress, 2);
      const overshoot = Block.BOUNCE_ELASTICITY;
      const bounceProgress = elasticT;
      let eased: number;
      if (bounceProgress < 0.5) {
        const t = bounceProgress * 2;
        eased = t * t * ((overshoot + 1) * t - overshoot) * 0.5;
      } else {
        const t = (bounceProgress - 0.5) * 2;
        eased = 0.5 + (t * t * ((overshoot + 1) * t - overshoot) + 1) * 0.5;
      }
      this.scale = this.bounceStartScale + (1 - this.bounceStartScale) * eased;
      if (progress >= 1) {
        this.scale = 1;
        this.isBouncing = false;
      }
    } else if (this.isDragging) {
      const target = this.targetScale;
      this.scale += (target - this.scale) * 0.2;
    } else {
      this.scale += (1 - this.scale) * 0.15;
    }
    this.displaySize = this.size * this.scale;

    if (this.targetColor && this.colorTransitionDuration > 0) {
      const elapsed = now - this.colorTransitionStart;
      const progress = Math.min(elapsed / this.colorTransitionDuration, 1);
      this.currentColor = this.lerpColor(this.baseColor, this.targetColor, this.easeInOutQuad(progress));
      if (progress >= 1) {
        this.baseColor = this.targetColor;
        this.currentColor = this.targetColor;
        this.targetColor = null;
      }
    }

    const cutoff = now - Block.TRAIL_FADE_TIME;
    while (this.trail.length > 0 && this.trail[0].timestamp < cutoff) {
      this.trail.shift();
    }
  }

  public draw(ctx: CanvasRenderingContext2D, _display: DisplaySize, _bpm: number, trailsEnabled: boolean = false): void {
    const now = performance.now();
    if (trailsEnabled) {
      this.drawTrail(ctx, now);
    }

    const sizeOffset = (this.displaySize - this.size) / 2;
    const drawX = this.x - sizeOffset;
    const drawY = this.y - sizeOffset;

    if (this.isDragging) {
      ctx.save();
      ctx.shadowColor = `rgba(0, 0, 0, 0.5)`;
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = this.currentColor;
      ctx.fillRect(drawX, drawY, this.displaySize, this.displaySize);
      ctx.restore();
    } else {
      ctx.fillStyle = this.currentColor;
      ctx.fillRect(drawX, drawY, this.displaySize, this.displaySize);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(drawX, drawY, this.displaySize, this.displaySize);

    if (this.showNumber) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px monospace';
      ctx.textBaseline = 'top';
      ctx.fillText(String(this.id), drawX + 3, drawY + 2);
      ctx.restore();
    }
  }

  private drawTrail(ctx: CanvasRenderingContext2D, now: number): void {
    const len = this.trail.length;
    for (let i = 0; i < len; i++) {
      const point = this.trail[i];
      const age = now - point.timestamp;
      if (age > Block.TRAIL_FADE_TIME) continue;
      const alphaStep = 0.2;
      const baseAlpha = (i + 1) / (Block.TRAIL_LENGTH + 1);
      const timeFade = 1 - age / Block.TRAIL_FADE_TIME;
      const alpha = Math.max(0, Math.min(1, baseAlpha * timeFade * alphaStep * 5));
      const size = this.size * (0.7 + (i / len) * 0.3);
      const offsetX = (this.size - size) / 2;
      ctx.fillStyle = this.hexToRgba(this.currentColor, alpha);
      ctx.fillRect(point.x + offsetX, point.y + offsetX, size, size);
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  private lerpColor(a: string, b: string, t: number): string {
    const ah = a.replace('#', '');
    const bh = b.replace('#', '');
    const ar = parseInt(ah.substring(0, 2), 16);
    const ag = parseInt(ah.substring(2, 4), 16);
    const ab = parseInt(ah.substring(4, 6), 16);
    const br = parseInt(bh.substring(0, 2), 16);
    const bg = parseInt(bh.substring(2, 4), 16);
    const bb = parseInt(bh.substring(4, 6), 16);
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  public resetColor(): void {
    this.baseColor = Block.RAINBOW_COLORS[this.id % 10];
    this.currentColor = this.baseColor;
    this.targetColor = null;
  }

  public static randomColor(): string {
    const colors = Block.RAINBOW_COLORS;
    return colors[Math.floor(Math.random() * colors.length)];
  }

  public getColorDot(): string {
    return this.baseColor;
  }
}
