import type { Stroke, Point } from './strokeData.js';
import { getStrokes } from './strokeData.js';

type AnimatorState = 'idle' | 'writing' | 'floating';

interface PrecomputedPoint {
  x: number;
  y: number;
  width: number;
}

interface PrecomputedStroke {
  points: PrecomputedPoint[];
  direction: number;
  endPoint: Point;
  widthCurve: Stroke['widthCurve'];
  breathSeed: number;
}

const SAMPLE_COUNT = 60;
const STROKE_DURATION_MIN = 600;
const STROKE_DURATION_MAX = 800;
const FLOAT_AMPLITUDE = 3;
const FLOAT_PERIOD = 4000;
const BREATH_JITTER = 2;

function cubicBezier(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
  };
}

function getWidthAtProgress(t: number, widthCurve: Stroke['widthCurve']): number {
  if (t < 0.5) {
    const p = t * 2;
    return widthCurve.start + (widthCurve.middle - widthCurve.start) * p;
  } else {
    const p = (t - 0.5) * 2;
    return widthCurve.middle + (widthCurve.end - widthCurve.middle) * p;
  }
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export class Animator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: AnimatorState = 'idle';
  private rafId: number = 0;
  private inkColor: string = '#1a1a1a';
  private strokes: Stroke[] = [];
  private precomputed: PrecomputedStroke[] = [];
  private currentStrokeIndex: number = 0;
  private currentStrokeProgress: number = 0;
  private strokeStartTime: number = 0;
  private currentStrokeDuration: number = 700;
  private floatPhase: number = 0;
  private startTime: number = 0;
  private breathSeeds: number[] = [];
  private charOffsetX: number = 0;
  private charOffsetY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取Canvas 2D上下文');
    }
    this.ctx = ctx;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawBackground();
    if (this.state === 'floating') {
      this.drawFloating();
    }
  }

  setInkColor(color: string): void {
    this.inkColor = color;
    if (this.state !== 'idle') {
      this.redrawAll();
    }
  }

  private drawBackground(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.ctx.fillStyle = '#f5f0e8';
    this.ctx.fillRect(0, 0, w, h);
    this.drawPaperTexture();
  }

  private drawPaperTexture(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.ctx.save();
    this.ctx.globalAlpha = 0.06;
    for (let i = 0; i < 200; i++) {
      const x = (i * 97) % w;
      const y = (i * 53) % h;
      const r = 0.5 + ((i * 31) % 3);
      this.ctx.fillStyle = i % 3 === 0 ? '#8b7355' : '#5c4033';
      this.ctx.beginPath();
      this.ctx.arc(x, y, r, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  private precomputeStrokes(): void {
    this.precomputed = [];
    this.breathSeeds = [];
    for (const stroke of this.strokes) {
      const points: PrecomputedPoint[] = [];
      const controlPoints = stroke.controlPoints.length >= 2
        ? stroke.controlPoints
        : [stroke.startPoint, stroke.endPoint];
      const cp0 = stroke.startPoint;
      const cp1 = controlPoints[0];
      const cp2 = controlPoints[1];
      const cp3 = stroke.endPoint;
      for (let i = 0; i <= SAMPLE_COUNT; i++) {
        const t = i / SAMPLE_COUNT;
        const pos = cubicBezier(t, cp0, cp1, cp2, cp3);
        const width = getWidthAtProgress(t, stroke.widthCurve);
        points.push({ x: pos.x, y: pos.y, width });
      }
      this.precomputed.push({
        points,
        direction: stroke.direction,
        endPoint: stroke.endPoint,
        widthCurve: stroke.widthCurve,
        breathSeed: Math.random() * 1000
      });
      this.breathSeeds.push(Math.random() * Math.PI * 2);
    }
  }

  startWriting(character: string): void {
    this.stop();
    this.strokes = getStrokes(character);
    if (this.strokes.length === 0) return;
    this.precomputeStrokes();
    this.currentStrokeIndex = 0;
    this.currentStrokeProgress = 0;
    this.state = 'writing';
    this.strokeStartTime = performance.now();
    this.currentStrokeDuration = STROKE_DURATION_MIN + Math.random() * (STROKE_DURATION_MAX - STROKE_DURATION_MIN);
    this.drawBackground();
    this.floatPhase = 0;
    this.startTime = performance.now();
    this.animate();
  }

  stop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.state = 'idle';
  }

  private animate = (): void => {
    if (this.state === 'idle') return;
    const now = performance.now();
    if (this.state === 'writing') {
      this.updateWriting(now);
    } else if (this.state === 'floating') {
      this.updateFloating(now);
    }
    this.rafId = requestAnimationFrame(this.animate);
  };

  private updateWriting(now: number): void {
    const elapsed = now - this.strokeStartTime;
    this.currentStrokeProgress = Math.min(elapsed / this.currentStrokeDuration, 1);
    const easedProgress = easeInOut(this.currentStrokeProgress);
    this.drawWritingFrame(easedProgress);
    if (this.currentStrokeProgress >= 1) {
      this.currentStrokeIndex++;
      if (this.currentStrokeIndex >= this.strokes.length) {
        this.state = 'floating';
        this.floatPhase = 0;
        this.startTime = now;
      } else {
        this.strokeStartTime = now;
        this.currentStrokeDuration = STROKE_DURATION_MIN + Math.random() * (STROKE_DURATION_MAX - STROKE_DURATION_MIN);
      }
    }
  }

  private drawWritingFrame(progress: number): void {
    this.drawBackground();
    const offset = this.getCharOffset();
    this.charOffsetX = offset.x;
    this.charOffsetY = offset.y;
    for (let i = 0; i < this.currentStrokeIndex; i++) {
      this.drawFullStroke(this.precomputed[i], offset.x, offset.y, 0);
      this.drawInkSpread(
        this.precomputed[i].endPoint.x + offset.x,
        this.precomputed[i].endPoint.y + offset.y,
        this.precomputed[i].widthCurve.end * 1.5
      );
    }
    if (this.currentStrokeIndex < this.precomputed.length) {
      this.drawPartialStroke(this.precomputed[this.currentStrokeIndex], progress, offset.x, offset.y);
    }
  }

  private getCharOffset(): { x: number; y: number } {
    const charWidth = 300;
    const charHeight = 300;
    const w = window.innerWidth;
    const h = window.innerHeight;
    return {
      x: (w - charWidth) / 2,
      y: (h - charHeight) / 2
    };
  }

  private drawFullStroke(preStroke: PrecomputedStroke, offsetX: number, offsetY: number, jitterAmount: number): void {
    const points = preStroke.points;
    if (points.length < 2) return;
    this.ctx.save();
    this.ctx.strokeStyle = this.inkColor;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const jx = jitterAmount > 0 ? Math.sin(preStroke.breathSeed + i * 0.5) * jitterAmount : 0;
      const jy = jitterAmount > 0 ? Math.cos(preStroke.breathSeed + i * 0.5) * jitterAmount : 0;
      this.ctx.lineWidth = curr.width;
      this.ctx.beginPath();
      this.ctx.moveTo(prev.x + offsetX + jx, prev.y + offsetY + jy);
      this.ctx.lineTo(curr.x + offsetX + jx, curr.y + offsetY + jy);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  private drawPartialStroke(preStroke: PrecomputedStroke, progress: number, offsetX: number, offsetY: number): void {
    const points = preStroke.points;
    if (points.length < 2) return;
    const totalPoints = points.length - 1;
    const currentEnd = Math.floor(progress * totalPoints);
    const fractional = (progress * totalPoints) - currentEnd;
    this.ctx.save();
    this.ctx.strokeStyle = this.inkColor;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    for (let i = 1; i <= currentEnd && i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      this.ctx.lineWidth = curr.width;
      this.ctx.beginPath();
      this.ctx.moveTo(prev.x + offsetX, prev.y + offsetY);
      this.ctx.lineTo(curr.x + offsetX, curr.y + offsetY);
      this.ctx.stroke();
    }
    if (fractional > 0 && currentEnd < points.length - 1) {
      const prev = points[currentEnd];
      const curr = points[currentEnd + 1];
      const ix = prev.x + (curr.x - prev.x) * fractional;
      const iy = prev.y + (curr.y - prev.y) * fractional;
      const iw = prev.width + (curr.width - prev.width) * fractional;
      this.ctx.lineWidth = iw;
      this.ctx.beginPath();
      this.ctx.moveTo(prev.x + offsetX, prev.y + offsetY);
      this.ctx.lineTo(ix + offsetX, iy + offsetY);
      this.ctx.stroke();
    }
    if (progress > 0.85) {
      const lastIndex = currentEnd < points.length - 1 ? currentEnd : points.length - 1;
      const lastPoint = points[lastIndex];
      this.drawInkSpread(lastPoint.x + offsetX, lastPoint.y + offsetY, preStroke.widthCurve.end * 2);
    }
    this.ctx.restore();
  }

  private drawInkSpread(x: number, y: number, radius: number): void {
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius * 3);
    gradient.addColorStop(0, this.hexToRgba(this.inkColor, 0.35));
    gradient.addColorStop(0.5, this.hexToRgba(this.inkColor, 0.12));
    gradient.addColorStop(1, this.hexToRgba(this.inkColor, 0));
    this.ctx.save();
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius * 3, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  private updateFloating(now: number): void {
    const elapsed = now - this.startTime;
    this.floatPhase = (elapsed % FLOAT_PERIOD) / FLOAT_PERIOD * Math.PI * 2;
    this.drawFloating();
  }

  private drawFloating(): void {
    this.drawBackground();
    const floatY = Math.sin(this.floatPhase) * FLOAT_AMPLITUDE;
    const offset = this.getCharOffset();
    this.charOffsetX = offset.x;
    this.charOffsetY = offset.y + floatY;
    for (let i = 0; i < this.precomputed.length; i++) {
      const jitter = Math.sin(this.floatPhase + this.breathSeeds[i]) * BREATH_JITTER;
      this.drawFullStroke(this.precomputed[i], offset.x, offset.y + floatY, jitter);
      this.drawInkSpread(
        this.precomputed[i].endPoint.x + offset.x,
        this.precomputed[i].endPoint.y + offset.y + floatY,
        this.precomputed[i].widthCurve.end * 1.5
      );
    }
  }

  private redrawAll(): void {
    if (this.state === 'floating') {
      this.drawFloating();
    } else if (this.state === 'writing') {
      this.drawWritingFrame(easeInOut(this.currentStrokeProgress));
    } else {
      this.drawBackground();
    }
  }

  exportPNG(width: number, height: number, borderWidth: number = 0): string {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;
    const ectx = exportCanvas.getContext('2d');
    if (!ectx) {
      throw new Error('无法创建导出Canvas上下文');
    }
    ectx.fillStyle = '#f5f0e8';
    ectx.fillRect(0, 0, width, height);
    this.drawExportPaperTexture(ectx, width, height);
    const charW = 300;
    const charH = 300;
    const scale = Math.min(width / (charW * 1.5), height / (charH * 1.5));
    const offsetX = (width - charW * scale) / 2;
    const offsetY = (height - charH * scale) / 2;
    const floatY = this.state === 'floating' ? Math.sin(this.floatPhase) * FLOAT_AMPLITUDE * scale : 0;
    ectx.save();
    for (let i = 0; i < this.precomputed.length; i++) {
      const preStroke = this.precomputed[i];
      const points = preStroke.points;
      if (points.length < 2) continue;
      ectx.strokeStyle = this.inkColor;
      ectx.lineCap = 'round';
      ectx.lineJoin = 'round';
      for (let j = 1; j < points.length; j++) {
        const prev = points[j - 1];
        const curr = points[j];
        ectx.lineWidth = curr.width * scale;
        ectx.beginPath();
        ectx.moveTo(offsetX + prev.x * scale, offsetY + prev.y * scale + floatY);
        ectx.lineTo(offsetX + curr.x * scale, offsetY + curr.y * scale + floatY);
        ectx.stroke();
      }
      const lastPt = points[points.length - 1];
      const r = preStroke.widthCurve.end * 1.5 * scale;
      const gradient = ectx.createRadialGradient(
        offsetX + lastPt.x * scale,
        offsetY + lastPt.y * scale + floatY,
        0,
        offsetX + lastPt.x * scale,
        offsetY + lastPt.y * scale + floatY,
        r * 3
      );
      gradient.addColorStop(0, this.hexToRgba(this.inkColor, 0.35));
      gradient.addColorStop(0.5, this.hexToRgba(this.inkColor, 0.12));
      gradient.addColorStop(1, this.hexToRgba(this.inkColor, 0));
      ectx.fillStyle = gradient;
      ectx.beginPath();
      ectx.arc(offsetX + lastPt.x * scale, offsetY + lastPt.y * scale + floatY, r * 3, 0, Math.PI * 2);
      ectx.fill();
    }
    ectx.restore();
    if (borderWidth > 0) {
      ectx.strokeStyle = '#5c4033';
      ectx.lineWidth = borderWidth;
      ectx.strokeRect(borderWidth / 2, borderWidth / 2, width - borderWidth, height - borderWidth);
    }
    return exportCanvas.toDataURL('image/png');
  }

  private drawExportPaperTexture(ectx: CanvasRenderingContext2D, w: number, h: number): void {
    ectx.save();
    ectx.globalAlpha = 0.06;
    for (let i = 0; i < 500; i++) {
      const x = (i * 97) % w;
      const y = (i * 53) % h;
      const r = 0.5 + ((i * 31) % 3);
      ectx.fillStyle = i % 3 === 0 ? '#8b7355' : '#5c4033';
      ectx.beginPath();
      ectx.arc(x, y, r, 0, Math.PI * 2);
      ectx.fill();
    }
    ectx.restore();
  }

  getState(): AnimatorState {
    return this.state;
  }
}
