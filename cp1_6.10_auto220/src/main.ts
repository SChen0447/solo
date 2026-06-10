import { Ship } from './ship';
import { Trail } from './trail';
import { ObstacleManager } from './obstacle';
import { UIManager, UIState, GameStats } from './ui';

interface Star {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  phase: number;
  period: number;
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private ship: Ship;
  private trail: Trail;
  private obstacles: ObstacleManager;
  private ui: UIManager;
  private stars: Star[] = [];
  private readonly STAR_COUNT = 200;

  private lastTime: number = 0;
  private elapsedTime: number = 0;
  private readonly GAME_DURATION = 300000;
  private maxTrailLength: number = 0;
  private absorbCount: number = 0;
  private isRunning: boolean = false;
  private isGameOver: boolean = false;
  private isVictory: boolean = false;
  private slowGenerateTimer: number = 0;
  private slowGenerate: boolean = false;
  private readonly SLOW_DURATION = 2000;

  private animationId: number = 0;
  private fps: number = 0;
  private frameCount: number = 0;
  private fpsTimer: number = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Cannot get 2D context');
    }
    this.ctx = ctx;

    this.resize();

    this.ship = new Ship(this.width, this.height);
    this.trail = new Trail();
    this.obstacles = new ObstacleManager(this.width, this.height);
    this.ui = new UIManager(this.width, this.height);

    this.initStars();
    this.bindEvents();

    this.ui.setupDOM();
    this.ui.setCallbacks(
      () => this.resetGame(),
      () => this.shareScreenshot()
    );

    this.start();
  }

  private resize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private initStars(): void {
    this.stars = [];
    for (let i = 0; i < this.STAR_COUNT; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: 1 + Math.random(),
        baseAlpha: 0.2 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        period: 500 + Math.random() * 1500
      });
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => {
      this.resize();
      this.ship.resize(this.width, this.height);
      this.obstacles.resize(this.width, this.height);
      this.ui.resize(this.width, this.height);
      this.initStars();
    });

    this.canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      this.ship.setTarget(e.clientX - rect.left, e.clientY - rect.top);
      this.ship.setAccelerating(true);
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.ship.setAccelerating(false);
    });

    this.canvas.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button === 0) {
        this.trail.toggleGlowMode();
      }
    });

    this.canvas.addEventListener('touchstart', (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        this.ship.setTarget(touch.clientX - rect.left, touch.clientY - rect.top);
        this.ship.setAccelerating(true);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        this.ship.setTarget(touch.clientX - rect.left, touch.clientY - rect.top);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e: TouchEvent) => {
      e.preventDefault();
      this.ship.setAccelerating(false);
    }, { passive: false });
  }

  private start(): void {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private loop(currentTime: number): void {
    const deltaTime = Math.min(currentTime - this.lastTime, 50);
    this.lastTime = currentTime;

    this.frameCount++;
    this.fpsTimer += deltaTime;
    if (this.fpsTimer >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    if (this.isRunning && !this.isGameOver) {
      this.update(deltaTime);
    }
    this.render();

    this.animationId = requestAnimationFrame((t) => this.loop(t));
  }

  private update(deltaTime: number): void {
    this.elapsedTime += deltaTime;
    this.ui.update(deltaTime);

    this.ship.update(deltaTime);

    if (this.slowGenerate) {
      this.slowGenerateTimer -= deltaTime;
      if (this.slowGenerateTimer <= 0) {
        this.slowGenerate = false;
        this.trail.setSlowGenerate(false);
      }
    }

    this.trail.addPoint(
      this.ship.state.x,
      this.ship.state.y,
      this.ship.getDirection(),
      this.ship.getSpeed(),
      this.ship.getMaxSpeed()
    );
    this.trail.update(deltaTime);

    const trailLength = this.trail.getLength();
    if (trailLength > this.maxTrailLength) {
      this.maxTrailLength = trailLength;
    }

    const obstacleResult = this.obstacles.update(
      deltaTime,
      this.trail,
      this.ship.state.x,
      this.ship.state.y
    );

    if (obstacleResult.absorbed > 0) {
      this.absorbCount++;
    }

    if (obstacleResult.shipInHole && !this.slowGenerate) {
      this.slowGenerate = true;
      this.slowGenerateTimer = this.SLOW_DURATION;
      this.trail.setSlowGenerate(true);
    }

    if (this.elapsedTime >= this.GAME_DURATION) {
      this.endGame(true);
    } else if (this.trail.getLength() <= 0 && this.elapsedTime > 5000) {
      this.endGame(false);
    }
  }

  private endGame(victory: boolean): void {
    this.isGameOver = true;
    this.isVictory = victory;
    const stats: GameStats = {
      elapsedTime: this.elapsedTime,
      maxTrailLength: this.maxTrailLength,
      absorbCount: this.absorbCount
    };
    this.ui.showGameOverModal(stats, victory);
  }

  private resetGame(): void {
    this.elapsedTime = 0;
    this.maxTrailLength = 0;
    this.absorbCount = 0;
    this.isGameOver = false;
    this.isVictory = false;
    this.slowGenerate = false;
    this.slowGenerateTimer = 0;

    this.ship = new Ship(this.width, this.height);
    this.trail = new Trail();
    this.obstacles = new ObstacleManager(this.width, this.height);
    this.trail.setSlowGenerate(false);
  }

  private shareScreenshot(): void {
    const dataUrl = this.canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `星绘轨迹_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }

  private render(): void {
    const ctx = this.ctx;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, '#0a0e1a');
    bgGrad.addColorStop(1, '#12172e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    this.renderStars();

    this.trail.render(ctx);

    this.obstacles.render(ctx);

    this.ship.render(ctx);

    const uiState: UIState = {
      trailLength: this.trail.getLength(),
      elapsedTime: this.elapsedTime,
      speedRatio: this.ship.getSpeed() / this.ship.getMaxSpeed(),
      maxTrailLength: this.maxTrailLength,
      absorbCount: this.absorbCount,
      isGameOver: this.isGameOver,
      isVictory: this.isVictory
    };
    this.ui.renderInfoPanel(ctx, uiState);
  }

  private renderStars(): void {
    const ctx = this.ctx;
    const time = performance.now();

    for (const star of this.stars) {
      const alpha =
        star.baseAlpha *
        (0.5 + 0.5 * Math.sin(time / star.period * Math.PI * 2 + star.phase));
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.2, Math.min(0.8, alpha))})`;
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  destroy(): void {
    cancelAnimationFrame(this.animationId);
    this.ui.cleanup();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
