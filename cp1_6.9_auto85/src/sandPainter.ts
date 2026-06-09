interface Point {
  x: number;
  y: number;
  timestamp: number;
}

interface SettleSegment {
  points: Point[];
  width: number;
  startTime: number;
}

interface SandPainterOptions {
  canvas: HTMLCanvasElement;
  minWidth?: number;
  maxWidth?: number;
  sandColor?: string;
  blurRadius?: number;
  settleDuration?: number;
  rippleDuration?: number;
  bgColorStart?: string;
  bgColorEnd?: string;
}

const DEFAULT_OPTIONS: Required<Omit<SandPainterOptions, 'canvas'>> = {
  minWidth: 6,
  maxWidth: 20,
  sandColor: '#4a2c15',
  blurRadius: 2,
  settleDuration: 500,
  rippleDuration: 800,
  bgColorStart: '#3a2010',
  bgColorEnd: '#1a0f05'
};

export class SandPainter {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  private cssWidth: number = 0;
  private cssHeight: number = 0;
  private isDrawing: boolean = false;
  private lastPoint: Point | null = null;
  private currentWidth: number;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingSettle: SettleSegment | null = null;
  private rippleRAF: number | null = null;
  private isClearing: boolean = false;

  private minWidth: number;
  private maxWidth: number;
  private sandColor: string;
  private sandColorDarkened: string;
  private blurRadius: number;
  private settleDuration: number;
  private rippleDuration: number;
  private bgColorStart: string;
  private bgColorEnd: string;

  constructor(options: SandPainterOptions) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    this.canvas = opts.canvas;
    this.ctx = this.canvas.getContext('2d')!;
    this.dpr = window.devicePixelRatio || 1;
    this.minWidth = opts.minWidth;
    this.maxWidth = opts.maxWidth;
    this.sandColor = opts.sandColor;
    this.sandColorDarkened = this.darkenColor(opts.sandColor, 0.1);
    this.blurRadius = opts.blurRadius;
    this.settleDuration = opts.settleDuration;
    this.rippleDuration = opts.rippleDuration;
    this.bgColorStart = opts.bgColorStart;
    this.bgColorEnd = opts.bgColorEnd;
    this.currentWidth = (this.minWidth + this.maxWidth) / 2;

