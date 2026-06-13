import { ParticleSystem } from './particles';
import { InteractionManager } from './interaction';
import { UIManager } from './ui';

class GameApp {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  particleSystem!: ParticleSystem;
  interactionManager!: InteractionManager;
  uiManager!: UIManager;
  lastTime: number = 0;
  animationId: number = 0;
  dpr: number = 1;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('2D context not supported');
    }
    this.ctx = ctx;
  }

  init(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.resize();
    window.addEventListener('resize', () => this.resize());

    const { width, height } = this.getCanvasSize();

    this.particleSystem = new ParticleSystem(width, height);
    this.interactionManager = new InteractionManager();
    this.uiManager = new UIManager(width, height);

    this.interactionManager.init(this.canvas, this.particleSystem);
    this.uiManager.init(this.canvas);

    this.interactionManager.onModeChange = (mode) => {
      this.uiManager.setMode(mode);
    };

    this.lastTime = performance.now();
  }

  private getCanvasSize(): { width: number; height: number } {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const minAspectRatio = 16 / 9;
    const windowAspectRatio = windowWidth / windowHeight;

    let width: number;
    let height: number;

    if (windowAspectRatio < minAspectRatio) {
      width = windowWidth;
      height = windowWidth / minAspectRatio;
    } else {
      width = windowWidth;
      height = windowHeight;
    }

    return { width, height };
  }

  resize(): void {
    const { width, height } = this.getCanvasSize();

    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.particleSystem) {
      this.particleSystem.resize(width, height);
    }
    if (this.uiManager) {
      this.uiManager.resize(width, height);
    }
  }

  loop(currentTime: number): void {
    const deltaTime = Math.min(currentTime - this.lastTime, 50);
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.draw();

    this.animationId = requestAnimationFrame((t) => this.loop(t));
  }

  private update(deltaTime: number): void {
    this.interactionManager.update(deltaTime);
    this.uiManager.update(deltaTime);

    const dragPoints = this.interactionManager.getDragPoints();
    this.particleSystem.update(
      deltaTime,
      this.interactionManager.mouseX,
      this.interactionManager.mouseY,
      this.interactionManager.isDragging,
      dragPoints
    );
  }

  private draw(): void {
    const { width, height } = this.getCanvasSize();

    this.ctx.clearRect(0, 0, width, height);

    this.particleSystem.draw(this.ctx);
    this.uiManager.draw(this.ctx);
    this.uiManager.drawTouchHint(this.ctx);
  }

  start(): void {
    this.animationId = requestAnimationFrame((t) => this.loop(t));
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

const app = new GameApp();
app.init();
app.start();
