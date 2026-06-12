import { BrushEngine, BrushType } from './BrushEngine';
import { UIComponents } from './UIComponents';

export class PaintApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private brushEngine: BrushEngine;
  private ui: UIComponents;
  private isDrawing: boolean = false;
  private isCanvasActive: boolean = false;
  private hintText: HTMLElement;
  private hintFadeTimer: number | null = null;
  private rafId: number | null = null;
  private pendingPoint: { x: number; y: number } | null = null;
  private bgColor: string = '#f5f0e1';

  constructor() {
    this.canvas = document.getElementById('paintCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.brushEngine = new BrushEngine();
    this.hintText = document.getElementById('hintText')!;

    this._initCanvas();
    this.ui = new UIComponents(this);
    this._bindEvents();
  }

  private _initCanvas(): void {
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this._fillBackground();
  }

  private _fillBackground(): void {
    this.ctx.save();
    this.ctx.fillStyle = this.bgColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this._drawPaperTexture();
    this.ctx.restore();
  }

  private _drawPaperTexture(): void {
    this.ctx.save();
    this.ctx.globalAlpha = 0.03;
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * this.canvas.width;
      const y = Math.random() * this.canvas.height;
      const size = Math.random() * 1.5 + 0.5;
      const alpha = Math.random() * 0.5;
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = Math.random() > 0.5 ? '#d4c9a8' : '#e8dfc8';
      this.ctx.fillRect(x, y, size, size);
    }
    this.ctx.restore();
  }

  private _bindEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => this._onPointerDown(e.offsetX, e.offsetY));
    this.canvas.addEventListener('mousemove', (e) => this._onPointerMove(e.offsetX, e.offsetY));
    this.canvas.addEventListener('mouseup', () => this._onPointerUp());
    this.canvas.addEventListener('mouseleave', () => this._onPointerUp());

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this._onPointerDown(touch.clientX - rect.left, touch.clientY - rect.top);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this._onPointerMove(touch.clientX - rect.left, touch.clientY - rect.top);
    }, { passive: false });

    this.canvas.addEventListener('touchend', () => this._onPointerUp());

    document.getElementById('clearBtn')!.addEventListener('click', () => this.clearCanvas());
    document.getElementById('saveBtn')!.addEventListener('click', () => this.saveAsPNG());
  }

  private _onPointerDown(x: number, y: number): void {
    this.isDrawing = true;
    this.brushEngine.beginStroke();

    if (!this.isCanvasActive) {
      this.isCanvasActive = true;
      this._fadeHint();
    }

    const result = this.brushEngine.paint(this.ctx, x, y);
    this.ui.updateStatus(x, y, result.pressure);
  }

  private _onPointerMove(x: number, y: number): void {
    this.ui.updateCoords(x, y);

    if (!this.isDrawing) return;

    this.pendingPoint = { x, y };

    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => this._renderFrame());
    }
  }

  private _renderFrame(): void {
    this.rafId = null;
    if (this.pendingPoint && this.isDrawing) {
      const { x, y } = this.pendingPoint;
      this.pendingPoint = null;
      const result = this.brushEngine.paint(this.ctx, x, y);
      this.ui.updateStatus(x, y, result.pressure);

      if (this.pendingPoint) {
        this.rafId = requestAnimationFrame(() => this._renderFrame());
      }
    }
  }

  private _onPointerUp(): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.brushEngine.endStroke(this.ctx);

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.pendingPoint = null;
  }

  private _fadeHint(): void {
    if (this.hintFadeTimer) clearTimeout(this.hintFadeTimer);
    this.hintFadeTimer = window.setTimeout(() => {
      this.hintText.classList.add('fade-out');
    }, 2000);
  }

  setBrush(type: BrushType): void {
    this.brushEngine.setBrush(type);
    this.ui.updateBrushName(this.brushEngine.getConfig().name);
  }

  setColor(color: string): void {
    this.brushEngine.setColor(color);
  }

  setOpacity(opacity: number): void {
    this.brushEngine.setOpacity(opacity);
  }

  clearCanvas(): void {
    const wrapper = this.canvas.parentElement!;
    wrapper.classList.add('clearing');
    setTimeout(() => {
      this._fillBackground();
      wrapper.classList.remove('clearing');
    }, 300);
  }

  saveAsPNG(): void {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.fillStyle = this.bgColor;
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(this.canvas, 0, 0);

    const link = document.createElement('a');
    link.download = `brush-painting-${Date.now()}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  }

  getBrushEngine(): BrushEngine {
    return this.brushEngine;
  }
}
