import { Player } from './player';
import { Track } from './track';
import { Renderer } from './renderer';

export type GameState = 'playing' | 'gameover' | 'fading';

export class Game {
  private canvas: HTMLCanvasElement;
  private player: Player;
  private track: Track;
  private renderer: Renderer;

  private score: number = 0;
  private finalScore: number = 0;
  private survivalTime: number = 0;
  private frameCount: number = 0;

  private state: GameState = 'fading';
  private fadeInTimer: number = 0;
  private fadeInDuration: number = 30;
  private restartFlashTimer: number = 0;

  private leftPressed: boolean = false;
  private rightPressed: boolean = false;
  private upPressed: boolean = false;
  private downPressed: boolean = false;

  private animationId: number | null = null;

  private scoreDisplay: HTMLElement | null;
  private speedDisplay: HTMLElement | null;

  private readonly CANVAS_WIDTH: number = 1280;
  private readonly CANVAS_HEIGHT: number = 720;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = this.CANVAS_WIDTH;
    this.canvas.height = this.CANVAS_HEIGHT;

    this.player = new Player(this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
    this.track = new Track(this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
    this.renderer = new Renderer(canvas);

    this.scoreDisplay = document.getElementById('score-display');
    this.speedDisplay = document.getElementById('speed-display');

    this.setupEventListeners();
    this.setupResizeHandler();
    this.updateUIPosition();
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (this.state === 'playing') {
        if (e.key === 'ArrowLeft' && !this.leftPressed) {
          this.leftPressed = true;
          this.player.moveLeft();
        }
        if (e.key === 'ArrowRight' && !this.rightPressed) {
          this.rightPressed = true;
          this.player.moveRight();
        }
        if (e.key === 'ArrowUp' && !this.upPressed) {
          this.upPressed = true;
          this.player.accelerate();
        }
        if (e.key === 'ArrowDown' && !this.downPressed) {
          this.downPressed = true;
          this.player.decelerate();
        }
      }

      if (e.key === ' ' && this.state === 'gameover') {
        this.restart();
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') this.leftPressed = false;
      if (e.key === 'ArrowRight') this.rightPressed = false;
      if (e.key === 'ArrowUp') this.upPressed = false;
      if (e.key === 'ArrowDown') this.downPressed = false;
    });
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      this.updateUIPosition();
    });
  }

  private updateUIPosition(): void {
    const container = document.getElementById('game-container');
    if (!container) return;

    const windowRatio = window.innerWidth / window.innerHeight;
    const gameRatio = this.CANVAS_WIDTH / this.CANVAS_HEIGHT;

    let displayWidth: number;
    let displayHeight: number;

    if (windowRatio > gameRatio) {
      displayHeight = window.innerHeight;
      displayWidth = displayHeight * gameRatio;
    } else {
      displayWidth = window.innerWidth;
      displayHeight = displayWidth / gameRatio;
    }

    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;
  }

  public start(): void {
    this.state = 'fading';
    this.fadeInTimer = 0;
    this.loop();
  }

  private loop = (): void => {
    this.update();
    this.render();
    this.animationId = requestAnimationFrame(this.loop);
  };

  private update(): void {
    if (this.state === 'fading') {
      this.fadeInTimer++;
      if (this.fadeInTimer >= this.fadeInDuration) {
        this.state = 'playing';
      }
      return;
    }

    if (this.state === 'gameover') {
      this.restartFlashTimer++;
      return;
    }

    this.frameCount++;
    this.survivalTime = this.frameCount / 60;

    this.player.update();
    this.track.update(this.player.speed);

    this.checkCoinCollisions();
    this.checkObstacleCollisions();

    this.updateUI();
  }

  private checkCoinCollisions(): void {
    const playerCollider = this.player.getCollider();
    const coins = this.track.getActiveCoins();

    for (const coin of coins) {
      if (!coin.active || coin.collected) continue;

      const coinCollider = {
        x: coin.x - coin.diameter / 2,
        y: coin.y - coin.diameter / 2,
        width: coin.diameter,
        height: coin.diameter
      };

      if (this.rectIntersect(playerCollider, coinCollider)) {
        this.track.collectCoin(coin);
        this.score += 10;
        this.animateScore();
      }
    }
  }

  private checkObstacleCollisions(): void {
    const playerCollider = this.player.getCollider();
    const obstacles = this.track.getActiveObstacles();

    for (const obs of obstacles) {
      if (!obs.active) continue;

      const obsCollider = {
        x: obs.x - obs.colliderSize / 2,
        y: obs.y - obs.colliderSize / 2,
        width: obs.colliderSize,
        height: obs.colliderSize
      };

      if (this.rectIntersect(playerCollider, obsCollider)) {
        this.gameOver();
        return;
      }
    }
  }

  private rectIntersect(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  private gameOver(): void {
    this.state = 'gameover';
    const timeBonus = Math.floor(this.survivalTime * 2);
    this.finalScore = this.score + timeBonus;
    this.restartFlashTimer = 0;
  }

  private restart(): void {
    this.score = 0;
    this.finalScore = 0;
    this.frameCount = 0;
    this.survivalTime = 0;
    this.player.reset();
    this.track.reset();
    this.state = 'fading';
    this.fadeInTimer = 0;
    this.updateUI();
  }

  private animateScore(): void {
    if (!this.scoreDisplay) return;
    this.scoreDisplay.classList.remove('pop');
    void this.scoreDisplay.offsetWidth;
    this.scoreDisplay.classList.add('pop');
  }

  private updateUI(): void {
    if (this.scoreDisplay) {
      this.scoreDisplay.textContent = `分数: ${this.score}`;
    }
    if (this.speedDisplay) {
      this.speedDisplay.textContent = `速度: ${this.player.speed.toFixed(1)}`;
    }
  }

  private render(): void {
    const fadeInAlpha = this.state === 'fading'
      ? this.fadeInTimer / this.fadeInDuration
      : 1;

    const restartAlpha = this.state === 'gameover'
      ? 0.5 + 0.5 * Math.sin(this.restartFlashTimer * Math.PI / 30)
      : 1;

    this.renderer.render(
      this.player,
      this.track,
      this.state === 'gameover',
      this.score,
      this.finalScore,
      restartAlpha,
      fadeInAlpha
    );
  }

  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}
