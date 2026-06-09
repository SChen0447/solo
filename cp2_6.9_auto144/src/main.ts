import { Player } from './player';
import { Collectible, Particle } from './collectible';
import { Obstacle } from './obstacle';
import { Renderer } from './renderer';

const CANVAS_ASPECT_RATIO = 16 / 9;
const HIGH_SCORE_KEY = 'cloud_sky_high_score';
const MAX_COLLECTIBLES = 5;
const MAX_ENTITIES = 30;
const SURVIVAL_BONUS_INTERVAL = 5;
const SURVIVAL_BONUS_SCORE = 5;
const COLLECT_SCORE = 10;
const RESTART_DELAY = 3;
const SHIELD_DRAIN_ON_HIT = 20;

class Game {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private player: Player;
  private collectibles: Collectible[] = [];
  private obstacles: Obstacle[] = [];
  private particles: Particle[] = [];
  private keys: Set<string> = new Set();
  private score: number = 0;
  private highScore: number = 0;
  private lastTime: number = 0;
  private gameOver: boolean = false;
  private collectibleTimer: number = 0;
  private nextCollectibleTime: number = 0;
  private obstacleTimer: number = 0;
  private nextObstacleTime: number = 0;
  private survivalTimer: number = 0;
  private restartTimer: number = 0;
  private waitingForRestart: boolean = false;
  private animationFrameId: number = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.renderer = new Renderer(this.canvas);
    this.player = new Player(this.canvas.width, this.canvas.height);

    this.highScore = this.loadHighScore();
    this.setupNextSpawnTimes();

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  private resizeCanvas(): void {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let canvasWidth = windowWidth;
    let canvasHeight = windowWidth / CANVAS_ASPECT_RATIO;

    if (canvasHeight > windowHeight) {
      canvasHeight = windowHeight;
      canvasWidth = windowHeight * CANVAS_ASPECT_RATIO;
    }

    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;
    this.canvas.style.width = `${canvasWidth}px`;
    this.canvas.style.height = `${canvasHeight}px`;

    if (this.renderer) {
      this.renderer.resize();
    }
    if (this.player) {
      this.player.x = Math.min(Math.max(this.player.x, this.player.radius), this.canvas.width - this.player.radius);
      this.player.y = Math.min(Math.max(this.player.y, this.player.radius), this.canvas.height - this.player.radius);
    }
  }

  private loadHighScore(): number {
    try {
      const stored = localStorage.getItem(HIGH_SCORE_KEY);
      return stored ? parseInt(stored, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }

  private saveHighScore(): void {
    try {
      localStorage.setItem(HIGH_SCORE_KEY, this.highScore.toString());
    } catch {
      // ignore
    }
  }

  private setupNextSpawnTimes(): void {
    this.nextCollectibleTime = 2 + Math.random() * 1;
    this.nextObstacleTime = 1.5 + Math.random() * 1.5;
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.key.toLowerCase());

    if (e.key === ' ' && this.gameOver && !this.waitingForRestart) {
      this.initRestart();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.key.toLowerCase());
  }

  private initRestart(): void {
    this.waitingForRestart = true;
    this.restartTimer = RESTART_DELAY;
  }

  private resetGame(): void {
    this.player.reset(this.canvas.width, this.canvas.height);
    this.collectibles = [];
    this.obstacles = [];
    this.particles = [];
    this.score = 0;
    this.gameOver = false;
    this.waitingForRestart = false;
    this.collectibleTimer = 0;
    this.obstacleTimer = 0;
    this.survivalTimer = 0;
    this.setupNextSpawnTimes();
  }

  private getInputDirection(): { dx: number; dy: number } {
    let dx = 0;
    let dy = 0;

    if (this.keys.has('arrowleft') || this.keys.has('a')) dx -= 1;
    if (this.keys.has('arrowright') || this.keys.has('d')) dx += 1;
    if (this.keys.has('arrowup') || this.keys.has('w')) dy -= 1;
    if (this.keys.has('arrowdown') || this.keys.has('s')) dy += 1;

    if (dx !== 0 && dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;
    }

    return { dx, dy };
  }

  private spawnCollectible(): void {
    if (this.collectibles.length < MAX_COLLECTIBLES) {
      const totalEntities = this.collectibles.length + this.obstacles.length;
      if (totalEntities < MAX_ENTITIES) {
        this.collectibles.push(Collectible.spawn(this.canvas.width, this.canvas.height));
      }
    }
    this.nextCollectibleTime = 2 + Math.random() * 1;
    this.collectibleTimer = 0;
  }

  private spawnObstacle(): void {
    const totalEntities = this.collectibles.length + this.obstacles.length;
    if (totalEntities < MAX_ENTITIES) {
      this.obstacles.push(Obstacle.spawn(this.canvas.width, this.canvas.height));
    }
    this.nextObstacleTime = 1.5 + Math.random() * 1.5;
    this.obstacleTimer = 0;
  }

  private checkCollectibleCollisions(): void {
    for (const collectible of this.collectibles) {
      if (collectible.collected) continue;

      const dx = collectible.x - this.player.x;
      const dy = collectible.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < collectible.radius + this.player.radius) {
        collectible.collected = true;
        this.player.recharge(collectible.config.recharge);
        this.score += COLLECT_SCORE;
        this.particles.push(...collectible.createParticles());
      }
    }
    this.collectibles = this.collectibles.filter((c) => !c.collected);
  }

