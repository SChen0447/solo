export type FunctionType = 'linear' | 'sinusoidal' | 'spherical' | 'helicoidal' | 'heart' | 'disc';

export const FUNCTION_LABELS: Record<FunctionType, string> = {
  linear: '线性',
  sinusoidal: '正弦',
  spherical: '球形',
  helicoidal: '螺旋',
  heart: '心形',
  disc: '碟形',
};

export interface ViewTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
  rotation: number;
}

interface AffineParams {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
  type: FunctionType;
  colorIdx: number;
}

const WARMUP_ITERATIONS = 100000;
const COLOR_LEVELS = 128;

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}

function lerpColor(a: [number, number, number], b: [number, number, number], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

export class Flame {
  private numPoints: number;
  private functions: AffineParams[];
  private colors: string[] = [];
  private colorStart: string;
  private colorEnd: string;
  private rotationSpeed: number = 1;
  private pointsX: Float32Array;
  private pointsY: Float32Array;
  private pointsColor: Uint8Array;
  private needsRecompute: boolean = true;

  constructor(
    numPoints: number = 50000,
    functionTypes: FunctionType[] = ['linear', 'sinusoidal', 'spherical', 'heart'],
    colors: [string, string] = ['#FF4500', '#FFD700']
  ) {
    this.numPoints = numPoints;
    this.colorStart = colors[0];
    this.colorEnd = colors[1];
    this.pointsX = new Float32Array(numPoints);
    this.pointsY = new Float32Array(numPoints);
    this.pointsColor = new Uint8Array(numPoints);
    this.functions = functionTypes.map((type, i) => this.createAffine(type, i));
    this.buildColorPalette();
  }

  private createAffine(type: FunctionType, index: number): AffineParams {
    const angle = (index / 4) * Math.PI * 2;
    const scale = 0.6 + Math.random() * 0.3;
    const rot = angle + rand(-0.3, 0.3);
    return {
      a: Math.cos(rot) * scale,
      b: -Math.sin(rot) * scale * (index % 2 === 0 ? 1 : -1),
      c: Math.sin(rot) * scale,
      d: Math.cos(rot) * scale,
      e: rand(-0.5, 0.5),
      f: rand(-0.5, 0.5),
      type,
      colorIdx: Math.floor((index / 4) * COLOR_LEVELS),
    };
  }

  private buildColorPalette(): void {
    this.colors = [];
    const start = hexToRgb(this.colorStart);
    const end = hexToRgb(this.colorEnd);
    for (let i = 0; i < COLOR_LEVELS; i++) {
      this.colors.push(lerpColor(start, end, i / (COLOR_LEVELS - 1)));
    }
  }

  private applyAffine(p: AffineParams, x: number, y: number): [number, number] {
    return [p.a * x + p.b * y + p.e, p.c * x + p.d * y + p.f];
  }

  private applyNonlinear(type: FunctionType, x: number, y: number): [number, number] {
    const r2 = x * x + y * y;
    const r = Math.sqrt(r2);
    const theta = Math.atan2(y, x);

    switch (type) {
      case 'linear':
        return [x, y];
      case 'sinusoidal':
        return [Math.sin(x), Math.sin(y)];
      case 'spherical':
        if (r2 < 1e-6) return [0, 0];
        return [x / r2, y / r2];
      case 'helicoidal':
        if (r < 1e-6) return [0, 0];
        return [(Math.cos(theta) + Math.sin(r)) / r, (Math.sin(theta) - Math.cos(r)) / r];
      case 'heart': {
        const h = r * Math.sin(r * theta);
        return [-r * Math.cos(theta), h];
      }
      case 'disc': {
        const t = theta / Math.PI;
        const p = Math.PI * r;
        return [t * Math.sin(p), t * Math.cos(p)];
      }
      default:
        return [x, y];
    }
  }

  setPoints(n: number): void {
    this.numPoints = n;
    this.pointsX = new Float32Array(n);
    this.pointsY = new Float32Array(n);
    this.pointsColor = new Uint8Array(n);
    this.needsRecompute = true;
  }

  setFunctions(types: FunctionType[]): void {
    this.functions = types.map((type, i) => this.createAffine(type, i));
    this.needsRecompute = true;
  }

  setColors(start: string, end: string): void {
    this.colorStart = start;
    this.colorEnd = end;
    this.buildColorPalette();
    this.needsRecompute = true;
  }

  setRotationSpeed(speed: number): void {
    this.rotationSpeed = speed;
  }

  getRotationSpeed(): number {
    return this.rotationSpeed;
  }

  iterate(): void {
    if (!this.needsRecompute) return;
    this.needsRecompute = false;

    let x = 0;
    let y = 0;
    const numFns = this.functions.length;

    for (let i = 0; i < WARMUP_ITERATIONS; i++) {
      const fnIdx = Math.floor(Math.random() * numFns);
      const fn = this.functions[fnIdx];
      const [ax, ay] = this.applyAffine(fn, x, y);
      const [nx, ny] = this.applyNonlinear(fn.type, ax, ay);
      x = nx;
      y = ny;
    }

    for (let i = 0; i < this.numPoints; i++) {
      const fnIdx = Math.floor(Math.random() * numFns);
      const fn = this.functions[fnIdx];
      const [ax, ay] = this.applyAffine(fn, x, y);
      const [nx, ny] = this.applyNonlinear(fn.type, ax, ay);
      x = nx;
      y = ny;
      this.pointsX[i] = x;
      this.pointsY[i] = y;
      const baseIdx = fn.colorIdx;
      const jitter = Math.floor(Math.random() * 20) - 10;
      this.pointsColor[i] = Math.max(0, Math.min(COLOR_LEVELS - 1, baseIdx + jitter));
    }
  }

  invalidate(): void {
    this.needsRecompute = true;
  }

  render(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, view: ViewTransform): void {
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#0D0D0D';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2 + view.offsetX;
    const cy = h / 2 + view.offsetY;
    const baseScale = Math.min(w, h) * 0.35;
    const scale = baseScale * view.scale;
    const cos = Math.cos(view.rotation);
    const sin = Math.sin(view.rotation);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const step = Math.max(1, Math.floor(this.numPoints / 30000));

    for (let i = 0; i < this.numPoints; i += step) {
      const px = this.pointsX[i];
      const py = this.pointsY[i];

      const rx = cos * px - sin * py;
      const ry = sin * px + cos * py;

      const screenX = cx + rx * scale;
      const screenY = cy + ry * scale;

      if (screenX < -5 || screenX > w + 5 || screenY < -5 || screenY > h + 5) continue;

      const colorIdx = this.pointsColor[i];
      ctx.fillStyle = this.colors[colorIdx];
      ctx.globalAlpha = 0.15;
      ctx.beginPath();
      ctx.arc(screenX, screenY, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
