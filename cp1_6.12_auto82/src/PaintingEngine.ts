import { ParticleSystem } from './ParticleSystem';
import { PAINTINGS, Painting } from './ArtData';

export interface EngineCallbacks {
  onPaintingChange: (painting: Painting, index: number) => void;
}

export class PaintingEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particleSystem: ParticleSystem;
  private currentPaintingIndex: number = 0;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private callbacks: EngineCallbacks;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;
  private running: boolean = false;

  constructor(canvas: HTMLCanvasElement, callbacks: EngineCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;
    this.particleSystem = new ParticleSystem();
    this.callbacks = callbacks;
    this.dpr = window.devicePixelRatio || 1;
  }

  init(): void {
    this.resize();
    const painting = PAINTINGS[this.currentPaintingIndex];
    this.particleSystem.init(this.width, this.height, painting);
    this.callbacks.onPaintingChange(painting, this.currentPaintingIndex);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.particleSystem.resize(this.width, this.height);
  }

  private loop = (): void => {
    if (!this.running) return;

    const now = performance.now();
    const deltaTime = Math.min(now - this.lastTime, 50);
    this.lastTime = now;

    this.update(deltaTime);
    this.render();

    this.animationId = requestAnimationFrame(this.loop);
  };

  private update(deltaTime: number): void {
    this.particleSystem.update(deltaTime);
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.particleSystem.render(this.ctx);
  }

  handleMouseDown(clientX: number, clientY: number): void {
    const { x, y } = this.getCanvasCoords(clientX, clientY);
    this.particleSystem.setMouseDown(x, y);
  }

  handleMouseMove(clientX: number, clientY: number): void {
    const { x, y } = this.getCanvasCoords(clientX, clientY);
    this.particleSystem.setMouseMove(x, y);
  }

  handleMouseUp(): void {
    this.particleSystem.setMouseUp();
  }

  handleTouchStart(touch: Touch): void {
    this.handleMouseDown(touch.clientX, touch.clientY);
  }

  handleTouchMove(touch: Touch): void {
    this.handleMouseMove(touch.clientX, touch.clientY);
  }

  handleTouchEnd(): void {
    this.handleMouseUp();
  }

  private getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  switchPainting(index: number): void {
    if (index < 0 || index >= PAINTINGS.length) return;
    if (index === this.currentPaintingIndex) return;

    this.currentPaintingIndex = index;
    const painting = PAINTINGS[index];
    this.particleSystem.switchPainting(painting);
    this.callbacks.onPaintingChange(painting, index);
  }

  resetPainting(): void {
    this.particleSystem.resetToOrigin();
  }

  getCurrentPaintingIndex(): number {
    return this.currentPaintingIndex;
  }

  getPaintings(): Painting[] {
    return PAINTINGS;
  }

  renderThumbnail(index: number, ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (index < 0 || index >= PAINTINGS.length) return;
    const painting = PAINTINGS[index];
    const tempSystem = new ParticleSystem();
    tempSystem.init(w, h, painting);
    ctx.clearRect(0, 0, w, h);
    tempSystem.renderThumbnail(ctx, w, h);
  }

  getPrimaryColor(index: number): string {
    if (index < 0 || index >= PAINTINGS.length) return '#FFFFFF';
    return PAINTINGS[index].colors[0];
  }
}
