import { generateLeafGeometry, type LeafParams } from './leafGenerator';
import { LeafRenderer } from './renderer';
import { UIController } from './uiController';

class LeafLoomApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: LeafRenderer;
  private uiController: UIController;
  private geometryDirty: boolean = true;
  private currentParams: LeafParams;
  private animationId: number = 0;
  private lastRegenTime: number = 0;
  private readonly REGEN_THROTTLE_MS: number = 50;

  constructor() {
    const canvas = document.getElementById('leaf-canvas') as HTMLCanvasElement | null;
    const controlPanel = document.getElementById('control-panel') as HTMLElement | null;

    if (!canvas) throw new Error('找不到 #leaf-canvas 元素');
    if (!controlPanel) throw new Error('找不到 #control-panel 元素');

    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取 Canvas 2D 上下文');
    this.ctx = ctx;

    this.renderer = new LeafRenderer();
    this.renderer.setSwingParams(3, 1.0);

    this.uiController = new UIController(controlPanel, {
      onParamsChange: (params: LeafParams) => this.handleParamsChange(params)
    });

    this.currentParams = this.uiController.getParams();

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  start(): void {
    this.regenerate();
    this.loop();
  }

  private handleParamsChange(params: LeafParams): void {
    this.currentParams = params;
    const now = performance.now();
    if (now - this.lastRegenTime >= this.REGEN_THROTTLE_MS) {
      this.geometryDirty = true;
      this.lastRegenTime = now;
    }
  }

  private regenerate(): void {
    const geometry = generateLeafGeometry(this.currentParams);
    this.renderer.renderToOffscreen(geometry, this.currentParams);
    this.geometryDirty = false;
  }

  private resizeCanvas(): void {
    const w = Math.max(600, window.innerWidth);
    const h = Math.max(400, window.innerHeight);
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.geometryDirty = true;
  }

  private loop = (): void => {
    if (this.geometryDirty) {
      this.regenerate();
    }

    const displayW = this.canvas.width / (window.devicePixelRatio || 1);
    const displayH = this.canvas.height / (window.devicePixelRatio || 1);
    this.renderer.renderToDisplay(this.ctx, displayW, displayH);

    this.animationId = requestAnimationFrame(this.loop);
  };

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

function bootstrap(): void {
  try {
    const app = new LeafLoomApp();
    app.start();
    (window as unknown as { __leafLoom?: LeafLoomApp }).__leafLoom = app;
  } catch (err) {
    console.error('[叶脉织机] 启动失败:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
