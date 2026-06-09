import { Ball, Paddle, Brick, PowerUp } from './objects';
import { PhysicsEngine, MAX_PARTICLES } from './physics';
import { ParticleSystem, ScreenShake, VictoryEffect, BackgroundGrid } from './effects';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const BRICK_ROWS = 5;
const BRICK_COLS = 10;
const BRICK_WIDTH = 64;
const BRICK_HEIGHT = 24;
const BRICK_OFFSET_TOP = 60;
const BRICK_OFFSET_LEFT = 60;
const BRICK_GAP = 8;
const INITIAL_LIVES = 3;

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ball: Ball;
  private paddle: Paddle;
  private bricks: Brick[] = [];
  private powerUps: PowerUp[] = [];
  private physics: PhysicsEngine;
  private particles: ParticleSystem;
  private screenShake: ScreenShake;
  private victoryEffect: VictoryEffect;
  private backgroundGrid: BackgroundGrid;

  private score: number = 0;
  private lives: number = INITIAL_LIVES;
  private gameOver: boolean = false;
  private victory: boolean = false;
  private victoryStarted: boolean = false;
  private lastFrameTime: number = 0;

  private scoreDisplay: HTMLElement;
  private bricksCountDisplay: HTMLElement;
  private livesDisplay: HTMLElement;
  private speedDisplay: HTMLElement;
  private boostStatus: HTMLElement;
  private boostTime: HTMLElement;
  private gameOverScreen: HTMLElement;
  private finalScoreDisplay: HTMLElement;
  private victoryScreen: HTMLElement;
  private victoryScoreDisplay: HTMLElement;
  private victoryTitle: HTMLElement;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to get 2D context');
    }
    this.ctx = ctx;

    this.scoreDisplay = document.getElementById('score-value')!;
    this.bricksCountDisplay = document.getElementById('bricks-count')!;
    this.livesDisplay = document.getElementById('lives-display')!;
    this.speedDisplay = document.getElementById('speed-value')!;
    this.boostStatus = document.getElementById('boost-status')!;
    this.boostTime = document.getElementById('boost-time')!;
    this.gameOverScreen = document.getElementById('game-over-screen')!;
    this.finalScoreDisplay = document.getElementById('final-score')!;
    this.victoryScreen = document.getElementById('victory-screen')!;
    this.victoryScoreDisplay = document.getElementById('victory-score')!;
    this.victoryTitle = document.getElementById('victory-title')!;

    this.paddle = new Paddle(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.ball = this.createBall();
    this.physics = new PhysicsEngine(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.particles = new ParticleSystem(MAX_PARTICLES);
    this.screenShake = new ScreenShake();
    this.victoryEffect = new VictoryEffect(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.backgroundGrid = new BackgroundGrid(CANVAS_WIDTH, CANVAS_HEIGHT);

    this.generateBricks();
    this.setupEventListeners();
    this.updateUI();
  }

  private createBall(): Ball {
    const ball = new Ball(
      this.paddle.x + this.paddle.width / 2,
      this.paddle.y - 15
    );
    return ball;
  }

  private generateBricks(): void {
    this.bricks = [];

    for (let row = 0; row < BRICK_ROWS; row++) {
      const isEvenRow = row % 2 === 0;
      const rowOffset = isEvenRow ? 0 : (BRICK_WIDTH + BRICK_GAP) / 2;

      const powerUpIndices: Set<number> = new Set();
      const powerUpCount = 1 + Math.floor(Math.random() * 2);
      while (powerUpIndices.size < powerUpCount) {
        powerUpIndices.add(Math.floor(Math.random() * BRICK_COLS));
      }

      for (let col = 0; col < BRICK_COLS; col++) {
        const x = BRICK_OFFSET_LEFT + col * (BRICK_WIDTH + BRICK_GAP) + rowOffset;
        const y = BRICK_OFFSET_TOP + row * (BRICK_HEIGHT + BRICK_GAP);

        if (x + BRICK_WIDTH > CANVAS_WIDTH - BRICK_OFFSET_LEFT) {
          continue;
        }

        const isPowerUp = powerUpIndices.has(col);
        const brick = new Brick(x, y, BRICK_WIDTH, BRICK_HEIGHT, row, isPowerUp);
        this.bricks.push(brick);
      }
    }

    this.physics.rebuildSpatialHash(this.bricks);
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const mouseX = (e.clientX - rect.left) * scaleX;
      this.paddle.moveTo(mouseX, CANVAS_WIDTH);
    });

    document.getElementById('restart-btn')!.addEventListener('click', () => {
      this.resetGame();
    });

    document.getElementById('victory-restart-btn')!.addEventListener('click', () => {
      this.resetGame();
    });
  }

  private resetGame(): void {
    this.score = 0;
    this.lives = INITIAL_LIVES;
    this.gameOver = false;
    this.victory = false;
    this.victoryStarted = false;
    this.powerUps = [];
    this.particles.clear();

    this.paddle = new Paddle(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.ball = this.createBall();
    this.generateBricks();

    this.gameOverScreen.classList.remove('show');
    this.victoryScreen.classList.remove('show');

    this.updateUI();
  }

  private resetBall(): void {
    this.ball = this.createBall();
  }

  private getActiveBricksCount(): number {
    return this.bricks.filter(b => b.active).length;
  }

  private updateUI(): void {
    this.scoreDisplay.textContent = this.score.toString();
    this.bricksCountDisplay.textContent = this.getActiveBricksCount().toString();

    this.livesDisplay.innerHTML = '';
    for (let i = 0; i < this.lives; i++) {
      const life = document.createElement('div');
      life.className = 'life-icon';
      this.livesDisplay.appendChild(life);
    }

    const currentTime = performance.now();
    this.speedDisplay.textContent = `${this.ball.speedMultiplier.toFixed(1)}x`;

    if (this.ball.isBoosted(currentTime)) {
      this.boostStatus.textContent = 'ON';
      this.boostStatus.classList.remove('inactive');
      this.boostTime.textContent = `${this.ball.getBoostRemaining(currentTime).toFixed(1)}s`;
      this.boostTime.classList.remove('inactive');
    } else {
      this.boostStatus.textContent = 'OFF';
      this.boostStatus.classList.add('inactive');
      this.boostTime.textContent = '0.0s';
      this.boostTime.classList.add('inactive');
    }
  }

  public update(currentTime: number): void {
    if (this.gameOver) return;

    const deltaTime = this.lastFrameTime ? currentTime - this.lastFrameTime : 16.67;
    this.lastFrameTime = currentTime;

    if (this.victory) {
      const stillActive = this.victoryEffect.update(currentTime);
      if (!stillActive && this.victoryStarted) {
        this.showVictoryScreen();
      }
      this.particles.update(deltaTime);
      this.updateUI();
      return;
    }

    this.paddle.update();
    this.physics.applyGravity(this.ball);
    this.ball.update(currentTime);

    this.physics.checkWallCollision(this.ball);

    if (this.physics.checkPaddleCollision(this.ball, this.paddle)) {
      this.particles.emitHitSpark(this.ball.x, this.ball.y, '#FFFFFF');
    }

    const brickCollision = this.physics.checkBrickCollision(this.ball);
    if (brickCollision.hit && brickCollision.brick) {
      const destroyed = brickCollision.brick.hit();
      if (destroyed) {
        this.score += brickCollision.brick.getScore();
        this.particles.emitBrickBreak(brickCollision.brick);
        this.screenShake.trigger(3, 100, currentTime);

        if (brickCollision.brick.isPowerUp) {
          const box = brickCollision.brick.getCollisionBox();
          this.powerUps.push(new PowerUp(
            box.x + box.width / 2,
            box.y + box.height / 2
          ));
        }

        this.physics.rebuildSpatialHash(this.bricks);
      } else {
        this.particles.emitHitSpark(this.ball.x, this.ball.y, brickCollision.brick.color);
      }
    }

    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];
      pu.update(CANVAS_HEIGHT);

      if (!pu.active) {
        this.powerUps.splice(i, 1);
        continue;
      }

      if (this.physics.checkPowerUpPaddleCollision(pu, this.paddle)) {
        this.ball.activateBoost(5000, currentTime);
        this.particles.emitHitSpark(pu.x, pu.y, '#00FF88');
        pu.active = false;
        this.powerUps.splice(i, 1);
      }
    }

    if (this.physics.checkBottomCollision(this.ball)) {
      this.lives--;
      if (this.lives <= 0) {
        this.gameOver = true;
        this.showGameOver();
      } else {
        this.resetBall();
      }
    }

    this.particles.update(deltaTime);

    if (this.getActiveBricksCount() === 0 && !this.victory) {
      this.victory = true;
      this.victoryStarted = true;
      this.victoryEffect.start(currentTime);
    }

    this.updateUI();
  }

  public render(currentTime: number): void {
    const shakeOffset = this.screenShake.getOffset(currentTime);

    this.ctx.save();
    this.ctx.translate(shakeOffset.x, shakeOffset.y);

    this.ctx.clearRect(-10, -10, CANVAS_WIDTH + 20, CANVAS_HEIGHT + 20);

    this.renderBackground();

    if (this.bricks.length > 0) {
      const topBrick = this.bricks.find(b => b.active);
      const bottomBrickY = BRICK_OFFSET_TOP + BRICK_ROWS * (BRICK_HEIGHT + BRICK_GAP);
      if (topBrick) {
        this.backgroundGrid.render(
          this.ctx,
          BRICK_OFFSET_TOP - 10,
          bottomBrickY + 10
        );
      }
    }

    for (const brick of this.bricks) {
      brick.render(this.ctx);
    }

    for (const pu of this.powerUps) {
      pu.render(this.ctx);
    }

    this.particles.render(this.ctx);
    this.paddle.render(this.ctx);

    if (!this.victory) {
      this.ball.render(this.ctx, currentTime);
    }

    if (this.victory) {
      this.victoryEffect.render(this.ctx, currentTime, this.ball.x, this.ball.y);
    }

    this.ctx.restore();
  }

  private renderBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#0A0A2E');
    gradient.addColorStop(1, '#000011');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  private showGameOver(): void {
    this.finalScoreDisplay.textContent = this.score.toString();
    this.gameOverScreen.classList.add('show');
  }

  private showVictoryScreen(): void {
    this.victoryScoreDisplay.textContent = this.score.toString();
    this.victoryScreen.classList.add('show');
  }

  public start(): void {
    const loop = (currentTime: number): void => {
      this.update(currentTime);
      this.render(currentTime);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
});