    this.resize();
  }

  private darkenColor(hex: string, amount: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const nr = Math.max(0, Math.floor(r * (1 - amount)));
    const ng = Math.max(0, Math.floor(g * (1 - amount)));
    const nb = Math.max(0, Math.floor(b * (1 - amount)));
    return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.cssWidth = rect.width;
    this.cssHeight = rect.height;
    this.dpr = window.devicePixelRatio || 1;

    this.canvas.width = Math.floor(this.cssWidth * this.dpr);
    this.canvas.height = Math.floor(this.cssHeight * this.dpr);

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);

    this.drawBackground();
  }

  private drawBackground(): void {
    const gradient = this.ctx.createRadialGradient(
      this.cssWidth / 2,
      this.cssHeight / 2,
      0,
      this.cssWidth / 2,
      this.cssHeight / 2,
      Math.max(this.cssWidth, this.cssHeight) / 1.2
    );
    gradient.addColorStop(0, this.bgColorStart);
    gradient.addColorStop(1, this.bgColorEnd);

    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);
  }

  private calculateSpeed(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const dt = Math.max(1, p2.timestamp - p1.timestamp);
    return dist / dt;
  }

  private calculateWidth(speed: number): number {
    const minSpeed = 0.1;
    const maxSpeed = 2.0;
    const normalizedSpeed = Math.min(1, Math.max(0, (speed - minSpeed) / (maxSpeed - minSpeed)));
    const t = 1 - normalizedSpeed;
    return this.minWidth + t * (this.maxWidth - this.minWidth);
  }

  startStroke(x: number, y: number): void {
    if (this.isClearing) return;
    this.isDrawing = true;
    this.lastPoint = { x, y, timestamp: performance.now() };
    this.currentWidth = (this.minWidth + this.maxWidth) / 2;

    if (this.settleTimer) {
      clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }
    this.pendingSettle = {
      points: [{ ...this.lastPoint }],
      width: this.currentWidth,
      startTime: this.lastPoint.timestamp
    };

    this.drawSandDot(x, y, this.currentWidth);
  }

  moveStroke(x: number, y: number): void {
    if (!this.isDrawing || !this.lastPoint || this.isClearing) return;

    const currentPoint: Point = { x, y, timestamp: performance.now() };
    const speed = this.calculateSpeed(this.lastPoint, currentPoint);
    this.currentWidth = this.calculateWidth(speed);

    this.interpolateAndDraw(this.lastPoint, currentPoint, this.currentWidth);

    if (this.pendingSettle) {
      this.pendingSettle.points.push(currentPoint);
      this.pendingSettle.width = this.currentWidth;
    }

    this.lastPoint = currentPoint;
  }

  endStroke(): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.lastPoint = null;

    if (this.pendingSettle) {
      const segment = this.pendingSettle;
      this.pendingSettle = null;

      this.settleTimer = setTimeout(() => {
        this.settleSegment(segment);
        this.settleTimer = null;
      }, this.settleDuration);
    }
  }

  private interpolateAndDraw(p1: Point, p2: Point, width: number): void {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = Math.max(1, width * 0.15);
    const steps = Math.ceil(dist / step);

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const ix = p1.x + dx * t;
      const iy = p1.y + dy * t;
      this.drawSandDot(ix, iy, width);
    }
  }

  private drawSandDot(cx: number, cy: number, width: number): void {
    const particleCount = Math.floor(width * 0.8);

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.shadowColor = this.sandColor;
    this.ctx.shadowBlur = this.blurRadius;

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * (width / 2);
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      const particleSize = 3 + Math.random() * 2;

      const noise = (Math.random() - 0.5) * 20;
      const color = this.addColorNoise(this.sandColor, noise);

      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(px, py, particleSize / 2, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  private addColorNoise(hex: string, noise: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const nr = Math.max(0, Math.min(255, Math.round(r + noise)));
    const ng = Math.max(0, Math.min(255, Math.round(g + noise)));
    const nb = Math.max(0, Math.min(255, Math.round(b + noise)));
    return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
  }

  private settleSegment(segment: SettleSegment): void {
    if (segment.points.length < 1) return;

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = 0.4;
    this.ctx.shadowColor = this.sandColorDarkened;
    this.ctx.shadowBlur = this.blurRadius * 0.5;

    for (let i = 0; i < segment.points.length - 1; i++) {
      const p1 = segment.points[i];
      const p2 = segment.points[i + 1];
      this.interpolateSettle(p1, p2, segment.width);
    }

    if (segment.points.length === 1) {
      const p = segment.points[0];
      this.drawSettleDot(p.x, p.y, segment.width);
    }

    this.ctx.restore();
  }

  private interpolateSettle(p1: Point, p2: Point, width: number): void {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = Math.max(1, width * 0.2);
    const steps = Math.ceil(dist / step);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const ix = p1.x + dx * t;
      const iy = p1.y + dy * t;
      this.drawSettleDot(ix, iy, width);
    }
  }

  private drawSettleDot(cx: number, cy: number, width: number): void {
    const particleCount = Math.floor(width * 0.4);

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * (width / 2.5);
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius + Math.random() * 1.5;
      const particleSize = 2 + Math.random() * 2;

      this.ctx.fillStyle = this.sandColorDarkened;
      this.ctx.beginPath();
      this.ctx.arc(px, py, particleSize / 2, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  clearWithRipple(onComplete?: () => void): void {
    if (this.isClearing) return;
    this.isClearing = true;
    this.isDrawing = false;

    if (this.settleTimer) {
      clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }
    this.pendingSettle = null;
    this.lastPoint = null;

    const centerX = this.cssWidth / 2;
    const centerY = this.cssHeight / 2;
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY) * 1.1;
    const startTime = performance.now();
    const duration = this.rippleDuration;

    const savedImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentRadius = maxRadius * eased;

      this.ctx.putImageData(savedImageData, 0, 0);
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(this.dpr, this.dpr);

      this.ctx.save();
      this.ctx.globalCompositeOperation = 'destination-out';

      const gradient = this.ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, currentRadius
      );
      gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
      gradient.addColorStop(Math.max(0, 1 - 0.15 / Math.max(0.01, progress)), 'rgba(0, 0, 0, 0.85)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();

      if (progress < 1) {
        this.rippleRAF = requestAnimationFrame(animate);
      } else {
        this.rippleRAF = null;
        this.drawBackground();
        this.isClearing = false;
        onComplete?.();
      }
    };

    this.rippleRAF = requestAnimationFrame(animate);
  }

  getCurrentStrokeWidth(): number {
    return this.currentWidth;
  }

  destroy(): void {
    if (this.settleTimer) {
      clearTimeout(this.settleTimer);
    }
    if (this.rippleRAF) {
      cancelAnimationFrame(this.rippleRAF);
    }
  }
}
