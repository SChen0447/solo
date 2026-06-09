import type { SamplePoint, BezierSegment, StrokeSegment } from './brush';

export interface InkDiffusion {
  strokeIndex: number;
  centerX: number;
  centerY: number;
  initialWidth: number;
  elapsed: number;
  duration: number;
  samples: { x: number; y: number; width: number }[];
}

interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

export class InkRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private diffusions: InkDiffusion[] = [];
  private strokeLayer: HTMLCanvasElement;
  private strokeCtx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.strokeLayer = document.createElement('canvas');
    this.strokeLayer.width = canvas.width;
    this.strokeLayer.height = canvas.height;
    const sCtx = this.strokeLayer.getContext('2d');
    if (!sCtx) throw new Error('Stroke layer context not available');
    this.strokeCtx = sCtx;
  }

  resize(width: number, height: number): void {
    const temp = document.createElement('canvas');
    temp.width = this.strokeLayer.width;
    temp.height = this.strokeLayer.height;
    temp.getContext('2d')?.drawImage(this.strokeLayer, 0, 0);

    this.canvas.width = width;
    this.canvas.height = height;
    this.strokeLayer.width = width;
    this.strokeLayer.height = height;

    this.strokeCtx.drawImage(temp, 0, 0, temp.width, temp.height, 0, 0, width, height);
  }

  clear(): void {
    this.strokeCtx.clearRect(0, 0, this.strokeLayer.width, this.strokeLayer.height);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.diffusions = [];
  }

  renderStrokeToLayer(
    points: SamplePoint[],
    bezierSegments: BezierSegment[],
    brushSize: number,
    inkDensity: number,
    inkColor: string,
    strokeIndex: number,
    isRealtime: boolean = false
  ): void {
    if (points.length < 2) return;

    const color = this.hexToRgb(inkColor);
    const samples: { x: number; y: number; width: number }[] = [];

    for (let si = 0; si < bezierSegments.length; si++) {
      const seg = bezierSegments[si];
      const steps = 20;

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const pt = this.getPointOnBezier(seg, t);
        const width = this.getWidthAtPressure(pt.pressure, brushSize);

        samples.push({ x: pt.x, y: pt.y, width });

        this.drawInkDab(
          this.strokeCtx,
          pt.x,
          pt.y,
          width,
          inkDensity,
          color
        );
      }
    }

    if (isRealtime && samples.length > 0) {
      const centerSample = samples[Math.floor(samples.length / 2)];
      this.diffusions.push({
        strokeIndex,
        centerX: centerSample.x,
        centerY: centerSample.y,
        initialWidth: brushSize,
        elapsed: 0,
        duration: 2000,
        samples
      });
    }
  }

  renderCompleteStroke(
    stroke: StrokeSegment,
    strokeIndex: number
  ): void {
    this.renderStrokeToLayer(
      stroke.points,
      stroke.bezierControlPoints,
      stroke.brushSize,
      stroke.inkDensity,
      stroke.inkColor,
      strokeIndex,
      true
    );
  }

  renderLivePreview(
    points: SamplePoint[],
    brushSize: number,
    inkDensity: number,
    inkColor: string
  ): void {
    if (points.length < 2) return;

    const color = this.hexToRgb(inkColor);

    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const w0 = this.getWidthAtPressure(p0.pressure, brushSize);
      const w1 = this.getWidthAtPressure(p1.pressure, brushSize);

      this.drawInkLine(
        this.strokeCtx,
        p0.x, p0.y, w0,
        p1.x, p1.y, w1,
        inkDensity,
        color
      );
    }
  }

  updateDiffusions(deltaTime: number): void {
    const completed: number[] = [];

    for (let i = 0; i < this.diffusions.length; i++) {
      const diff = this.diffusions[i];
      diff.elapsed += deltaTime;

      if (diff.elapsed >= diff.duration) {
        completed.push(i);
        continue;
      }

      const progress = diff.elapsed / diff.duration;
      const maxRadius = diff.initialWidth * 1.5;
      const currentRadius = maxRadius * progress;

      for (const sample of diff.samples) {
        this.drawDiffusion(
          this.strokeCtx,
          sample.x,
          sample.y,
          currentRadius,
          sample.width,
          0.15 * (1 - progress)
        );
      }
    }

    for (let i = completed.length - 1; i >= 0; i--) {
      this.diffusions.splice(completed[i], 1);
    }
  }

  composeFrame(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.strokeLayer, 0, 0);
  }

  private drawInkDab(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    density: number,
    color: ColorRGB
  ): void {
    const radius = width / 2;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    const alpha = density;

    gradient.addColorStop(0, `rgba(${color.r},${color.g},${color.b},${alpha})`);
    gradient.addColorStop(0.6, `rgba(${color.r},${color.g},${color.b},${alpha * 0.8})`);
    gradient.addColorStop(1, `rgba(${color.r},${color.g},${color.b},0)`);

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawInkLine(
    ctx: CanvasRenderingContext2D,
    x0: number, y0: number, w0: number,
    x1: number, y1: number, w1: number,
    density: number,
    color: ColorRGB
  ): void {
    const steps = Math.max(1, Math.ceil(Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2) / 2));

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      const w = w0 + (w1 - w0) * t;
      this.drawInkDab(ctx, x, y, w, density, color);
    }
  }

  private drawDiffusion(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    innerWidth: number,
    baseAlpha: number
  ): void {
    if (radius <= innerWidth / 2) return;

    const innerR = innerWidth / 2;
    const gradient = ctx.createRadialGradient(x, y, innerR, x, y, radius);

    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const gaussianAlpha = this.gaussian(t, 0.5) * baseAlpha;
      gradient.addColorStop(t, `rgba(0,0,0,${gaussianAlpha})`);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private gaussian(x: number, sigma: number): number {
    return Math.exp(-(x * x) / (2 * sigma * sigma));
  }

  private getPointOnBezier(
    segment: BezierSegment,
    t: number
  ): { x: number; y: number; pressure: number } {
    const { p0, p1, p2, p3 } = segment;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    const x = mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x;
    const y = mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y;
    const pressure = p0.pressure + (p3.pressure - p0.pressure) * t;

    return { x, y, pressure };
  }

  private getWidthAtPressure(pressure: number, baseSize: number): number {
    return baseSize * (0.3 + pressure * 0.9);
  }

  private hexToRgb(hex: string): ColorRGB {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 26, g: 26, b: 26 };
  }
}
