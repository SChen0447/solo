import { gsap } from 'gsap';
import { Renderer } from './renderer';
import { InputHandler } from './input';
import { GameEngine } from './game';

class App {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private inputHandler: InputHandler;
  private gameEngine: GameEngine;
  private lastTime: number = 0;
  private animationId: number | null = null;
  private progressText: HTMLElement | null;
  private stepsText: HTMLElement | null;
  private constellationName: HTMLElement | null;
  private resetBtn: HTMLElement | null;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    this.progressText = document.getElementById('progressText');
    this.stepsText = document.getElementById('stepsText');
    this.constellationName = document.getElementById('constellationName');
    this.resetBtn = document.getElementById('resetBtn');

    this.renderer = new Renderer(this.canvas);
    this.inputHandler = new InputHandler(this.canvas);
    this.gameEngine = new GameEngine(this.renderer);

    this.setupEventListeners();
    this.setupGameCallbacks();
    this.updateTransform();
    this.start();
  }

  private setupEventListeners() {
    this.inputHandler.on((type, data) => {
      this.gameEngine.handleInput(type, data);
    });

    window.addEventListener('resize', this.handleResize);

    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', this.handleReset);
    }
  }

  private setupGameCallbacks() {
    this.gameEngine.onProgressUpdate = (progress, steps, constellation) => {
      if (this.progressText) {
        this.progressText.textContent = progress;
      }
      if (this.stepsText) {
        this.stepsText.textContent = steps;
      }
      if (this.constellationName) {
        this.constellationName.textContent = constellation;
      }
    };

    this.gameEngine.onComplete = () => {
      console.log('Constellation complete! Star core ignited!');
    };
  }

  private handleResize = () => {
    this.renderer.resize();
    this.updateTransform();
  };

  private updateTransform() {
    const transform = this.renderer.getTransform();
    this.inputHandler.setTransform(
      transform.offsetX,
      transform.offsetY,
      transform.scale,
      transform.dpr
    );
  }

  private handleReset = () => {
    if (this.resetBtn) {
      const timeline = gsap.timeline();
      timeline.to(this.resetBtn, {
        scale: 1.2,
        duration: 0.15,
        ease: 'power2.out'
      });
      timeline.to(this.resetBtn, {
        scale: 1,
        duration: 0.15,
        ease: 'power2.in'
      });
    }
    this.gameEngine.forceReset();
  };

  private start() {
    this.lastTime = performance.now();
    this.animate();
  }

  private animate = () => {
    const currentTime = performance.now();
    const deltaTime = Math.min(currentTime - this.lastTime, 50);
    this.lastTime = currentTime;

    this.gameEngine.update(deltaTime);

    this.animationId = requestAnimationFrame(this.animate);
  };

  destroy() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.handleResize);
    if (this.resetBtn) {
      this.resetBtn.removeEventListener('click', this.handleReset);
    }
    this.inputHandler.destroy();
  }
}

let app: App | null = null;

function init() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      app = new App();
    });
  } else {
    app = new App();
  }
}

init();

export default App;
