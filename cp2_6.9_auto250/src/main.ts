import './style.css';
import { Vec2, vec2, LightSource, Mirror, Lens, OpticsElement } from './optics';
import { RayTracer, RaySegment, RenderParams } from './raytracer';
import { UIController, UIState } from './ui';

class Application {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rayTracer: RayTracer;
  private ui: UIController;

  private elements: OpticsElement[] = [];
  private currentParams: RenderParams = {
    rayCount: 36,
    lightIntensity: 0.8,
    showLabels: false
  };

  private cachedSegments: RaySegment[] | null = null;
  private cacheDirty: boolean = true;
  private drawingVertices: Vec2[] = [];
  private drawingActive: boolean = false;

  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 0;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas 2d context');
    this.ctx = ctx;

    this.resizeCanvas();
    this.rayTracer = new RayTracer(this.canvas.width, this.canvas.height);

    this.ui = new UIController(
      this.canvas,
      (state: UIState) => this.handleStateChange(state),
      () => this.requestRender()
    );

    this.ui.onPlaceElement = (el: OpticsElement) => this.addElement(el);
    this.ui.onDrawingUpdate = (vertices: Vec2[]) => this.handleDrawingUpdate(vertices);
    this.ui.onDrawingEnd = () => this.handleDrawingEnd();
    this.ui.getElementsAtPoint = (p: Vec2) => this.findElementAt(p);

    this.initDefaultElements();
    this.bindEvents();
    this.startRenderLoop();
  }

  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.rayTracer) {
      this.rayTracer.resize(width, height);
    }
  }

  private initDefaultElements(): void {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;

    const defaultLight = new LightSource(cx - 200, cy, '#FFD700');
    this.elements.push(defaultLight);

    const defaultMirror = Mirror.createRightTriangle(cx + 100, cy, 60);
    this.elements.push(defaultMirror);
  }

  private addElement(el: OpticsElement): void {
    this.elements.push(el);
    this.cacheDirty = true;
  }

  private findElementAt(p: Vec2): OpticsElement | null {
    for (let i = this.elements.length - 1; i >= 0; i--) {
      const el = this.elements[i];
      if (el instanceof LightSource && el.contains(p)) return el;
      if (el instanceof Mirror && el.contains(p)) return el;
      if (el instanceof Lens && el.contains(p)) return el;
    }
    return null;
  }

  private handleStateChange(state: UIState): void {
    this.currentParams = { ...state.params };
    this.cacheDirty = true;
  }

  private handleDrawingUpdate(vertices: Vec2[]): void {
    this.drawingVertices = vertices;
    this.drawingActive = true;
    this.cacheDirty = true;
  }

  private handleDrawingEnd(): void {
    this.drawingVertices = [];
    this.drawingActive = false;
    this.cacheDirty = true;
  }

  private requestRender(): void {
    this.cacheDirty = true;
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.cacheDirty = true;
    });
  }

  private startRenderLoop(): void {
    const loop = (time: number) => {
      this.frameCount++;
      if (time - this.lastFrameTime >= 1000) {
        this.fps = this.frameCount;
        this.frameCount = 0;
        this.lastFrameTime = time;
      }
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private render(): void {
    const lights = this.elements.filter(el => el instanceof LightSource) as LightSource[];

    if (this.cacheDirty || !this.cachedSegments) {
      this.cachedSegments = this.rayTracer.traceAll(lights, this.elements, this.currentParams);
      this.cacheDirty = false;
    }

    this.rayTracer.render(this.ctx, this.cachedSegments, this.elements, this.currentParams);

    if (this.drawingActive && this.drawingVertices.length > 0) {
      this.ui.drawPreview(this.ctx, this.drawingVertices);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    new Application();
  } catch (err) {
    console.error('Failed to start application:', err);
  }
});
