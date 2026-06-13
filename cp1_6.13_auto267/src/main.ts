import { Star, Meteor, Paddle, Particle, GameState } from './entity';
import { Renderer } from './renderer';
import { soundManager } from './sound';

const MAX_METEORS = 20;
const STAR_COUNT = 60;
const METEOR_SPAWN_INTERVAL = 1500;

class Game {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private state: GameState;

  private stars: Star[] = [];
  private meteors: Meteor[] = [];
  private particles: Particle[] = [];
  private paddle: Paddle;

  private lastTime: number = 0;
  private meteorSpawnTimer: number = 0;
  private animationId: number = 0;

  private mouseX: number = 0;

  private gameOverlay: HTMLElement;
  private finalScore: HTMLElement;
  private restartBtn: HTMLElement;
  private startScreen: HTMLElement;
  private startBtn: HTMLElement;

  constructor() {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas not found');
    this.canvas = canvas;

    this.renderer = new Renderer(canvas);
    this.state = new GameState();

    this.resizeCanvas();
    this.paddle = new Paddle(this.canvas.width, this.canvas.height);

    const overlay = document.getElementById('gameOverlay');
    const scoreEl = document.getElementById('finalScore');
    const btn = document.getElementById('restartBtn');
    const startScreen = document.getElementById('startScreen');
    const startBtn = document.getElementById('startBtn');

    if (!overlay || !scoreEl || !btn || !startScreen || !startBtn) {
      throw new Error('UI elements not found');
    }

    this.gameOverlay = overlay;
    this.finalScore = scoreEl;
    this.restartBtn = btn;
    this.startScreen = startScreen;
    this.startBtn = startBtn;

    this.initStars();
    this.bindEvents();
  }

  private initStars(): void {
    this.stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      this.stars.push(new Star(this.canvas.width, this.canvas.height));
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resizeCanvas());

    this.canvas.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.paddle.moveTo(this.mouseX);
    });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        this.mouseX = e.touches[0].clientX;
        this.paddle.moveTo(this.mouseX);
      }
    }, { passive: false });

    this.restartBtn.addEventListener('click', () => {
      this.restartGame();
    });

    this.startBtn.addEventListener('click', () => {
      soundManager.init();
      soundManager.resume();
      this.startGame();
    });
  }

  private resizeCanvas(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.resize(width, height);
    this.paddle.y = height - 40 - this.paddle.height;
    this.initStars();
  }

  private spawnMeteor(isGolden = false): void {
    if (this.meteors.filter(m => m.alive).length >= MAX_METEORS) return;
    const meteor = new Meteor(this.canvas.width, this.state.baseSpeed, isGolden);
    this.meteors.push(meteor);
  }

  private spawnParticles(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  private checkCollisions(): void {
    const paddle = this.paddle;

    for (const meteor of this.meteors) {
      if (!meteor.alive) continue;

      if (
        meteor.right > paddle.left &&
        meteor.left < paddle.right &&
        meteor.bottom > paddle.top &&
        meteor.top < paddle.bottom
      ) {
        if (meteor.vy > 0) {
          this.handlePaddleCollision(meteor, paddle);
        }
      }

      if (meteor.top > this.canvas.height + 50) {
        if (meteor.isGolden) {
          meteor.alive = false;
        } else {
          this.gameOver();
          return;
        }
      }

      if (meteor.left < 0 || meteor.right > this.canvas.width) {
        meteor.vx *= -1;
        meteor.x = Math.max(0, Math.min(this.canvas.width - meteor.width, meteor.x));
      }
    }
  }

  private handlePaddleCollision(meteor: Meteor, paddle: Paddle): void {
    const hitPoint = meteor.centerX;
    const paddleLeft = paddle.left;
    const paddleWidth = paddle.width;
    const relativeHit = (hitPoint - paddleLeft) / paddleWidth;

    let angle: number;
    if (relativeHit < 1 / 3) {
      angle = -30 * Math.PI / 180;
    } else if (relativeHit > 2 / 3) {
      angle = 30 * Math.PI / 180;
    } else {
      angle = 0;
    }

    const speed = Math.sqrt(meteor.vx * meteor.vx + meteor.vy * meteor.vy);
    const newSpeed = Math.max(speed, this.state.baseSpeed * 1.2);

    meteor.vx = Math.sin(angle) * newSpeed;
    meteor.vy = -Math.abs(Math.cos(angle) * newSpeed);

    meteor.y = paddle.top - meteor.height;

    const particleCount = 16 + Math.floor(Math.random() * 9);
    this.spawnParticles(meteor.centerX, meteor.bottom, meteor.borderColor, particleCount);

    this.state.addScore(meteor.score);
    this.state.incrementCombo();

    const shouldSpawnGolden = this.state.destroyMeteor(meteor.isGolden);

    if (meteor.isGolden) {
      soundManager.playGoldenSound();
    } else {
      soundManager.playHitSound();
    }

    if (shouldSpawnGolden) {
      setTimeout(() => {
        if (!this.state.gameOver && !this.state.paused) {
          this.spawnMeteor(true);
        }
      }, 500);
    }

    meteor.alive = false;
  }

  private update(deltaTime: number): void {
    if (this.state.paused || this.state.gameOver) return;

    for (const star of this.stars) {
      star.update(deltaTime);
    }

    this.meteorSpawnTimer += deltaTime;
    const currentSpawnInterval = Math.max(400, METEOR_SPAWN_INTERVAL - this.state.meteorsDestroyed * 10);
    if (this.meteorSpawnTimer >= currentSpawnInterval) {
      this.meteorSpawnTimer = 0;
      this.spawnMeteor();
    }

    this.state.updateSpeed(deltaTime);

    this.state.updateCombo(deltaTime);

    this.state.updateBackground(deltaTime);

    this.state.updateFlash(deltaTime);

    this.paddle.update(deltaTime, this.canvas.width);

    for (const meteor of this.meteors) {
      if (meteor.alive) {
        meteor.update(deltaTime);
      }
    }

    for (const particle of this.particles) {
      if (particle.alive) {
        particle.update(deltaTime);
      }
    }

    this.checkCollisions();

    this.cleanup();
  }

  private cleanup(): void {
    this.meteors = this.meteors.filter(m => m.alive);
    this.particles = this.particles.filter(p => p.alive);
  }

  private render(): void {
    this.renderer.render(
      this.stars,
      this.meteors,
      this.paddle,
      this.particles,
      this.state
    );
  }

  private gameLoop = (timestamp: number): void => {
    const deltaTime = Math.min(timestamp - this.lastTime, 50);
    this.lastTime = timestamp;

    this.update(deltaTime);
    this.render();

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private gameOver(): void {
    this.state.gameOver = true;
    soundManager.playGameOverSound();
    this.finalScore.textContent = this.state.score.toString();
    this.gameOverlay.style.display = 'flex';
  }

  private startGame(): void {
    this.startScreen.style.display = 'none';
    this.state.reset();
    this.meteors = [];
    this.particles = [];
    this.meteorSpawnTimer = 0;
    this.paddle = new Paddle(this.canvas.width, this.canvas.height);
    this.lastTime = performance.now();
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.animationId = requestAnimationFrame(this.gameLoop);
  }

  private restartGame(): void {
    this.gameOverlay.style.display = 'none';
    soundManager.resume();
    this.startGame();
  }

  start(): void {
    this.lastTime = performance.now();
    this.animationId = requestAnimationFrame(this.gameLoop);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
});
