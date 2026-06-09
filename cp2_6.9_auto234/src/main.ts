import { PaperTexture, PAPER_BACKGROUND } from './paper';
import { PaletteManager, RGB, subtractMix } from './palette';
import { BrushEngine, BrushType, BRUSH_CONFIGS } from './brush';

const MAX_HISTORY = 20;

interface HistoryState {
  paintData: ImageData;
}

class WatercolorApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;

  private paper: PaperTexture;
  private palette: PaletteManager;
  private brush: BrushEngine;

  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;

  private isDrawing: boolean = false;
  private lastMousePos: { x: number; y: number } = { x: 0, y: 0 };

  private undoStack: HistoryState[] = [];
  private redoStack: HistoryState[] = [];
  private isMidStroke: boolean = false;

  private undoBtn: HTMLButtonElement;
  private redoBtn: HTMLButtonElement;
  private newPaperBtn: HTMLButtonElement;
  private saveBtn: HTMLButtonElement;
  private toast: HTMLElement;
  private colorPicker: HTMLInputElement;
  private moistureBar: HTMLElement;
  private moistureValue: HTMLElement;
  private brushBtns: NodeListOf<HTMLElement>;

  private lastFrameTime: number = 0;
  private rafId: number = 0;
  private fpsAccumulator: number = 0;
  private frameCount: number = 0;

  constructor() {
    const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('main-canvas not found');
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.offscreenCanvas = document.createElement('canvas');
    const offCtx = this.offscreenCanvas.getContext('2d');
    if (!offCtx) throw new Error('Offscreen 2D context not available');
    this.offscreenCtx = offCtx;

    this.paper = new PaperTexture();
    this.palette = new PaletteManager();
    this.brush = new BrushEngine(this.paper);

    this.undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
    this.redoBtn = document.getElementById('redo-btn') as HTMLButtonElement;
    this.newPaperBtn = document.getElementById('new-paper-btn') as HTMLButtonElement;
    this.saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
    this.toast = document.getElementById('toast') as HTMLElement;
    this.colorPicker = document.getElementById('color-picker') as HTMLInputElement;
    this.moistureBar = document.getElementById('moisture-bar') as HTMLElement;
    this.moistureValue = document.getElementById('moisture-value') as HTMLElement;
    this.brushBtns = document.querySelectorAll('.brush-btn');

    this.init();
  }

  private init(): void {
    this.resize();
    this.setupEventListeners();
    this.palette.attachGrid(document.getElementById('palette-grid') as HTMLElement);
    this.brush.setColor(this.palette.getCurrentColor());
    this.updateUndoRedoButtons();
    this.updateMoistureDisplay();
    this.loop(performance.now());
  }

  private resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const cssWidth = this.canvas.clientWidth;
    const cssHeight = this.canvas.clientHeight;

    this.width = Math.max(1024, Math.floor(cssWidth));
    this.height = Math.max(768, Math.floor(cssHeight));

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.offscreenCanvas.width = this.width;
    this.offscreenCanvas.height = this.height;

    this.paper.generate(this.width, this.height);
    this.brush.resize(this.width, this.height);

    this.clearHistory();
  }

  private setupEventListeners(): void {
    let resizeTimer: number | null = null;
    window.addEventListener('resize', () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => this.resize(), 200);
    });

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.onMouseLeave());

    this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    window.addEventListener('touchend', () => this.onMouseUp());

    this.undoBtn.addEventListener('click', () => this.undo());
    this.redoBtn.addEventListener('click', () => this.redo());
    this.newPaperBtn.addEventListener('click', () => this.newPaper());
    this.saveBtn.addEventListener('click', () => this.saveImage());

    this.brushBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.brush as BrushType;
        if (type) this.setBrushType(type);
      });
    });

    this.colorPicker.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.value) {
        this.palette.addCustomColor(target.value);
        this.brush.setColor(this.palette.getCurrentColor());
      }
    });

    this.palette.onChange((color) => {
      this.brush.setColor(color);
    });

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        this.redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveImage();
      }
    });
  }

  private getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.width / rect.width);
    const y = (e.clientY - rect.top) * (this.height / rect.height);
    return { x: Math.max(0, Math.min(this.width, x)), y: Math.max(0, Math.min(this.height, y)) };
  }

  private onMouseDown(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e);
    this.startStroke(x, y);
  }

  private onMouseMove(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e);
    this.lastMousePos = { x, y };
    this.brush.moveStroke(x, y);
  }

  private onMouseUp(): void {
    if (this.isDrawing) {
      this.endStroke();
    }
  }

  private onMouseLeave(): void {
    if (this.isDrawing) {
      this.endStroke();
    }
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const { x, y } = this.getCanvasCoords(e.touches[0]);
      this.startStroke(x, y);
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const { x, y } = this.getCanvasCoords(e.touches[0]);
      this.lastMousePos = { x, y };
      this.brush.moveStroke(x, y);
    }
  }

  private startStroke(x: number, y: number): void {
    this.saveHistoryState();
    this.redoStack = [];
    this.isDrawing = true;
    this.isMidStroke = true;

    const baseColor = this.palette.getCurrentColor();
    const mixedColor = this.palette.mixWithResidue(baseColor);
    this.brush.setColor(mixedColor);
    this.brush.beginStroke(x, y);

    this.lastMousePos = { x, y };
    this.updateUndoRedoButtons();
  }

  private endStroke(): void {
    this.isDrawing = false;
    this.isMidStroke = false;
    this.brush.endStroke();
    this.palette.setResidueColor(this.palette.getCurrentColor());
  }

  private setBrushType(type: BrushType): void {
    this.brush.setBrushType(type);
    this.brushBtns.forEach(btn => {
      if (btn.dataset.brush === type) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private saveHistoryState(): void {
    if (this.undoStack.length >= MAX_HISTORY) {
      this.undoStack.shift();
    }
    const state: HistoryState = {
      paintData: this.brush.snapshot()
    };
    this.undoStack.push(state);
  }

  private clearHistory(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.updateUndoRedoButtons();
  }

  private undo(): void {
    if (this.undoStack.length === 0) return;
    if (this.isMidStroke) this.endStroke();

    const current: HistoryState = {
      paintData: this.brush.snapshot()
    };
    this.redoStack.push(current);

    const prev = this.undoStack.pop()!;
    this.brush.restore(prev.paintData);

    this.updateUndoRedoButtons();
  }

  private redo(): void {
    if (this.redoStack.length === 0) return;
    if (this.isMidStroke) this.endStroke();

    const current: HistoryState = {
      paintData: this.brush.snapshot()
    };
    this.undoStack.push(current);

    const next = this.redoStack.pop()!;
    this.brush.restore(next.paintData);

    this.updateUndoRedoButtons();
  }

  private updateUndoRedoButtons(): void {
    this.undoBtn.disabled = this.undoStack.length === 0;
    this.redoBtn.disabled = this.redoStack.length === 0;
  }

  private newPaper(): void {
    this.paper.generate(this.width, this.height);
    this.brush.clear();
    this.clearHistory();
  }

  private saveImage(): void {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.width;
    exportCanvas.height = this.height;
    const ectx = exportCanvas.getContext('2d');
    if (!ectx) return;

    ectx.fillStyle = PAPER_BACKGROUND;
    ectx.fillRect(0, 0, this.width, this.height);
    ectx.drawImage(this.paper.getTextureCanvas(), 0, 0, this.width, this.height);
    ectx.globalAlpha = 0.1;
    ectx.drawImage(this.paper.getTextureCanvas(), 0, 0, this.width, this.height);
    ectx.globalAlpha = 1;
    ectx.drawImage(this.brush.getPaintLayer(), 0, 0);

    const dataUrl = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `watercolor_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();

    this.showToast();
  }

  private showToast(): void {
    this.toast.classList.add('show');
    window.setTimeout(() => {
      this.toast.classList.remove('show');
    }, 2000);
  }

  private updateMoistureDisplay(): void {
    const m = this.brush.getCurrentMoisture();
    const pct = Math.round(m * 100);
    this.moistureBar.style.width = `${pct}%`;
    this.moistureValue.textContent = `${pct}%`;
  }

  private loop(now: number): void {
    const dt = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.frameCount++;
    this.fpsAccumulator += dt;

    this.brush.update();
    this.render();
    this.updateMoistureDisplay();

    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.fillStyle = PAPER_BACKGROUND;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.drawImage(this.paper.getTextureCanvas(), 0, 0, this.width, this.height);

    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.drawImage(this.paper.getTextureCanvas(), 0, 0, this.width, this.height);
    ctx.restore();

    ctx.drawImage(this.brush.getPaintLayer(), 0, 0);

    this.renderMoistureIndicator(ctx);
  }

  private renderMoistureIndicator(ctx: CanvasRenderingContext2D): void {
    const ind = this.brush.getMoistureIndicator();
    if (!ind.visible || ind.moisture <= 0.02) return;

    const radius = 10 + ind.moisture * 35;
    const alpha = Math.min(0.3, ind.moisture * 0.35);

    ctx.save();
    const grd = ctx.createRadialGradient(ind.x, ind.y, 0, ind.x, ind.y, radius);
    grd.addColorStop(0, `rgba(176, 212, 241, ${alpha})`);
    grd.addColorStop(0.6, `rgba(176, 212, 241, ${alpha * 0.5})`);
    grd.addColorStop(1, 'rgba(176, 212, 241, 0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(ind.x, ind.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    new WatercolorApp();
  } catch (err) {
    console.error('Failed to initialize WatercolorApp:', err);
  }
});

export { WatercolorApp };
