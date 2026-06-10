import {
  Player,
  Enemy,
  Bullet,
  PowerUp,
  Star,
  createStars,
  updateStars,
  checkCollision,
  SpatialHash
} from './entities';
import { InputManager } from './input';
import { Renderer, GameState, RenderData } from './renderer';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 900;
const HIGH_SCORE_KEY = 'space_shooter_high_score';
const POWERUP_DROP_CHANCE = 0.25;
const SPEED_BOOST_DURATION = 3000;
const SPEED_BOOST_MULTIPLIER = 1.5;

export class GameEngine {
  private input: InputManager;
  private renderer: Renderer;
  private spatialHash: SpatialHash;

  private state: GameState;
  private score: number;
  private highScore: number;
  private level: number;

  private player: Player;
  private enemies: Enemy[];
  private bullets: Bullet[];
  private powerUps: PowerUp[];
  private stars: Star[];

  private enemySpawnTimer: number;
  private enemySpawnInterval: number;
  private baseEnemySpawnInterval: number;

  private effects: {
    flashAlpha: number;
    ringRadius: number;
    ringAlpha: number;
  };

  private titleSwingAngle: number;
  private titleSwingTime: number;
  private titleBlinkTimer: number;
  private titleBlinkVisible: boolean;
  private gameOverBlinkTimer: number;
  private gameOverBlinkVisible: boolean;

  private lastTime: number;
  private fps: number;
  private fpsCounter: number;
  private fpsTimer: number;

