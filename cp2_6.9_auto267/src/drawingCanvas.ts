import { AudioEngine, NoteEvent, ScaleMode } from './audioEngine';

export interface Point {
  x: number;
  y: number;
  timestamp: number;
}

export interface StrokeSegment {
  points: Point[];
  color: string;
  width: number;
  opacity: number;
  createdAt: number;
  noteEvent?: NoteEvent;
}

export interface RecordedAction {
  type: 'stroke';
  segments: StrokeSegment[];
  startTime: number;
}

interface DrawingState {
  isDrawing: boolean;
  lastPoint: Point | null;
  currentPoints: Point[];
  currentWidth: number;
  currentColor: string;
  lastNoteTime: number;
}

const COLOR_SLOW = '#4FC3F7';
const COLOR_MEDIUM = '#FFD93D';
const COLOR_FAST = '#FF6B6B';
const MIN_WIDTH = 2;
const MAX_WIDTH = 8;
const FADE_DELAY = 2000;
const FADE_RATE = 0.02;
const NOTE_INTERVAL = 80;

export class DrawingCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private audioEngine: AudioEngine;
  private dpr = 1;
  private width = 0;
  private height = 0;
  private segments: StrokeSegment[] = [];
  private recordings: RecordedAction[] = [];
  private currentRecording: StrokeSegment[] = [];
  private drawing: DrawingState = {
    isDrawing: false,
    lastPoint: null,
    currentPoints: [],
    currentWidth: MIN_WIDTH,
    currentColor: COLOR_SLOW,
    lastNoteTime: 0
  };
  private lastDrawTime = 0;
  private animationId: number | null = null;
  private onRecordingComplete?: (segments: StrokeSegment[]) => void;

  constructor(canvas: HTMLCanvasElement, audioEngine: AudioEngine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
    this.audioEngine = audioEngine;
    this.bindEvents();
    this.resize();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('mouseleave', this.onMouseUp);
    window.addEventListener('resize', this.resize);
  }

  public destroy(): void {
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('mouseleave', this.onMouseUp);
    window.removeEventListener('resize', this.resize);
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
  }

  public setOnRecordingComplete(cb: (segments: StrokeSegment[]) => void): void {
    this.onRecordingComplete = cb;
  }

  public getRecordings(): RecordedAction[] {
    return this.recordings;
  }

  public clearRecordings(): void {
    this.recordings = [];
  }

  public resize = (): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);

    this.offscreenCanvas.width = this.width * this.dpr;
    this.offscreenCanvas.height = this.height * this.dpr;
    this.offscreenCtx.scale(this.dpr, this.dpr);

    this.redrawAll();
  };

  public clear(): void {
    this.segments = [];
    this.currentRecording = [];
    this.redrawAll();
  }

  public getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  private getMousePos(e: MouseEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      timestamp: performance.now()
    };
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    this.drawing.isDrawing = true;
    const point = this.getMousePos(e);
    this.drawing.lastPoint = point;
    this.drawing.currentPoints = [point];
    this.drawing.currentWidth = MIN_WIDTH;
    this.drawing.currentColor = COLOR_SLOW;
    this.drawing.lastNoteTime = 0;
    this.currentRecording = [];
    this.startLoop();
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.drawing.isDrawing) return;
    const point = this.getMousePos(e);
    const lastPoint = this.drawing.lastPoint;
    if (!lastPoint) return;

    const dx = point.x - lastPoint.x;
    const dy = point.y - lastPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const dt = Math.max(1, point.timestamp - lastPoint.timestamp);
    const speed = distance / dt;

    this.updateColorAndWidth(speed);
    this.drawing.currentPoints.push(point);

    if (this.drawing.currentPoints.length >= 3) {
      this.drawSegmentToContext(this.ctx, this.drawing.currentPoints.slice(-3), this.drawing.currentColor, this.drawing.currentWidth, 1);
    }

    if (point.timestamp - this.drawing.lastNoteTime > NOTE_INTERVAL) {
      const freq = this.audioEngine.mapXToFrequency(point.x, this.width);
      const vol = this.audioEngine.mapYToVolume(point.y, this.height);
      const mode = this.audioEngine.getScaleMode();
      this.audioEngine.playNote(freq, vol);
      this.drawing.lastNoteTime = point.timestamp;

      this.currentRecording.push({
        points: [...this.drawing.currentPoints],
        color: this.drawing.currentColor,
        width: this.drawing.currentWidth,
        opacity: 1,
        createdAt: point.timestamp,
        noteEvent: {
          frequency: freq,
          volume: vol,
          startTime: point.timestamp,
          duration: 0.15,
          mode
        }
      });
    }

    this.drawing.lastPoint = point;
  };

  private onMouseUp = (): void => {
    if (!this.drawing.isDrawing) return;
    this.drawing.isDrawing = false;
    this.drawing.lastPoint = null;

    if (this.drawing.currentPoints.length >= 2 && this.currentRecording.length > 0) {
      const finalSegment: StrokeSegment = {
        points: [...this.drawing.currentPoints],
        color: this.drawing.currentColor,
        width: this.drawing.currentWidth,
        opacity: 1,
        createdAt: performance.now()
      };
      this.segments.push(finalSegment);
      this.recordings.push({
        type: 'stroke',
        segments: [...this.currentRecording],
        startTime: performance.now()
      });
      if (this.onRecordingComplete) {
        this.onRecordingComplete([...this.currentRecording]);
      }
    }

    this.drawing.currentPoints = [];
    this.currentRecording = [];
    this.redrawAll();
  };

  private updateColorAndWidth(speed: number): void {
    const normalized = Math.min(1, speed / 3);
    this.drawing.currentWidth = MIN_WIDTH + (MAX_WIDTH - MIN_WIDTH) * normalized;

    if (normalized < 0.33) {
      const t = normalized / 0.33;
      this.drawing.currentColor = this.lerpColor(COLOR_SLOW, COLOR_MEDIUM, t);
    } else if (normalized < 0.66) {
      const t = (normalized - 0.33) / 0.33;
      this.drawing.currentColor = this.lerpColor(COLOR_MEDIUM, COLOR_FAST, t);
    } else {
      this.drawing.currentColor = COLOR_FAST;
    }
  }

  private lerpColor(c1: string, c2: string, t: number): string {
    const r1 = parseInt(c1.slice(1, 3), 16);
    const g1 = parseInt(c1.slice(3, 5), 16);
    const b1 = parseInt(c1.slice(5, 7), 16);
    const r2 = parseInt(c2.slice(1, 3), 16);
    const g2 = parseInt(c2.slice(3, 5), 16);
    const b2 = parseInt(c2.slice(5, 7), 16);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private drawSegmentToContext(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    color: string,
    width: number,
    opacity: number
  ): void {
    if (points.length < 2) return;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.shadowColor = color;
    ctx.shadowBlur = 3;
    ctx.globalCompositeOperation = 'source-over';

    ctx.beginPath();
    if (points.length === 2) {
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
    } else {
      const p0 = points[points.length - 3];
      const p1 = points[points.length - 2];
      const p2 = points[points.length - 1];
      const cx = (p0.x + p1.x) / 2;
      const cy = (p0.y + p1.y) / 2;
      const cx2 = (p1.x + p2.x) / 2;
      const cy2 = (p1.y + p2.y) / 2;
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(p1.x, p1.y, cx2, cy2);
    }
    ctx.stroke();
    ctx.restore();
  }

  private drawGlowSegment(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    color: string,
    width: number,
    opacity: number
  ): void {
    if (points.length < 2) return;
    ctx.save();
    ctx.globalAlpha = opacity * 0.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = width + 4;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.globalCompositeOperation = 'screen';

    ctx.beginPath();
    if (points.length === 2) {
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
    } else {
      const p0 = points[points.length - 3];
      const p1 = points[points.length - 2];
      const p2 = points[points.length - 1];
      const cx = (p0.x + p1.x) / 2;
      const cy = (p0.y + p1.y) / 2;
      const cx2 = (p1.x + p2.x) / 2;
      const cy2 = (p1.y + p2.y) / 2;
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(p1.x, p1.y, cx2, cy2);
    }
    ctx.stroke();
    ctx.restore();
  }

  private drawFullStroke(ctx: CanvasRenderingContext2D, segment: StrokeSegment, withGlow: boolean = true): void {
    const pts = segment.points;
    if (pts.length < 2) return;

    if (withGlow) {
      this.drawGlowSegment(ctx, [pts[0], pts[1]], segment.color, segment.width, segment.opacity);
    }
    this.drawSegmentToContext(ctx, [pts[0], pts[1]], segment.color, segment.width, segment.opacity);

    for (let i = 2; i < pts.length; i++) {
      const subset = pts.slice(Math.max(0, i - 2), i + 1);
      if (withGlow) {
        this.drawGlowSegment(ctx, subset, segment.color, segment.width, segment.opacity);
      }
      this.drawSegmentToContext(ctx, subset, segment.color, segment.width, segment.opacity);
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, Math.max(this.width, this.height)
    );
    gradient.addColorStop(0, '#0D1B2A');
    gradient.addColorStop(1, '#1A1A2E');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private redrawAll(): void {
    this.drawBackground(this.offscreenCtx);
    for (const seg of this.segments) {
      this.drawFullStroke(this.offscreenCtx, seg);
    }
    this.renderFrame();
  }

  private renderFrame(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(this.offscreenCanvas, 0, 0, this.width, this.height);
  }

  private updateOpacity(): boolean {
    const now = performance.now();
    let changed = false;
    this.segments = this.segments.filter(seg => {
      if (now - seg.createdAt > FADE_DELAY) {
        seg.opacity -= FADE_RATE;
        changed = true;
        return seg.opacity > 0;
      }
      return true;
    });
    return changed;
  }

  private startLoop(): void {
    if (this.animationId !== null) return;
    const loop = () => {
      const now = performance.now();
      if (now - this.lastDrawTime >= 16) {
        this.lastDrawTime = now;
        const opacityChanged = this.updateOpacity();
        if (opacityChanged) {
          this.redrawAll();
        } else {
          this.renderFrame();
        }
      }
      if (this.drawing.isDrawing || this.segments.some(s => performance.now() - s.createdAt > FADE_DELAY && s.opacity > 0)) {
        this.animationId = requestAnimationFrame(loop);
      } else {
        this.animationId = null;
      }
    };
    this.animationId = requestAnimationFrame(loop);
  }

  public async playbackRecording(scaleMode: ScaleMode): Promise<void> {
    if (this.recordings.length === 0) return;
    this.clear();
    const originalMode = this.audioEngine.getScaleMode();
    this.audioEngine.setScaleMode(scaleMode);

    for (const action of this.recordings) {
      for (const segment of action.segments) {
        this.segments.push({
          ...segment,
          opacity: 1,
          createdAt: performance.now()
        });
        if (segment.noteEvent) {
          this.audioEngine.playNote(
            segment.noteEvent.frequency,
            segment.noteEvent.volume,
            segment.noteEvent.duration
          );
        }
        this.redrawAll();
        await new Promise(resolve => setTimeout(resolve, 60));
      }
    }

    this.audioEngine.setScaleMode(originalMode);
  }
}