  private checkObstacleCollisions(): void {
    for (const obstacle of this.obstacles) {
      if (obstacle.hitTest(this.player)) {
        obstacle.hitPlayer = true;
        this.player.drain(SHIELD_DRAIN_ON_HIT);
        this.renderer.triggerShake();

        if (this.player.isDead()) {
          this.endGame();
        }
      }
    }
  }

  private endGame(): void {
    this.gameOver = true;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();
    }
  }

  private update(deltaTime: number): void {
    if (this.gameOver) {
      if (this.waitingForRestart) {
        this.restartTimer -= deltaTime;
        if (this.restartTimer <= 0) {
          this.resetGame();
        }
      }
      this.renderer.update(deltaTime);
      return;
    }

    const { dx, dy } = this.getInputDirection();
    this.player.move(dx, dy, deltaTime, this.canvas.width, this.canvas.height);

    this.collectibleTimer += deltaTime;
    if (this.collectibleTimer >= this.nextCollectibleTime) {
      this.spawnCollectible();
    }

    this.obstacleTimer += deltaTime;
    if (this.obstacleTimer >= this.nextObstacleTime) {
      this.spawnObstacle();
    }

    this.survivalTimer += deltaTime;
    if (this.survivalTimer >= SURVIVAL_BONUS_INTERVAL) {
      this.survivalTimer -= SURVIVAL_BONUS_INTERVAL;
      this.score += SURVIVAL_BONUS_SCORE;
    }

    for (const collectible of this.collectibles) {
      collectible.update(deltaTime);
    }

    for (const obstacle of this.obstacles) {
      obstacle.update(deltaTime);
    }
    this.obstacles = this.obstacles.filter(
      (o) => !o.shouldRemove(this.canvas.width, this.canvas.height)
    );

    for (const particle of this.particles) {
      particle.update(deltaTime);
    }
    this.particles = this.particles.filter((p) => !p.isDead());

    this.checkCollectibleCollisions();
    this.checkObstacleCollisions();

    this.renderer.update(deltaTime);
  }

  private render(): void {
    this.renderer.render(
      this.player,
      this.collectibles,
      this.obstacles,
      this.particles,
      this.score,
      this.gameOver,
      this.highScore
    );
  }

  private gameLoop = (timestamp: number): void => {
    if (this.lastTime === 0) {
      this.lastTime = timestamp;
    }
    const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    this.update(deltaTime);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  public start(): void {
    this.lastTime = 0;
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  }

  public stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
});
