import { BallManager } from './BallManager';
import { Renderer } from './Renderer';
import { InputHandler, ShotParams } from './InputHandler';

const TABLE_WIDTH = 1000;
const TABLE_HEIGHT = 500;
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ballManager: BallManager;
  private renderer: Renderer;
  private inputHandler: InputHandler;
  private scoreValueEl: HTMLElement;
  private remainingValueEl: HTMLElement;
  private resetValueEl: HTMLElement;
  private resetBtn: HTMLElement;
  private lastTime: number = 0;
  private animationId: number = 0;
  private accumulator: number = 0;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.canvas.width = TABLE_WIDTH;
    this.canvas.height = TABLE_HEIGHT;

    this.scoreValueEl = document.getElementById('scoreValue')!;
    this.remainingValueEl = document.getElementById('remainingValue')!;
    this.resetValueEl = document.getElementById('resetValue')!;
    this.resetBtn = document.getElementById('resetBtn')!;

    this.ballManager = new BallManager();
    this.renderer = new Renderer(this.canvas);
    this.inputHandler = new InputHandler(this.canvas);

    this.setupEventHandlers();
    this.updateUI();
    this.updateCueBallPosition();
  }

  private setupEventHandlers(): void {
    this.ballManager.onScoreChange = () => this.updateUI();

    this.ballManager.onBallPotted = (x: number, y: number, color: string) => {
      this.renderer.addParticles(x, y, color);
    };

    this.inputHandler.onShot = (params: ShotParams) => {
      this.handleShot(params);
    };

    this.resetBtn.addEventListener('click', () => {
      this.resetGame();
    });
  }

  private handleShot(params: ShotParams): void {
    if (!this.inputHandler.canShoot) return;

    this.ballManager.strikeCueBall(params.angle, params.power);
    this.inputHandler.canShoot = false;
  }

  private updateCueBallPosition(): void {
    const cueBall = this.ballManager.getCueBall();
    if (cueBall) {
      this.inputHandler.setCueBallPosition(cueBall.x, cueBall.y);
    }
  }

  private updateUI(): void {
    this.scoreValueEl.textContent = this.ballManager.score.toString();
    this.remainingValueEl.textContent = this.ballManager.remainingBalls.toString();
    this.resetValueEl.textContent = this.ballManager.cueResetCount.toString();
  }

  private resetGame(): void {
    this.ballManager.reset();
    this.inputHandler.canShoot = true;
    this.updateCueBallPosition();
  }

  start(): void {
    this.lastTime = performance.now();
    this.loop();
  }

  private loop = (): void => {
    const currentTime = performance.now();
    let deltaTime = (currentTime - this.lastTime) / 1000;

    if (deltaTime > 0.25) deltaTime = 0.25;

    this.lastTime = currentTime;
    this.accumulator += deltaTime;

    while (this.accumulator >= FRAME_TIME / 1000) {
      this.update(FRAME_TIME / 1000);
      this.accumulator -= FRAME_TIME / 1000;
    }

    this.render(deltaTime);
    this.animationId = requestAnimationFrame(this.loop);
  };

  private update(_deltaTime: number): void {
    this.ballManager.updatePhysics();
    this.inputHandler.updatePowerDisplay();

    if (!this.inputHandler.canShoot && this.ballManager.areAllBallsStopped()) {
      this.inputHandler.canShoot = true;
      this.updateCueBallPosition();
    }

    if (this.inputHandler.canShoot) {
      this.updateCueBallPosition();
    }
  }

  private render(deltaTime: number): void {
    this.renderer.render(
      this.ballManager.getActiveBalls(),
      this.inputHandler,
      deltaTime
    );
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.inputHandler.destroy();
  }
}

const game = new GameEngine();
game.start();
