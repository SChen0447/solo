import { BrushManager } from './brush';
import type { Point, Stroke } from './brush';
import { UndoManager } from './undoManager';
import { exportToPNG } from './export';

const MAX_POINTS_PER_FRAME = 30;
const SAMPLE_INTERVAL = 1000 / 60;

class SignatureApp {
  private canvas: HTMLCanvasElement;
  private trailCanvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private trailCtx: CanvasRenderingContext2D;
  private brush: BrushManager;
  private undoManager: UndoManager;

  private strokes: Stroke[] = [];
  private currentStroke: Stroke | null = null;
  private isDrawing: boolean = false;
  private lastSampleTime: number = 0;
  private lastRenderedIndex: number = 0;
  private fadeOverlay: HTMLElement;
  private strokeCountEl: HTMLElement;
  private saveCheckmark: HTMLElement;

  constructor() {
    this.canvas = document.getElementById('signatureCanvas') as HTMLCanvasElement;
    this.trailCanvas = document.getElementById('trailCanvas') as HTMLCanvasElement;
    this.fadeOverlay = document.getElementById('fadeOverlay') as HTMLElement;
    this.strokeCountEl = document.getElementById('strokeCount') as HTMLElement;
    this.saveCheckmark = document.getElementById('saveCheckmark') as HTMLElement;

    const ctx = this.canvas.getContext('2d');
    const trailCtx = this.trailCanvas.getContext('2d');
    if (!ctx || !trailCtx) {
      throw new Error('Could not get 2D context');
    }
    this.ctx = ctx;
    this.trailCtx = trailCtx;

    this.brush = new BrushManager({
      baseWidth: 8,
      color: '#1A1A1A'
    });

    this.undoManager = new UndoManager();

    this.setupCanvases();
    this.bindEvents();
    this.updateStrokeCount();

    this.brush.setOnSplashUpdate(() => {
      this.render();
    });
  }

  private setupCanvases(): void {
    this.resizeCanvases();
    window.addEventListener('resize', () => this.resizeCanvases());
  }

