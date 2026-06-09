import { InkBrush } from './brush.js';
import { InkInterface } from './interface.js';
import './styles.css';

interface AppState {
  isDrawing: boolean;
  lastMoveTime: number;
  lastMouseX: number;
  lastMouseY: number;
  strokeStarted: boolean;
}

const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;

class InkApp {
  private canvas: HTMLCanvasElement;
  private brush: InkBrush;
  private ui: InkInterface;
  private state: AppState;
  private rafId: number | null = null;
  private lastFrameTime: number = 0;
  private accumulator: number = 0;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    this.brush = new InkBrush(this.canvas);
    this.ui = new InkInterface(this.brush, {
      onColorChange: () => {},
      onSizeChange: () => {},
      onClear: async () => {
        await this.brush.clear();
      },
      onInkUsed: () => {}
    });

    this.state = {
      isDrawing: false,
      lastMoveTime: 0,
      lastMouseX: 0,
      lastMouseY: 0,
      strokeStarted: false
    };

    this.bindCanvasEvents();
  }

  private getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  private bindCanvasEvents(): void {
    this.canvas.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (this.ui.getInkLevel() <= 0) return;
      const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);
      this.state.isDrawing = true;
      this.state.lastMoveTime = performance.now();
      this.state.lastMouseX = x;
      this.state.lastMouseY = y;
      this.state.strokeStarted = true;
      this.brush.startStroke(x, y);
    });

    this.canvas.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.state.isDrawing) return;
      if (this.ui.getInkLevel() <= 0) {
        this.endDraw(e.clientX, e.clientY);
        return;
      }
      const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);
      const now = performance.now();
      const dt = now - this.state.lastMoveTime;

      const usedInk = this.brush.continueStroke(x, y, dt);
      if (usedInk && this.state.strokeStarted) {
        this.ui.consumeInk();
        this.state.strokeStarted = false;
      }

      this.state.lastMoveTime = now;
      this.state.lastMouseX = x;
      this.state.lastMouseY = y;
    });

    const endDrawHandler = (e: MouseEvent) => {
      this.endDraw(e.clientX, e.clientY);
    };

    this.canvas.addEventListener('mouseup', endDrawHandler);
    this.canvas.addEventListener('mouseleave', endDrawHandler);
  }

  private endDraw(clientX: number, clientY: number): void {
    if (!this.state.isDrawing) return;
    const { x, y } = this.getCanvasCoords(clientX, clientY);
    this.state.isDrawing = false;
    this.brush.endStroke(x, y);
  }

  public start(): void {
    this.lastFrameTime = performance.now();
    this.loop(this.lastFrameTime);
  }

  private loop = (now: number): void => {
    this.rafId = requestAnimationFrame(this.loop);

    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;
    this.accumulator += deltaTime;

    while (this.accumulator >= FRAME_TIME) {
      this.update(now);
      this.accumulator -= FRAME_TIME;
    }
  };

  private update(now: number): void {
    this.brush.update(now);
    this.ui.updateInk(now);
  }

  public stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

function bootstrap(): void {
  try {
    const app = new InkApp();
    app.start();
    (window as unknown as { __inkApp?: InkApp }).__inkApp = app;
  } catch (err) {
    console.error('Failed to initialize ink painting app:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
