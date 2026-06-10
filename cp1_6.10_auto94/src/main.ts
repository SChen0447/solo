import {
  Ball,
  Platform,
  CollisionEffect,
  createInitialBalls,
  createPlatforms,
  createRandomBall,
  applyGravity,
  updatePosition,
  updateBallTrail,
  resolveWallCollision,
  resolvePlatformCollision,
  resolveBallCollision,
  getCollisionPoint,
  getWallCollisionPoint,
  calculateTotalKineticEnergy,
  calculateTotalMomentum,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  MAX_BALLS
} from './physics';
import { Renderer } from './renderer';
import { UIManager, PhysicsStats } from './ui';

class PhysicsSimulation {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private ui: UIManager;
  private balls: Ball[] = [];
  private platforms: Platform[] = [];
  private effects: CollisionEffect[] = [];
  private isPaused: boolean = false;
  private lastTime: number = 0;
  private animationId: number = 0;
  private ballIdCounter: number = 0;
  private lastCollisionTimestamp: number = 0;
  private readonly COLLISION_EFFECT_DURATION = 9;

  constructor() {
    this.canvas = document.getElementById('simulation-canvas') as HTMLCanvasElement;
    this.renderer = new Renderer(this.canvas);

    this.ui = new UIManager({
      onReset: () => this.reset(),
      onPauseToggle: () => this.togglePause(),
      onStep: () => this.step()
    });

    this.bindCanvasEvents();
    this.init();
  }

  private init(): void {
    this.platforms = createPlatforms();
    this.balls = createInitialBalls();
    this.ballIdCounter = this.balls.length;
    this.effects = [];
    this.lastCollisionTimestamp = 0;
    this.isPaused = false;
    this.ui.setPaused(false);

    this.render();
    this.updateUI();
    this.start();
  }

  private start(): void {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private loop(currentTime: number): void {
    this.animationId = requestAnimationFrame((t) => this.loop(t));

    if (this.isPaused) {
      this.lastTime = currentTime;
      return;
    }

    const dt = Math.min((currentTime - this.lastTime) / 1000, 1 / 30);
    this.lastTime = currentTime;

    this.update(dt);
    this.render();
    this.updateUI();
  }

  private update(dt: number): void {
    for (const ball of this.balls) {
      updateBallTrail(ball);
      applyGravity(ball, dt);
      updatePosition(ball, dt);
    }

    for (const ball of this.balls) {
      resolveWallCollision(ball);
      const wallPoint = getWallCollisionPoint(ball);
      if (wallPoint) {
        this.addCollisionEffect(wallPoint.x, wallPoint.y);
      }
    }

    for (const ball of this.balls) {
      if (resolvePlatformCollision(ball, this.platforms)) {
        this.addCollisionEffect(ball.x, ball.y);
      }
    }

    for (let i = 0; i < this.balls.length; i++) {
      for (let j = i + 1; j < this.balls.length; j++) {
        if (resolveBallCollision(this.balls[i], this.balls[j])) {
          const point = getCollisionPoint(this.balls[i], this.balls[j]);
          this.addCollisionEffect(point.x, point.y);
        }
      }
    }

    this.effects = this.effects.filter((e) => {
      e.age++;
      return e.age < e.duration;
    });
  }

  private step(): void {
    if (!this.isPaused) return;
    this.update(1 / 60);
    this.render();
    this.updateUI();
  }

  private render(): void {
    this.renderer.render(this.balls, this.platforms, this.effects);
  }

  private updateUI(): void {
    const ke = calculateTotalKineticEnergy(this.balls) / 3600;
    const momentum = calculateTotalMomentum(this.balls);

    const stats: PhysicsStats = {
      ballCount: this.balls.length,
      kineticEnergy: ke,
      momentumX: momentum.px / 60,
      momentumY: momentum.py / 60,
      lastCollisionTime: this.lastCollisionTimestamp
    };

    this.ui.updateStats(stats);
  }

  private addCollisionEffect(x: number, y: number): void {
    this.lastCollisionTimestamp = performance.now();
    this.effects.push({
      x,
      y,
      age: 0,
      duration: this.COLLISION_EFFECT_DURATION
    });
  }

  private bindCanvasEvents(): void {
    this.canvas.addEventListener('click', (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      if (y < 50) return;

      this.spawnBall(x, y);
    });
  }

  private spawnBall(x: number, y: number): void {
    const ball = createRandomBall(x, y, this.ballIdCounter++);
    this.balls.push(ball);

    while (this.balls.length > MAX_BALLS) {
      this.balls.shift();
    }
  }

  private reset(): void {
    cancelAnimationFrame(this.animationId);
    this.init();
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    this.ui.setPaused(this.isPaused);
    if (!this.isPaused) {
      this.lastTime = performance.now();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PhysicsSimulation();
});
