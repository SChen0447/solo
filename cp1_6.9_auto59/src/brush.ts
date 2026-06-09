export interface Point {
  x: number;
  y: number;
}

export interface WaterStain {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  maxAlpha: number;
  color: string;
  expanding: boolean;
  expandStartTime: number;
  expandDuration: number;
  expandAmount: number;
}

export interface BrushState {
  isDrawing: boolean;
  lastPoint: Point | null;
  controlPoint: Point | null;
  points: Point[];
  currentColor: string;
  baseSize: number;
  stains: WaterStain[];
}

export const INK_SHADES: Record<string, string> = {
  '焦墨': '#0A0A0A',
  '浓墨': '#333333',
  '重墨': '#555555',
  '淡墨': '#888888',
  '清墨': '#BBBBBB'
};

export const PIGMENTS: Record<string, string> = {
  '朱砂红': '#CC3333',
  '藤黄': '#E6A817',
  '石绿': '#2E8B57'
};

const CANVAS_BG = '#F5E6C8';
const CANVAS_W = 800;
const CANVAS_H = 600;

export class InkBrush {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: BrushState;
  private noiseCanvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = CANVAS_W;
    this.canvas.height = CANVAS_H;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.state = {
      isDrawing: false,
      lastPoint: null,
      controlPoint: null,
      points: [],
      currentColor: '#0A0A0A',
      baseSize: 20,
      stains: []
    };
    this.noiseCanvas = this.createNoiseTexture();
    this.initBackground();
  }

  private createNoiseTexture(): HTMLCanvasElement {
    const nc = document.createElement('canvas');
    nc.width = CANVAS_W;
    nc.height = CANVAS_H;
    const nctx = nc.getContext('2d')!;
    const imgData = nctx.createImageData(CANVAS_W, CANVAS_H);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const v = Math.floor(Math.random() * 40) - 20;
      imgData.data[i] = 245 + v;
      imgData.data[i + 1] = 230 + v;
      imgData.data[i + 2] = 200 + v;
      imgData.data[i + 3] = 35;
    }
    nctx.putImageData(imgData, 0, 0);
    return nc;
  }

  public initBackground(): void {
    this.ctx.fillStyle = CANVAS_BG;
    this.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    this.ctx.drawImage(this.noiseCanvas, 0, 0);
  }

  public setColor(color: string): void {
    this.state.currentColor = color;
  }

  public getColor(): string {
    return this.state.currentColor;
  }

  public setBaseSize(size: number): void {
    this.state.baseSize = size;
  }

  public getBaseSize(): number {
    return this.state.baseSize;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const h = hex.replace('#', '');
    const full = h.length === 3
      ? h.split('').map(c => c + c).join('')
      : h;
    return {
      r: parseInt(full.substring(0, 2), 16),
      g: parseInt(full.substring(2, 4), 16),
      b: parseInt(full.substring(4, 6), 16)
    };
  }

  private getBrushWidth(speed: number): number {
    const clampedSpeed = Math.max(1, Math.min(15, speed));
    let width: number;
    if (clampedSpeed <= 5) {
      const t = (clampedSpeed - 1) / 4;
      width = 4 + t * 4;
    } else {
      const t = (clampedSpeed - 5) / 10;
      width = 8 + t * 12;
    }
    const scale = this.state.baseSize / 20;
    return width * scale;
  }

  private bezierPoint(p0: Point, p1: Point, p2: Point, t: number): Point {
    const u = 1 - t;
    return {
      x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y
    };
  }

  private midpoint(a: Point, b: Point): Point {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  private drawStain(x: number, y: number, radius: number, color: string, alpha: number): void {
    const rgb = this.hexToRgb(color);
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`);
    gradient.addColorStop(0.6, `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha * 0.5})`);
    gradient.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'multiply';
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  public startStroke(x: number, y: number): void {
    this.state.isDrawing = true;
    this.state.lastPoint = { x, y };
    this.state.controlPoint = { x, y };
    this.state.points = [{ x, y }];
    const initialWidth = this.getBrushWidth(2);
    this.createStain(x, y, initialWidth, this.state.currentColor, true);
  }

  public continueStroke(x: number, y: number, dt: number): boolean {
    if (!this.state.isDrawing || !this.state.lastPoint) return false;

    const dx = x - this.state.lastPoint.x;
    const dy = y - this.state.lastPoint.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = dt > 0 ? dist / (dt / 1000) / 60 : 2;

    if (dist < 0.5) return false;

    const newPoint: Point = { x, y };
    const mid = this.midpoint(this.state.lastPoint, newPoint);

    const width = this.getBrushWidth(speed);
    const samples = Math.min(3, Math.max(1, Math.ceil(dist / 8)));

    for (let i = 0; i < samples; i++) {
      const t = (i + 1) / (samples + 1);
      const bp = this.bezierPoint(this.state.lastPoint, this.state.controlPoint, mid, t);
      const jitterX = (Math.random() - 0.5) * width * 0.15;
      const jitterY = (Math.random() - 0.5) * width * 0.15;
      const r = width * (0.6 + Math.random() * 0.4);
      this.createStain(bp.x + jitterX, bp.y + jitterY, r, this.state.currentColor, true);
    }

    this.state.controlPoint = mid;
    this.state.lastPoint = newPoint;
    this.state.points.push(newPoint);
    return true;
  }

  public endStroke(x: number, y: number): void {
    if (!this.state.isDrawing) return;
    this.state.isDrawing = false;
    const now = performance.now();
    for (const stain of this.state.stains) {
      if (stain.expanding) continue;
      stain.expanding = true;
      stain.expandStartTime = now;
      stain.expandDuration = 500;
      stain.expandAmount = 5 + Math.random() * 5;
    }
    this.state.lastPoint = null;
    this.state.controlPoint = null;
    this.state.points = [];
  }

  private createStain(x: number, y: number, radius: number, color: string, active: boolean): void {
    const alpha = 0.25 + Math.random() * 0.25;
    const stain: WaterStain = {
      x,
      y,
      radius,
      maxRadius: radius,
      alpha,
      maxAlpha: alpha,
      color,
      expanding: !active,
      expandStartTime: active ? 0 : performance.now(),
      expandDuration: 500,
      expandAmount: 5 + Math.random() * 5
    };
    this.state.stains.push(stain);
    this.drawStain(x, y, radius, color, alpha);
  }

  public update(now: number): void {
    const active: WaterStain[] = [];
    for (const stain of this.state.stains) {
      if (stain.expanding) {
        const elapsed = now - stain.expandStartTime;
        const progress = Math.min(1, elapsed / stain.expandDuration);
        const eased = 1 - Math.pow(1 - progress, 3);
        stain.radius = stain.maxRadius + stain.expandAmount * eased;
        stain.alpha = stain.maxAlpha * (1 - eased);
        if (progress < 1) {
          this.drawStain(stain.x, stain.y, stain.radius, stain.color, stain.alpha);
          active.push(stain);
        }
      } else {
        active.push(stain);
      }
    }
    this.state.stains = active;
  }

  public clear(): Promise<void> {
    return new Promise(resolve => {
      this.canvas.classList.add('clearing');
      setTimeout(() => {
        this.canvas.classList.remove('clearing');
        this.state.stains = [];
        this.initBackground();
        resolve();
      }, 1000);
    });
  }
}
