import type { LeafGeometry, LeafParams, Point, Vein } from './leafGenerator';

const VEIN_COLOR = '#1a3a15';
const PETIOLE_COLOR = '#3d2817';
const BG_COLOR = '#f5f2e8';

interface SwingState {
  amplitude: number;
  frequency: number;
  phase: number;
  noiseSeed: number;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const h = Math.max(0, Math.min(255, Math.round(x))).toString(16);
        return h.length === 1 ? '0' + h : h;
      })
      .join('')
  );
}

function darkenColor(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

function noise1D(x: number, seed: number): number {
  const s = Math.sin(x * 12.9898 + seed * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function smoothNoise(x: number, seed: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const a = noise1D(i, seed);
  const b = noise1D(i + 1, seed);
  const t = f * f * (3 - 2 * f);
  return a + (b - a) * t;
}

export class LeafRenderer {
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private swingState: SwingState;
  private startTime: number;

  constructor() {
    this.offscreenCanvas = document.createElement('canvas');
    const ctx = this.offscreenCanvas.getContext('2d');
    if (!ctx) throw new Error('无法创建离屏 Canvas 上下文');
    this.offscreenCtx = ctx;
    this.startTime = performance.now();
    this.swingState = {
      amplitude: 3,
      frequency: 1.0,
      phase: 0,
      noiseSeed: Math.random() * 1000
    };
  }

  setSwingParams(amplitude: number, frequency: number): void {
    this.swingState.amplitude = amplitude;
    this.swingState.frequency = frequency;
  }

  renderToOffscreen(geometry: LeafGeometry, params: LeafParams): void {
    const bounds = this.calculateBounds(geometry);
    const padding = 40;
    const w = Math.ceil(bounds.maxX - bounds.minX + padding * 2);
    const h = Math.ceil(bounds.maxY - bounds.minY + padding * 2);

    this.offscreenCanvas.width = Math.max(1, w);
    this.offscreenCanvas.height = Math.max(1, h);

    const ctx = this.offscreenCtx;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(padding - bounds.minX, padding - bounds.minY);

    this.drawLeafBody(ctx, geometry, params);
    this.drawVeins(ctx, geometry);
    this.drawSpots(ctx, geometry, params);
    this.drawPetiole(ctx, geometry);

    ctx.restore();
  }

  renderToDisplay(
    displayCtx: CanvasRenderingContext2D,
    displayW: number,
    displayH: number
  ): void {
    displayCtx.fillStyle = BG_COLOR;
    displayCtx.fillRect(0, 0, displayW, displayH);

    const elapsed = (performance.now() - this.startTime) / 1000;
    const { amplitude, frequency, noiseSeed } = this.swingState;

    const baseSwing = Math.sin(elapsed * 2 * Math.PI * frequency + this.swingState.phase);
    const noiseVal = smoothNoise(elapsed * 2 + noiseSeed * 0.01, noiseSeed);
    const noise = (noiseVal - 0.5) * 0.6;
    const totalSwing = baseSwing * amplitude + noise * amplitude;

    const rotAngle = (totalSwing * Math.PI) / 180;

    const srcW = this.offscreenCanvas.width;
    const srcH = this.offscreenCanvas.height;
    if (srcW === 0 || srcH === 0) return;

    const scale = Math.min(displayW / (srcW + 40), displayH / (srcH + 80)) * 0.9;
    const drawW = srcW * scale;
    const drawH = srcH * scale;

    displayCtx.save();
    displayCtx.translate(displayW / 2, displayH / 2 + drawH * 0.25);
    displayCtx.rotate(rotAngle);
    displayCtx.drawImage(
      this.offscreenCanvas,
      -drawW / 2,
      -drawH,
      drawW,
      drawH
    );
    displayCtx.restore();
  }

  private calculateBounds(geometry: LeafGeometry): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } {
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    for (const p of geometry.outlinePoints) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    minY -= 10;
    maxY += Math.max(20, Math.abs(geometry.petioleStart.y - geometry.petioleEnd.y));

    return { minX, maxX, minY, maxY };
  }

  private drawLeafBody(
    ctx: CanvasRenderingContext2D,
    geometry: LeafGeometry,
    params: LeafParams
  ): void {
    if (geometry.outlinePoints.length < 3) return;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(geometry.outlinePoints[0].x, geometry.outlinePoints[0].y);
    for (let i = 1; i < geometry.outlinePoints.length; i++) {
      ctx.lineTo(geometry.outlinePoints[i].x, geometry.outlinePoints[i].y);
    }
    ctx.closePath();

    const bounds = this.calculateBounds(geometry);
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    const radius = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) / 2;

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, params.primaryColor);
    gradient.addColorStop(0.7, params.primaryColor);
    gradient.addColorStop(1, params.secondaryColor);

    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = darkenColor(params.primaryColor, 0.15);
    ctx.lineWidth = 1.2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }

  private drawVeins(ctx: CanvasRenderingContext2D, geometry: LeafGeometry): void {
    ctx.save();
    ctx.strokeStyle = VEIN_COLOR;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    this.drawTaperedLine(ctx, geometry.midrib, 1.5, 0.5);

    for (const vein of geometry.secondaryVeins) {
      this.drawTaperedVein(ctx, vein);
    }
    ctx.restore();
  }

  private drawTaperedLine(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    startW: number,
    endW: number
  ): void {
    if (points.length < 2) return;

    for (let i = 0; i < points.length - 1; i++) {
      const t = i / (points.length - 1);
      const w = startW + (endW - startW) * t;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(points[i].x, points[i].y);
      ctx.lineTo(points[i + 1].x, points[i + 1].y);
      ctx.stroke();
    }
  }

  private drawTaperedVein(ctx: CanvasRenderingContext2D, vein: Vein): void {
    const segments = 12;
    for (let i = 0; i < segments; i++) {
      const t1 = i / segments;
      const t2 = (i + 1) / segments;
      const x1 = vein.start.x + (vein.end.x - vein.start.x) * t1;
      const y1 = vein.start.y + (vein.end.y - vein.start.y) * t1;
      const x2 = vein.start.x + (vein.end.x - vein.start.x) * t2;
      const y2 = vein.start.y + (vein.end.y - vein.start.y) * t2;
      const w = vein.startWidth + (vein.endWidth - vein.startWidth) * t1;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  private drawSpots(
    ctx: CanvasRenderingContext2D,
    geometry: LeafGeometry,
    params: LeafParams
  ): void {
    const spotColor = darkenColor(params.primaryColor, 0.15);
    ctx.save();
    ctx.fillStyle = spotColor;
    for (const spot of geometry.spots) {
      ctx.beginPath();
      ctx.arc(spot.x, spot.y, spot.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawPetiole(ctx: CanvasRenderingContext2D, geometry: LeafGeometry): void {
    ctx.save();
    ctx.strokeStyle = PETIOLE_COLOR;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(geometry.petioleStart.x, geometry.petioleStart.y);
    ctx.lineTo(geometry.petioleEnd.x, geometry.petioleEnd.y);
    ctx.stroke();
    ctx.restore();
  }
}