  private resizeCanvases(): void {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    const resizeSingle = (canvas: HTMLCanvasElement): void => {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      const c = canvas.getContext('2d')!;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeSingle(this.canvas);
    resizeSingle(this.trailCanvas);

    this.redrawAll();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => this.onPointerDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onPointerMove(e));
    this.canvas.addEventListener('mouseup', () => this.onPointerUp());
    this.canvas.addEventListener('mouseleave', () => this.onPointerUp());

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.onPointerDown({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
    });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.onPointerMove({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
    });

    this.canvas.addEventListener('touchend', () => this.onPointerUp());

    document.addEventListener('keydown', (e) => this.onKeyDown(e));

    const widthSlider = document.getElementById('brushWidth') as HTMLInputElement;
    const widthValue = document.getElementById('widthValue') as HTMLElement;
    widthSlider.addEventListener('input', () => {
      const val = parseInt(widthSlider.value, 10);
      this.brush.setConfig({ baseWidth: val });
      widthValue.textContent = val + 'px';
    });

    const colorPicker = document.getElementById('colorPicker') as HTMLElement;
    colorPicker.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('color-option')) {
        document.querySelectorAll('.color-option').forEach((el) => {
          el.classList.remove('active');
        });
        target.classList.add('active');
        const color = target.getAttribute('data-color') || '#1A1A1A';
        this.brush.setConfig({ color });
      }
    });

    const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
    clearBtn.addEventListener('click', () => this.clearAll());

    const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
    saveBtn.addEventListener('click', () => this.save());
  }

  private getCanvasPoint(clientX: number, clientY: number): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      timestamp: performance.now()
    };
  }

  private onPointerDown(e: MouseEvent): void {
    if (this.strokes.length >= 10) return;

    this.undoManager.saveState(this.strokes);

    const point = this.getCanvasPoint(e.clientX, e.clientY);
    const config = this.brush.getConfig();

    this.currentStroke = {
      points: [point],
      color: config.color,
      baseWidth: config.baseWidth
    };

    this.isDrawing = true;
    this.lastSampleTime = point.timestamp;
    this.lastRenderedIndex = 0;
  }

  private onPointerMove(e: MouseEvent): void {
    if (!this.isDrawing || !this.currentStroke) return;

    const now = performance.now();
    if (now - this.lastSampleTime < SAMPLE_INTERVAL) return;

    const point = this.getCanvasPoint(e.clientX, e.clientY);
    this.currentStroke.points.push(point);
    this.lastSampleTime = now;

    if (this.currentStroke.points.length - this.lastRenderedIndex > MAX_POINTS_PER_FRAME) {
      this.renderCurrentSegment();
    }

    this.brush.updateTrail(this.currentStroke.points);
    this.renderTrail();
  }

  private onPointerUp(): void {
    if (!this.isDrawing || !this.currentStroke) return;

    if (this.currentStroke.points.length >= 2) {
      this.renderCurrentSegment();
      this.strokes.push(this.currentStroke);
      this.brush.generateInkSplashes(this.currentStroke);
      this.updateStrokeCount();
    }

    this.isDrawing = false;
    this.currentStroke = null;
    this.brush.clearTrail();
    this.trailCtx.clearRect(
      0, 0,
      this.trailCanvas.width,
      this.trailCanvas.height
    );
  }

  private renderCurrentSegment(): void {
    if (!this.currentStroke) return;
    this.brush.drawStrokeSegment(
      this.ctx,
      this.currentStroke.points,
      Math.max(1, this.lastRenderedIndex)
    );
    this.lastRenderedIndex = this.currentStroke.points.length - 1;
  }

  private renderTrail(): void {
    this.trailCtx.clearRect(
      0, 0,
      this.trailCanvas.width,
      this.trailCanvas.height
    );
    this.brush.drawTrail(this.trailCtx);
  }

  private render(): void {
    this.redrawAll();
  }

  private redrawAll(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);

    const tempBrush = new BrushManager({ baseWidth: 8, color: '#000000' });
    for (const stroke of this.strokes) {
      tempBrush.drawEntireStroke(this.ctx, stroke);
    }
    tempBrush.destroy();

    if (this.currentStroke && this.currentStroke.points.length >= 2) {
      this.brush.drawStrokeSegment(this.ctx, this.currentStroke.points, 1);
    }

    this.brush.drawInkSplashes(this.ctx);
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'z' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      this.undo();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      this.redo();
    }
  }

  private undo(): void {
    if (this.isDrawing) return;

    const previousState = this.undoManager.undo(this.strokes);
    if (previousState !== null) {
      this.fadeTransition(() => {
        this.strokes = previousState;
        this.redrawAll();
        this.updateStrokeCount();
      });
    }
  }

  private redo(): void {
    if (this.isDrawing) return;

    const nextState = this.undoManager.redo();
    if (nextState !== null) {
      this.fadeTransition(() => {
        this.strokes = nextState;
        this.redrawAll();
        this.updateStrokeCount();
      });
    }
  }

  private fadeTransition(callback: () => void): void {
    this.fadeOverlay.classList.add('active');
    setTimeout(() => {
      callback();
      this.fadeOverlay.classList.remove('active');
    }, 150);
  }

  private clearAll(): void {
    if (this.strokes.length === 0) return;
    this.undoManager.saveState(this.strokes);
    this.fadeTransition(() => {
      this.strokes = [];
      this.redrawAll();
      this.updateStrokeCount();
    });
  }

  private updateStrokeCount(): void {
    this.strokeCountEl.textContent = `笔画：${this.strokes.length}/10`;
  }

  private save(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    exportToPNG(this.strokes, Math.floor(rect.width * dpr), Math.floor(rect.height * dpr));

    this.saveCheckmark.classList.remove('visible');
    void this.saveCheckmark.offsetWidth;
    this.saveCheckmark.classList.add('visible');

    setTimeout(() => {
      this.saveCheckmark.classList.remove('visible');
    }, 700);
  }

  destroy(): void {
    this.brush.destroy();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new SignatureApp();
});
