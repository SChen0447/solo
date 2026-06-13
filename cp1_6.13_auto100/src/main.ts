import { generateMonetSunset, extractPixels, PixelData } from './image-loader';
import { ParticleSystem } from './particle-system';
import { Renderer } from './renderer';

const PARTICLE_COUNT = 8000;

function getCanvasSize(): { width: number; height: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let canvasWidth: number;

  if (vw >= 1024) {
    canvasWidth = Math.floor(vw * 0.7);
  } else if (vw >= 768) {
    canvasWidth = Math.floor(vw * 0.85);
  } else {
    canvasWidth = Math.floor(vw * 0.95);
  }

  const canvasHeight = Math.floor(canvasWidth * 0.75);

  if (canvasHeight > vh * 0.9) {
    const adjustedHeight = Math.floor(vh * 0.9);
    canvasWidth = Math.floor(adjustedHeight / 0.75);
    return { width: canvasWidth, height: adjustedHeight };
  }

  return { width: canvasWidth, height: canvasHeight };
}

class App {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private paintingCanvas: HTMLCanvasElement;
  private particleSystem!: ParticleSystem;
  private renderer!: Renderer;
  private animationId: number = 0;
  private isVisible: boolean = true;
  private pixelData: PixelData[] = [];
  private currentWidth = 0;
  private currentHeight = 0;

  constructor() {
    const canvasEl = document.getElementById('canvas') as HTMLCanvasElement;
    const containerEl = document.getElementById('canvas-container')!;

    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d', { alpha: false })!;
    this.container = containerEl;

    this.paintingCanvas = document.createElement('canvas');

    this.setupSize();
    this.initPainting();
    this.createParticleSystem();
    this.setupEvents();
    this.startLoop();
  }

  private setupSize(): void {
    const { width, height } = getCanvasSize();
    this.currentWidth = width;
    this.currentHeight = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.container.style.width = `${width}px`;
    this.container.style.height = `${height}px`;
  }

  private initPainting(): void {
    generateMonetSunset(this.paintingCanvas, this.currentWidth, this.currentHeight);
    this.pixelData = extractPixels(this.paintingCanvas, PARTICLE_COUNT);
  }

  private createParticleSystem(): void {
    this.particleSystem = new ParticleSystem(
      this.currentWidth,
      this.currentHeight,
      this.pixelData
    );
    this.renderer = new Renderer(
      this.ctx,
      this.currentWidth,
      this.currentHeight,
      this.paintingCanvas
    );
  }

  private setupEvents(): void {
    this.canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      this.particleSystem.handleMouseMove(x, y);
    });

    this.canvas.addEventListener('mouseenter', () => {
      this.particleSystem.handleMouseEnter();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.particleSystem.handleMouseLeave();
    });

    this.canvas.addEventListener('click', (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      this.particleSystem.handleClick(x, y);
    });

    this.canvas.addEventListener('touchmove', (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = (touch.clientX - rect.left) * (this.canvas.width / rect.width);
      const y = (touch.clientY - rect.top) * (this.canvas.height / rect.height);
      this.particleSystem.handleMouseMove(x, y);
      this.particleSystem.handleMouseEnter();
    }, { passive: false });

    this.canvas.addEventListener('touchstart', (e: TouchEvent) => {
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = (touch.clientX - rect.left) * (this.canvas.width / rect.width);
      const y = (touch.clientY - rect.top) * (this.canvas.height / rect.height);
      this.particleSystem.handleMouseEnter();
      this.particleSystem.handleMouseMove(x, y);
    });

    this.canvas.addEventListener('touchend', () => {
      this.particleSystem.handleMouseLeave();
    });

    const resetBtn = document.getElementById('reset-btn')!;
    resetBtn.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      this.particleSystem.startReset();
    });

    document.addEventListener('visibilitychange', () => {
      this.isVisible = !document.hidden;
      if (this.isVisible) {
        this.startLoop();
      } else {
        this.stopLoop();
      }
    });

    let resizeTimeout: number;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => this.handleResize(), 200);
    });
  }

  private handleResize(): void {
    this.setupSize();
    this.initPainting();
    this.particleSystem = new ParticleSystem(
      this.currentWidth,
      this.currentHeight,
      this.pixelData
    );
    this.renderer.resize(this.currentWidth, this.currentHeight);
  }

  private startLoop(): void {
    if (this.animationId) return;
    const loop = (time: number) => {
      this.particleSystem.update(time);
      this.renderer.render(this.particleSystem);
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  private stopLoop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }
}

const app = new App();
