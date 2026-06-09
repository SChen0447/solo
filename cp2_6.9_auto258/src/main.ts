import { RippleEngine, type RippleParams } from './rippleEngine';
import { Renderer } from './renderer';
import { Controls } from './controls';

class Application {
  private engine: RippleEngine;
  private renderer: Renderer;
  private controls: Controls;
  private canvas: HTMLCanvasElement;
  private fpsCounter: HTMLElement;
  private canvasContainer: HTMLElement;

  private lastTime: number = 0;
  private frameCount: number = 0;
  private fpsAccumulator: number = 0;
  private currentFps: number = 60;
  private isDragging: boolean = false;
  private animationId: number | null = null;
  private currentParams: RippleParams;

  constructor() {
    this.canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    this.fpsCounter = document.getElementById('fpsCounter') as HTMLElement;
    this.canvasContainer = document.getElementById('canvasContainer') as HTMLElement;

    this.engine = new RippleEngine();
    this.renderer = new Renderer(
      this.canvas,
      this.engine.getGridCols(),
      this.engine.getGridRows(),
      this.engine.getCellSize()
    );

    this.currentParams = {
      centerX: 0.5 * this.engine.getGridCols() * this.engine.getCellSize(),
      centerY: 0.5 * this.engine.getGridRows() * this.engine.getCellSize(),
      frequency: 2.0,
      amplitude: 0.5,
      decay: 0.98
    };

    this.controls = new Controls({
      onPauseToggle: () => {
        if (this.engine.isPaused()) {
          this.engine.resume();
        } else {
          this.engine.pause();
        }
      },
      onReset: () => {
        this.engine.reset();
      },
      onSingleRipple: (params: RippleParams) => {
        this.engine.addRipple(params, performance.now());
      },
      onParamsChange: (params: RippleParams) => {
        this.currentParams = params;
      }
    });

    this.currentParams = this.controls.getParams(
      this.engine.getGridCols() * this.engine.getCellSize(),
      this.engine.getGridRows() * this.engine.getCellSize()
    );

    this.bindCanvasEvents();
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  private bindCanvasEvents(): void {
    const getCanvasCoords = (e: MouseEvent | Touch): { x: number; y: number } => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    const triggerRipple = (x: number, y: number) => {
      const params = this.controls.getParams(
        this.canvas.width,
        this.canvas.height,
        x,
        y
      );
      this.engine.addRipple(params, performance.now());
    };

    this.canvas.addEventListener('mousedown', (e: MouseEvent) => {
      this.isDragging = true;
      const { x, y } = getCanvasCoords(e);
      triggerRipple(x, y);
    });

    this.canvas.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isDragging) return;
      const { x, y } = getCanvasCoords(e);
      triggerRipple(x, y);
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    this.canvas.addEventListener('touchstart', (e: TouchEvent) => {
      e.preventDefault();
      this.isDragging = true;
      const touch = e.touches[0];
      const { x, y } = getCanvasCoords(touch);
      triggerRipple(x, y);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e: TouchEvent) => {
      e.preventDefault();
      if (!this.isDragging) return;
      const touch = e.touches[0];
      const { x, y } = getCanvasCoords(touch);
      triggerRipple(x, y);
    }, { passive: false });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }

  private handleResize(): void {
    const containerRect = this.canvasContainer.getBoundingClientRect();
    const canvasW = this.engine.getGridCols() * this.engine.getCellSize();
    const canvasH = this.engine.getGridRows() * this.engine.getCellSize();
    const targetRatio = canvasW / canvasH;

    let displayW = containerRect.width - 32;
    let displayH = containerRect.height - 32;

    if (displayW / displayH > targetRatio) {
      displayW = displayH * targetRatio;
    } else {
      displayH = displayW / targetRatio;
    }

    this.canvas.style.width = `${displayW}px`;
    this.canvas.style.height = `${displayH}px`;
  }

  private animate = (currentTime: number): void => {
    if (this.lastTime === 0) {
      this.lastTime = currentTime;
    }

    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.frameCount++;
    this.fpsAccumulator += deltaTime;

    if (this.fpsAccumulator >= 0.5) {
      this.currentFps = Math.round(this.frameCount / this.fpsAccumulator);
      this.fpsCounter.textContent = `FPS: ${this.currentFps}`;
      this.frameCount = 0;
      this.fpsAccumulator = 0;
    }

    const heightMap = this.engine.update(currentTime, deltaTime);
    this.renderer.render(heightMap);

    this.animationId = requestAnimationFrame(this.animate);
  };

  start(): void {
    this.lastTime = 0;
    this.animationId = requestAnimationFrame(this.animate);
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new Application();
  app.start();
});
