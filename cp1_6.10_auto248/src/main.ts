import { config } from './config';
import { simulator } from './simulator';
import { Renderer } from './renderer';

class App {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private isDrawing: boolean = false;
  private animationId: number = 0;
  private lastAddTime: number = 0;
  private readonly MIN_ADD_INTERVAL: number = 15;

  constructor() {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas元素未找到');
    this.canvas = canvas;

    this.renderer = new Renderer(canvas);

    this.init();
  }

  private init(): void {
    this.handleResize();
    this.bindEvents();
    this.startLoop();
  }

  private handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.resize(width, height);
    simulator.setCanvasSize(width, height);
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.handleResize());

    this.canvas.addEventListener('mousedown', (e) => this.onPointerDown(e.clientX, e.clientY));
    this.canvas.addEventListener('mousemove', (e) => this.onPointerMove(e.clientX, e.clientY));
    this.canvas.addEventListener('mouseup', () => this.onPointerUp());
    this.canvas.addEventListener('mouseleave', () => this.onPointerUp());

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onPointerDown(touch.clientX, touch.clientY);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onPointerMove(touch.clientX, touch.clientY);
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.onPointerUp();
    }, { passive: false });

    this.canvas.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      this.onPointerUp();
    }, { passive: false });

    this.initControls();
  }

  private initControls(): void {
    const concentrationSlider = document.getElementById('concentration') as HTMLInputElement;
    const concentrationValue = document.getElementById('concentration-value') as HTMLSpanElement;
    const diffusionSlider = document.getElementById('diffusion') as HTMLInputElement;
    const diffusionValue = document.getElementById('diffusion-value') as HTMLSpanElement;
    const dryingSlider = document.getElementById('drying') as HTMLInputElement;
    const dryingValue = document.getElementById('drying-value') as HTMLSpanElement;
    const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;

    concentrationSlider.addEventListener('input', () => {
      const value = parseFloat(concentrationSlider.value);
      config.set('concentration', value);
      concentrationValue.textContent = value.toFixed(1);
    });

    diffusionSlider.addEventListener('input', () => {
      const value = parseFloat(diffusionSlider.value);
      config.set('diffusionSpeed', value);
      diffusionValue.textContent = value.toFixed(1);
    });

    dryingSlider.addEventListener('input', () => {
      const value = parseFloat(dryingSlider.value);
      config.set('dryingSpeed', value);
      dryingValue.textContent = value.toFixed(1);
    });

    clearBtn.addEventListener('click', () => {
      simulator.startClearAnimation();
    });
  }

  private onPointerDown(x: number, y: number): void {
    this.isDrawing = true;
    simulator.resetLastPosition();
    const speed = simulator.getSpeed(x, y);
    simulator.addInkPoint(x, y, speed);
    this.lastAddTime = performance.now();
  }

  private onPointerMove(x: number, y: number): void {
    if (!this.isDrawing) return;

    const now = performance.now();
    if (now - this.lastAddTime < this.MIN_ADD_INTERVAL) return;

    const speed = simulator.getSpeed(x, y);
    simulator.addInkPoint(x, y, speed);
    this.lastAddTime = now;
  }

  private onPointerUp(): void {
    this.isDrawing = false;
    simulator.resetLastPosition();
  }

  private startLoop(): void {
    const loop = () => {
      const frame = simulator.update();
      this.renderer.render(frame);
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

let app: App | null = null;

document.addEventListener('DOMContentLoaded', () => {
  app = new App();
});