  constructor(canvas: HTMLCanvasElement) {
    this.input = new InputManager();
    this.renderer = new Renderer(canvas);
    this.spatialHash = new SpatialHash(64);

    this.state = 'title';
    this.score = 0;
    this.highScore = this.loadHighScore();
    this.level = 1;

    this.player = new Player(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 120);
    this.enemies = [];
    this.bullets = [];
    this.powerUps = [];
    this.stars = createStars(120, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.baseEnemySpawnInterval = 1500;
    this.enemySpawnInterval = this.baseEnemySpawnInterval;
    this.enemySpawnTimer = 0;

    this.effects = {
      flashAlpha: 0,
      ringRadius: 0,
      ringAlpha: 0
    };

    this.titleSwingAngle = 0;
    this.titleSwingTime = 0;
    this.titleBlinkTimer = 0;
    this.titleBlinkVisible = true;
    this.gameOverBlinkTimer = 0;
    this.gameOverBlinkVisible = true;

    this.lastTime = performance.now();
    this.fps = 60;
    this.fpsCounter = 0;
    this.fpsTimer = 0;
  }

  private loadHighScore(): number {
    try {
      const saved = localStorage.getItem(HIGH_SCORE_KEY);
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }

  private saveHighScore(): void {
    try {
      localStorage.setItem(HIGH_SCORE_KEY, this.highScore.toString());
    } catch {
    }
  }

  start(): void {
    this.gameLoop();
  }

  private gameLoop = (): void => {
    const currentTime = performance.now();
    let deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    deltaTime = Math.min(deltaTime, 0.05);

    this.updateFPS(deltaTime);
    this.update(deltaTime, currentTime);
    this.render();
    this.input.clearJustPressed();

    requestAnimationFrame(this.gameLoop);
  };

  private updateFPS(deltaTime: number): void {
    this.fpsCounter++;
    this.fpsTimer += deltaTime;
    if (this.fpsTimer >= 1) {
      this.fps = this.fpsCounter;
      this.fpsCounter = 0;
      this.fpsTimer = 0;
    }
  }

  private update(deltaTime: number, currentTime: number): void {
    updateStars(this.stars, deltaTime, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (this.effects.flashAlpha > 0) {
      this.effects.flashAlpha = Math.max(0, this.effects.flashAlpha - deltaTime * 10);
    }

    if (this.state === 'title') {
      this.updateTitleScreen(deltaTime);
      if (this.input.isAnyKeyPressed()) {
        this.startGame();
      }
    } else if (this.state === 'playing') {
      this.updatePlaying(deltaTime, currentTime);
    } else if (this.state === 'gameover') {
      this.updateGameOver(deltaTime);
      if (this.input.isRestartPressed()) {
        this.startGame();
      }
    }
  }

  private updateTitleScreen(deltaTime: number): void {
    this.titleSwingTime += deltaTime;
    this.titleSwingAngle = Math.sin(this.titleSwingTime * 2) * 0.08;

    this.titleBlinkTimer += deltaTime;
    if (this.titleBlinkTimer >= 0.6) {
      this.titleBlinkTimer = 0;
      this.titleBlinkVisible = !this.titleBlinkVisible;
    }
  }

  private updateGameOver(deltaTime: number): void {
    if (this.effects.ringAlpha > 0) {
      this.effects.ringRadius += deltaTime * 400;
      this.effects.ringAlpha = Math.max(0, this.effects.ringAlpha - deltaTime * 0.8);
    }

    this.gameOverBlinkTimer += deltaTime;
    if (this.gameOverBlinkTimer >= 0.6) {
      this.gameOverBlinkTimer = 0;
      this.gameOverBlinkVisible = !this.gameOverBlinkVisible;
    }
  }

  private startGame(): void {
    this.state = 'playing';
    this.score = 0;
    this.level = 1;
    this.player = new Player(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 120);
    this.enemies = [];
    this.bullets = [];
    this.powerUps = [];
    this.enemySpawnTimer = 0;
    this.enemySpawnInterval = this.baseEnemySpawnInterval;
    this.effects = { flashAlpha: 0, ringRadius: 0, ringAlpha: 0 };
  }

  private updatePlaying(deltaTime: number, currentTime: number): void {
    this.updatePlayer(deltaTime, currentTime);
    this.updateEnemies(deltaTime);
    this.updateBullets(deltaTime);
    this.updatePowerUps(deltaTime);
    this.updateEnemySpawn(deltaTime);
    this.updateLevel();
    this.checkCollisions(currentTime);
    this.cleanupInactive();
  }

  private updatePlayer(deltaTime: number, currentTime: number): void {
    const hAxis = this.input.getHorizontalAxis();
    const vAxis = this.input.getVerticalAxis();
    this.player.velocity.x = hAxis;
    this.player.velocity.y = vAxis;

    if (this.player.speedBoostEndTime > 0 && currentTime >= this.player.speedBoostEndTime) {
      this.player.speed = this.player.baseSpeed;
      this.player.speedBoostEndTime = 0;
    }

    this.player.update(deltaTime, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (this.input.isShooting() && currentTime - this.player.lastShotTime >= this.player.shootCooldown) {
      this.playerShoot();
      this.player.lastShotTime = currentTime;
    }
  }

  private playerShoot(): void {
    const bullet = new Bullet(
      this.player.position.x,
      this.player.position.y - this.player.height / 2 - 5,
      true
    );
    this.bullets.push(bullet);
  }

  private updateEnemies(deltaTime: number): void {
    for (const enemy of this.enemies) {
      enemy.update(deltaTime, CANVAS_HEIGHT);
    }
  }

  private updateBullets(deltaTime: number): void {
    for (const bullet of this.bullets) {
      bullet.update(deltaTime, CANVAS_HEIGHT);
    }
  }

  private updatePowerUps(deltaTime: number): void {
    for (const powerUp of this.powerUps) {
      powerUp.update(deltaTime, CANVAS_HEIGHT);
    }
  }

  private updateEnemySpawn(deltaTime: number): void {
    this.enemySpawnTimer += deltaTime * 1000;
    if (this.enemySpawnTimer >= this.enemySpawnInterval) {
      this.enemySpawnTimer = 0;
      this.spawnEnemy();
    }
  }

  private spawnEnemy(): void {
    const largeChance = Math.min(0.1 + (this.level - 1) * 0.05, 0.4);
    const isLarge = Math.random() < largeChance;
    const type = isLarge ? 'large' : 'small';
    const enemy = new Enemy(
      type,
      Math.random() * (CANVAS_WIDTH - 100) + 50,
      -50
    );
    this.enemies.push(enemy);
  }

  private updateLevel(): void {
    const newLevel = Math.floor(this.score / 100) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      this.enemySpawnInterval = Math.max(400, this.baseEnemySpawnInterval - (this.level - 1) * 120);
    }
  }

  private checkCollisions(currentTime: number): void {
    this.spatialHash.clear();

    for (const enemy of this.enemies) {
      if (enemy.active) this.spatialHash.insert(enemy);
    }
    for (const bullet of this.bullets) {
      if (bullet.active) this.spatialHash.insert(bullet);
    }
    for (const powerUp of this.powerUps) {
      if (powerUp.active) this.spatialHash.insert(powerUp);
    }

    for (const bullet of this.bullets) {
      if (!bullet.active || !bullet.isPlayerBullet) continue;
      const nearby = this.spatialHash.query(bullet);
      for (const obj of nearby) {
        if (obj instanceof Enemy && obj.active) {
          if (checkCollision(bullet, obj)) {
            bullet.active = false;
            const destroyed = obj.takeDamage(bullet.damage);
            if (destroyed) {
              this.onEnemyDestroyed(obj);
            }
            break;
          }
        }
      }
    }

    if (this.player.active) {
      const nearbyPlayer = this.spatialHash.query(this.player);

      for (const obj of nearbyPlayer) {
        if (obj instanceof Enemy && obj.active) {
          if (checkCollision(this.player, obj)) {
            obj.active = false;
            this.onPlayerHit(currentTime);
            break;
          }
        }

        if (obj instanceof Bullet && obj.active && !obj.isPlayerBullet) {
          if (checkCollision(this.player, obj)) {
            obj.active = false;
            this.onPlayerHit(currentTime);
            break;
          }
        }

        if (obj instanceof PowerUp && obj.active) {
          if (checkCollision(this.player, obj)) {
            obj.active = false;
            this.onPowerUpCollected(currentTime);
          }
        }
      }
    }
  }

  private onEnemyDestroyed(enemy: Enemy): void {
    this.score += 10;

    if (enemy.type === 'large') {
      const offsetX = 20;
      const small1 = new Enemy('small', enemy.position.x - offsetX, enemy.position.y);
      const small2 = new Enemy('small', enemy.position.x + offsetX, enemy.position.y);
      small1.velocity.x = -40;
      small2.velocity.x = 40;
      this.enemies.push(small1, small2);
    }

    if (Math.random() < POWERUP_DROP_CHANCE) {
      const powerUp = new PowerUp(enemy.position.x, enemy.position.y);
      this.powerUps.push(powerUp);
    }
  }

  private onPlayerHit(_currentTime: number): void {
    if (this.player.hasShield) {
      this.player.hasShield = false;
      return;
    }

    this.player.lives--;
    if (this.player.lives <= 0) {
      this.gameOver();
    } else {
      this.player.position.x = CANVAS_WIDTH / 2;
      this.player.position.y = CANVAS_HEIGHT - 120;
    }
  }

  private onPowerUpCollected(currentTime: number): void {
    this.score += 5;
    this.player.hasShield = true;
    this.player.speed = this.player.baseSpeed * SPEED_BOOST_MULTIPLIER;
    this.player.speedBoostEndTime = currentTime + SPEED_BOOST_DURATION;
    this.effects.flashAlpha = 0.5;
  }

  private gameOver(): void {
    this.state = 'gameover';
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();
    }
    this.effects.ringRadius = 20;
    this.effects.ringAlpha = 1;
    this.gameOverBlinkTimer = 0;
    this.gameOverBlinkVisible = true;
  }

  private cleanupInactive(): void {
    this.enemies = this.enemies.filter(e => e.active);
    this.bullets = this.bullets.filter(b => b.active);
    this.powerUps = this.powerUps.filter(p => p.active);
  }

  private render(): void {
    const renderData: RenderData = {
      state: this.state,
      score: this.score,
      highScore: this.highScore,
      level: this.level,
      player: this.player,
      enemies: this.enemies,
      bullets: this.bullets,
      powerUps: this.powerUps,
      stars: this.stars,
      effects: { ...this.effects },
      titleSwingAngle: this.titleSwingAngle,
      titleBlinkVisible: this.titleBlinkVisible,
      gameOverBlinkVisible: this.gameOverBlinkVisible
    };
    this.renderer.render(renderData);
  }

  getFPS(): number {
    return this.fps;
  }
}
