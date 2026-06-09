import { BrushEngine, FONT_STYLES } from './BrushEngine';
import { Renderer } from './Renderer';
import { UIController } from './uiController';

class App {
  private canvas: HTMLCanvasElement;
  private brushEngine: BrushEngine;
  private renderer: Renderer;
  private uiController: UIController;
  private activePointers: Set<number> = new Set();

  constructor() {
    this.canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;

    this.uiController = new UIController();
    this.brushEngine = new BrushEngine(
      FONT_STYLES.kaishu,
      '#0D0D0D',
      100
    );
    this.renderer = new Renderer(this.canvas);

    this.init();
  }

  private init(): void {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.renderer.startAnimationLoop();

    this.bindCanvasEvents();
    this.bindUIEvents();
    this.bindEngineEvents();

    this.uiController.updateInkDisplay(this.brushEngine.getRemainingInk());
    this.uiController.updateSpeedDisplay(0);
  }

  private resizeCanvas(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const padding = this.uiController.isMobile() ? 4 : 8;
    const width = Math.floor(rect.width - padding * 2);
    const height = Math.floor(rect.height - padding * 2);

    this.renderer.resize(width, height);
    this.renderer.clear();
  }

  private getCanvasPoint(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  private bindCanvasEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const { x, y } = this.getCanvasPoint(e.clientX, e.clientY);
      this.brushEngine.startStroke(x, y, 0, performance.now());
      this.activePointers.add(0);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.activePointers.has(0)) return;
      e.preventDefault();
      const { x, y } = this.getCanvasPoint(e.clientX, e.clientY);
      this.brushEngine.moveStroke(x, y, 0, performance.now());
    });

    this.canvas.addEventListener('mouseup', (e) => {
      e.preventDefault();
      this.brushEngine.endStroke(0, performance.now());
      this.activePointers.delete(0);
    });

    this.canvas.addEventListener('mouseleave', () => {
      if (this.activePointers.has(0)) {
        this.brushEngine.endStroke(0, performance.now());
        this.activePointers.delete(0);
      }
    });

    this.canvas.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        for (const touch of e.changedTouches) {
          const { x, y } = this.getCanvasPoint(touch.clientX, touch.clientY);
          this.brushEngine.startStroke(x, y, touch.identifier, performance.now());
          this.activePointers.add(touch.identifier);
        }
      },
      { passive: false }
    );

    this.canvas.addEventListener(
      'touchmove',
      (e) => {
        e.preventDefault();
        for (const touch of e.changedTouches) {
          if (!this.activePointers.has(touch.identifier)) continue;
          const { x, y } = this.getCanvasPoint(touch.clientX, touch.clientY);
          this.brushEngine.moveStroke(x, y, touch.identifier, performance.now());
        }
      },
      { passive: false }
    );

    this.canvas.addEventListener(
      'touchend',
      (e) => {
        e.preventDefault();
        for (const touch of e.changedTouches) {
          this.brushEngine.endStroke(touch.identifier, performance.now());
          this.activePointers.delete(touch.identifier);
        }
      },
      { passive: false }
    );

    this.canvas.addEventListener(
      'touchcancel',
      (e) => {
        e.preventDefault();
        for (const touch of e.changedTouches) {
          this.brushEngine.endStroke(touch.identifier, performance.now());
          this.activePointers.delete(touch.identifier);
        }
      },
      { passive: false }
    );
  }

  private bindUIEvents(): void {
    this.uiController.subscribe((event) => {
      switch (event.type) {
        case 'styleChange':
          this.brushEngine.setStyle(event.style);
          break;
        case 'colorChange':
          this.brushEngine.setInkColor(event.color);
          break;
        case 'inkAmountChange':
          this.brushEngine.setInkAmount(event.amount);
          break;
        case 'textureToggle':
          this.renderer.setShowTexture(event.show);
          this.renderer.clear();
          break;
        case 'clear':
          this.renderer.clear();
          this.brushEngine.clearAll();
          break;
      }
    });
  }

  private bindEngineEvents(): void {
    this.brushEngine.subscribe((event) => {
      switch (event.type) {
        case 'strokeMove':
          this.renderer.renderStrokeSegment(
            event.points,
            this.brushEngine.getInkColor()
          );
          break;
        case 'strokeStart':
          break;
        case 'strokeEnd':
          this.brushEngine.refillInk();
          break;
        case 'speedUpdate':
          this.uiController.updateSpeedDisplay(event.speed);
          break;
        case 'inkUpdate':
          this.uiController.updateInkDisplay(event.remaining);
          break;
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
