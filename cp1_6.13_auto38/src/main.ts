import { initControls, setFireButtonEnabled, ControlState } from './controls';
import {
  SimulationState,
  createInitialState,
  simulateLaunch,
  updatePhysics,
  LaunchParams,
} from './physics';
import { renderFrame } from './renderer';

const CANVAS_MIN_W = 800;
const CANVAS_MIN_H = 600;

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state!: SimulationState;
  private controls!: ControlState;
  private lastTime: number = 0;
  private running: boolean = false;
  private wallBaseX: number = 0;
  private wallBaseY: number = 0;
  private trebuchetX: number = 0;
  private trebuchetY: number = 0;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.resize();
    this.initLayout();
    this.state = createInitialState(this.wallBaseX, this.wallBaseY);
    this.controls = initControls();
    this.setupCallbacks();
    this.hideLoading();
  }

  private resize(): void {
    const w = Math.max(CANVAS_MIN_W, window.innerWidth);
    const h = Math.max(CANVAS_MIN_H, window.innerHeight);
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private initLayout(): void {
    const w = Math.max(CANVAS_MIN_W, window.innerWidth);
    const h = Math.max(CANVAS_MIN_H, window.innerHeight);

    this.wallBaseX = w * 0.5 - 6 * 45 / 2;
    this.wallBaseY = h * 0.78;
    this.trebuchetX = w * 0.18;
    this.trebuchetY = h * 0.78 - 5;
  }

  private setupCallbacks(): void {
    this.controls.onFire = () => this.fire();
    this.controls.onReset = () => this.reset();

    window.addEventListener('resize', () => {
      this.resize();
      this.initLayout();
    });
  }

  private fire(): void {
    if (this.state.phase !== 'idle') return;

    setFireButtonEnabled(false);
    this.state.trebuchetAngle = this.controls.angle;

    const params: LaunchParams = {
      angle: this.controls.angle,
      force: this.controls.force,
      weight: this.controls.weight,
    };

    this.state = simulateLaunch(
      this.state,
      params,
      this.trebuchetX,
      this.trebuchetY
    );

    setTimeout(() => {
      setFireButtonEnabled(true);
    }, 2000);
  }

  private reset(): void {
    this.state = createInitialState(this.wallBaseX, this.wallBaseY);
  }

  private hideLoading(): void {
    setTimeout(() => {
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        setTimeout(() => loadingScreen.remove(), 500);
      }
    }, 1200);
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  private loop = (): void => {
    if (!this.running) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.state.trebuchetAngle = this.controls.angle;
    this.state = updatePhysics(this.state, dt);

    const w = Math.max(CANVAS_MIN_W, window.innerWidth);
    const h = Math.max(CANVAS_MIN_H, window.innerHeight);

    renderFrame(
      this.ctx,
      this.state,
      w,
      h,
      this.wallBaseX,
      this.wallBaseY,
      this.trebuchetX,
      this.trebuchetY
    );

    requestAnimationFrame(this.loop);
  };
}

const game = new Game();
game.start();
