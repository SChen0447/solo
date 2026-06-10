import { MirrorEngine, MirroredPoint, Point, MirrorAxis } from './mirrorEngine';
import { Stroke } from './drawController';

const LEFT_BG = '#1a1a2e';
const RIGHT_BG = '#16213e';
const AXIS_COLOR = '#e94560';

interface RenderState {
  transitioning: boolean;
  transitionStart: number;
  transitionDuration: number;
  prevStrokesSnapshot: Stroke[] | null;
  clearing: boolean;
  clearStart: number;
  clearDuration: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mirrorEngine: MirrorEngine;
  private animationId: number | null = null;
  private renderState: RenderState;
  private completedStrokes: Stroke[] = [];
  private currentStroke: Stroke | null = null;
  private currentMirroredPaths: MirroredPoint[][] = [];
  private needsRedraw: boolean = true;

  constructor(canvas: HTMLCanvasElement, mirrorEngine: MirrorEngine) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.mirrorEngine = mirrorEngine;
    this.renderState = {
      transitioning: false,
      transitionStart: 0,
      transitionDuration: 500,
      prevStrokesSnapshot: null,
      clearing: false,
      clearStart: 0,
      clearDuration: 300
    };
    this.startAnimationLoop();
  }

  private startAnimationLoop(): void {
    const loop = () => {
      if (this.needsRedraw || this.renderState.transitioning || this.renderState.clearing) {
        this.render();
        this.needsRedraw = false;
      }
      this.animationId = requestAnimationFrame(loop);
    };
    loop();
  }

  setCurrentStroke(paths: MirroredPoint[][], stroke: Stroke): void {
    this.currentMirroredPaths = paths;
    this.currentStroke = stroke;
    this.needsRedraw = true;
  }

  commitStroke(stroke: Stroke): void {
    this.completedStrokes.push(stroke);
    this.currentStroke = null;
    this.currentMirroredPaths = [];
    this.needsRedraw = true;
  }

  startAxisTransition(): void {
    this.renderState.prevStrokesSnapshot = JSON.parse(JSON.stringify(this.completedStrokes));
    this.renderState.transitioning = true;
    this.renderState.transitionStart = performance.now();
    this.needsRedraw = true;
  }

  startClearAnimation(): void {
    this.renderState.clearing = true;
    this.renderState.clearStart = performance.now();
    this.needsRedraw = true;
  }

  clearImmediately(): void {
    this.completedStrokes = [];
    this.currentStroke = null;
    this.currentMirroredPaths = [];
    this.renderState.clearing = false;
    this.renderState.transitioning = false;
    this.renderState.prevStrokesSnapshot = null;
    this.needsRedraw = true;
  }

  forceRedraw(): void {
    this.needsRedraw = true;
  }

  getCompletedStrokes(): Stroke[] {
    return this.completedStrokes;
  }

  setCompletedStrokes(strokes: Stroke[]): void {
    this.completedStrokes = strokes;
    this.needsRedraw = true;
  }

  private drawBackground(): void {
    const { width, height } = this.canvas;
    const halfWidth = width / 2;

    this.ctx.fillStyle = LEFT_BG;
    this.ctx.fillRect(0, 0, halfWidth, height);

    this.ctx.fillStyle = RIGHT_BG;
    this.ctx.fillRect(halfWidth, 0, halfWidth, height);

    this.ctx.save();
    this.ctx.shadowColor = AXIS_COLOR;
    this.ctx.shadowBlur = 8;
    this.ctx.strokeStyle = AXIS_COLOR;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(halfWidth, 0);
    this.ctx.lineTo(halfWidth, height);
    this.ctx.stroke();
    this.ctx.restore();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(255,255,255,${alpha})`;
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  private drawGlowPoint(x: number, y: number, color: string, size: number): void {
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, size + 4);
    gradient.addColorStop(0, this.hexToRgba(color, 0.3));
    gradient.addColorStop(1, this.hexToRgba(color, 0));
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, size + 4, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawStrokePath(
    points: MirroredPoint[],
    stroke: Stroke,
    layer: number,
    alpha: number = 1
  ): void {
    if (points.length < 1) return;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.lineWidth = stroke.brushSize;

    if (points.length === 1) {
      const p = points[0];
      const color = stroke.gradient
        ? this.mirrorEngine.getLayerColor(stroke.color, layer, 0)
        : this.mirrorEngine.getLayerColor(stroke.color, layer);
      this.drawGlowPoint(p.x, p.y, color, stroke.brushSize);
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, stroke.brushSize / 2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
      return;
    }

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }

    if (stroke.gradient) {
      const first = points[0];
      const last = points[points.length - 1];
      const grad = this.ctx.createLinearGradient(first.x, first.y, last.x, last.y);
      const steps = Math.min(points.length, 10);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const color = this.mirrorEngine.getLayerColor(stroke.color, layer, t);
        grad.addColorStop(t, color);
      }
      this.ctx.strokeStyle = grad;
    } else {
      this.ctx.strokeStyle = this.mirrorEngine.getLayerColor(stroke.color, layer);
    }

    const lastPoint = points[points.length - 1];
    const lastColor = stroke.gradient
      ? this.mirrorEngine.getLayerColor(stroke.color, layer, 1)
      : this.mirrorEngine.getLayerColor(stroke.color, layer);
    this.drawGlowPoint(lastPoint.x, lastPoint.y, lastColor, stroke.brushSize);

    this.ctx.stroke();
    this.ctx.restore();
  }

  private renderStroke(stroke: Stroke, alpha: number = 1): void {
    const mirroredPaths = this.mirrorEngine.generateMirroredPath(stroke.points);
    for (let i = 0; i < mirroredPaths.length; i++) {
      const path = mirroredPaths[i];
      if (path.length === 0) continue;
      const layer = path[0].layer;
      this.drawStrokePath(path, stroke, layer, alpha);
    }
  }

  private renderCurrentStroke(): void {
    if (!this.currentStroke || this.currentMirroredPaths.length === 0) return;
    for (let i = 0; i < this.currentMirroredPaths.length; i++) {
      const path = this.currentMirroredPaths[i];
      if (path.length === 0) continue;
      const layer = path[0].layer;
      this.drawStrokePath(path, this.currentStroke, layer, 1);
    }
  }

  private render(): void {
    this.drawBackground();

    const now = performance.now();

    let clearAlpha = 1;
    if (this.renderState.clearing) {
      const elapsed = now - this.renderState.clearStart;
      clearAlpha = Math.max(0, 1 - elapsed / this.renderState.clearDuration);
      if (clearAlpha <= 0) {
        this.completedStrokes = [];
        this.currentStroke = null;
        this.currentMirroredPaths = [];
        this.renderState.clearing = false;
        clearAlpha = 1;
      }
    }

    let transitionAlpha = 1;
    let oldAlpha = 0;
    if (this.renderState.transitioning && this.renderState.prevStrokesSnapshot) {
      const elapsed = now - this.renderState.transitionStart;
      const progress = Math.min(1, elapsed / this.renderState.transitionDuration);
      transitionAlpha = progress;
      oldAlpha = 1 - progress;
      if (progress >= 1) {
        this.renderState.transitioning = false;
        this.renderState.prevStrokesSnapshot = null;
      }
    }

    if (this.renderState.transitioning && this.renderState.prevStrokesSnapshot && oldAlpha > 0) {
      for (const stroke of this.renderState.prevStrokesSnapshot) {
        this.renderStroke(stroke, oldAlpha * clearAlpha);
      }
    }

    for (const stroke of this.completedStrokes) {
      this.renderStroke(stroke, transitionAlpha * clearAlpha);
    }

    if (!this.renderState.clearing) {
      this.renderCurrentStroke();
    }
  }

  destroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}
