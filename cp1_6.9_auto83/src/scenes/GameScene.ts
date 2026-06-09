import Phaser from 'phaser';
import Player from '../entities/Player';
import Obstacle, { ObstacleType } from '../entities/Obstacle';
import Collectible, { CollectibleType } from '../entities/Collectible';

const BASE_WIDTH = 1600;
const BASE_HEIGHT = 900;
const MAX_OBSTACLES = 10;

export default class GameScene extends Phaser.Scene {
  private player!: Player;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private collectibles!: Phaser.Physics.Arcade.Group;
  private score: number = 0;
  private currentLevel: number = 1;
  private speedMultiplier: number = 1;
  private obstacleSpawnInterval: number = 4000;
  private obstacleSpawnTimer: number = 0;
  private collectibleSpawnTimer: number = 0;
  private collectibleSpawnInterval: number = 3000;
  private isGameOver: boolean = false;

  private hudGraphics!: Phaser.GameObjects.Graphics;
  private hearts: Phaser.GameObjects.Graphics[] = [];
  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private levelProgressBar!: Phaser.GameObjects.Graphics;
  private blueFlashOverlay!: Phaser.GameObjects.Graphics;
  private redVignette!: Phaser.GameObjects.Graphics;
  private backgroundGradient!: Phaser.GameObjects.Graphics;
  private gameOverText!: Phaser.GameObjects.Text;
  private gameOverSubText!: Phaser.GameObjects.Text;

  private startColor: { r: number; g: number; b: number } = { r: 0x0a, g: 0x0a, b: 0x3a };
  private endColor: { r: number; g: number; b: number } = { r: 0x4a, g: 0x2a, b: 0x6a };

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
  }

  create(): void {
    this.score = 0;
    this.currentLevel = 1;
    this.speedMultiplier = 1;
    this.obstacleSpawnInterval = 4000;
    this.obstacleSpawnTimer = 0;
    this.collectibleSpawnTimer = 0;
    this.collectibleSpawnInterval = 3000;
    this.isGameOver = false;

    this.createBackground();
    this.createPlayer();
    this.createObstacles();
    this.createCollectibles();
    this.setupCollisions();
    this.createHUD();
    this.createEffects();
  }

  private createBackground(): void {
    this.backgroundGradient = this.add.graphics();
    this.updateBackgroundGradient();
  }

  private updateBackgroundGradient(): void {
    this.backgroundGradient.clear();

    const levelProgress = Math.min((this.currentLevel - 1) / 9, 1);
    const r = Math.floor(this.startColor.r + (this.endColor.r - this.startColor.r) * levelProgress);
    const g = Math.floor(this.startColor.g + (this.endColor.g - this.startColor.g) * levelProgress);
    const b = Math.floor(this.startColor.b + (this.endColor.b - this.startColor.b) * levelProgress);
    const topColor = Phaser.Display.Color.GetColor(r, g, b);
    const bottomColor = Phaser.Display.Color.GetColor(
      Math.floor(r * 0.7),
      Math.floor(g * 0.7),
      Math.floor(b * 1.2)
    );

    for (let y = 0; y < BASE_HEIGHT; y += 2) {
      const t = y / BASE_HEIGHT;
      const interpR = Math.floor(r + (Math.floor(r * 0.7) - r) * t);
      const interpG = Math.floor(g + (Math.floor(g * 0.7) - g) * t);
      const interpB = Math.floor(b + (Math.floor(b * 1.2) - b) * t);
      this.backgroundGradient.fillStyle(Phaser.Display.Color.GetColor(interpR, interpG, interpB), 1);
      this.backgroundGradient.fillRect(0, y, BASE_WIDTH, 2);
    }

    this.cameras.main.setBackgroundColor(topColor);
  }

  private createPlayer(): void {
    this.player = new Player(this, BASE_WIDTH / 2, BASE_HEIGHT / 2);
  }

  private createObstacles(): void {
    this.obstacles = this.physics.add.group({
      classType: Obstacle,
      maxSize: MAX_OBSTACLES,
      runChildUpdate: false
    });
  }

  private createCollectibles(): void {
    this.collectibles = this.physics.add.group({
      classType: Collectible,
      maxSize: 30,
      runChildUpdate: false
    });
  }

  private setupCollisions(): void {
    this.physics.add.overlap(
      this.player,
      this.obstacles,
      this.handlePlayerObstacleCollision,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.collectibles,
      this.handlePlayerCollectibleCollision,
      undefined,
      this
    );
  }

  private handlePlayerObstacleCollision(
    playerObj: any,
    obstacleObj: any
  ): void {
    const player = playerObj as Player;
    const obstacle = obstacleObj as Obstacle;

    if (player.takeDamage()) {
      this.updateHUD();
      this.showRedVignette();

      if (player.getLives() <= 0) {
        this.triggerGameOver();
      }
    }
  }

  private handlePlayerCollectibleCollision(
    playerObj: any,
    collectibleObj: any
  ): void {
    const collectible = collectibleObj as Collectible;
    const result = collectible.collect();

    if (result.collected) {
      this.score += result.score;
      this.updateHUD();
      this.checkLevelUp();

      if (result.type === 'rune') {
        this.showBlueFlash();
      }
    }
  }

  private checkLevelUp(): void {
    const newLevel = Math.floor(this.score / 10) + 1;
    if (newLevel > this.currentLevel) {
      this.currentLevel = newLevel;
      this.speedMultiplier = 1 + (this.currentLevel - 1) * 0.1;
      this.obstacleSpawnInterval = Math.max(1000, 4000 - (this.currentLevel - 1) * 500);

      this.player.setSpeedMultiplier(this.speedMultiplier);

      this.obstacles.getChildren().forEach((child) => {
        const obstacle = child as Obstacle;
        obstacle.setSpeedMultiplier(this.speedMultiplier);
      });

      this.updateBackgroundGradient();
    }
  }

  private spawnObstacle(): void {
    if (this.obstacles.countActive(true) >= MAX_OBSTACLES) return;

    const types: ObstacleType[] = ['shark', 'eel'];
    const type = types[Math.floor(Math.random() * types.length)];

    const edge = Math.floor(Math.random() * 4);
    let x: number, y: number;

    const padding = 100;
    switch (edge) {
      case 0:
        x = -padding;
        y = Math.random() * BASE_HEIGHT;
        break;
      case 1:
        x = BASE_WIDTH + padding;
        y = Math.random() * BASE_HEIGHT;
        break;
      case 2:
        x = Math.random() * BASE_WIDTH;
        y = -padding;
        break;
      default:
        x = Math.random() * BASE_WIDTH;
        y = BASE_HEIGHT + padding;
        break;
    }

    const obstacle = new Obstacle(this, x, y, type, this.player.x, this.player.y);
    obstacle.setSpeedMultiplier(this.speedMultiplier);
    this.obstacles.add(obstacle);
  }

  private spawnCollectible(): void {
    const types: CollectibleType[] = ['pearl', 'pearl', 'rune'];
    const type = types[Math.floor(Math.random() * types.length)];

    const padding = 100;
    const x = padding + Math.random() * (BASE_WIDTH - padding * 2);
    const y = padding + Math.random() * (BASE_HEIGHT - padding * 2 - 80);

    const collectible = new Collectible(this, x, y, type);
    this.collectibles.add(collectible);
  }

  private createHUD(): void {
    this.hudGraphics = this.add.graphics();
    this.hudGraphics.fillStyle(0x000000, 0.5);
    this.hudGraphics.fillRect(0, BASE_HEIGHT - 60, BASE_WIDTH, 60);
    this.hudGraphics.setDepth(100);

    for (let i = 0; i < 3; i++) {
      const heart = this.add.graphics();
      this.drawHeart(heart, 30 + i * 35, BASE_HEIGHT - 45, true);
      heart.setDepth(101);
      this.hearts.push(heart);
    }

    this.scoreText = this.add.text(BASE_WIDTH / 2, BASE_HEIGHT - 30, '得分: 0', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    });
    this.scoreText.setOrigin(0.5);
    this.scoreText.setDepth(101);

    this.levelProgressBar = this.add.graphics();
    this.levelProgressBar.setDepth(101);

    this.levelText = this.add.text(BASE_WIDTH - 200, BASE_HEIGHT - 30, 'Lv.1', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 1
    });
    this.levelText.setDepth(101);

    this.updateHUD();
  }

  private drawHeart(graphics: Phaser.GameObjects.Graphics, x: number, y: number, alive: boolean): void {
    graphics.clear();
    const color = alive ? 0xff4444 : 0x444444;
    graphics.fillStyle(color, 1);

    const points: Phaser.Math.Vector2[] = [];
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const px = x + 16 * Math.pow(Math.sin(t), 3);
      const py = y - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      points.push(new Phaser.Math.Vector2(px, py));
    }

    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(points[i].x, points[i].y);
    }
    graphics.closePath();
    graphics.fillPath();
  }

  private updateHUD(): void {
    const lives = this.player.getLives();
    for (let i = 0; i < 3; i++) {
      this.drawHeart(this.hearts[i], 30 + i * 35, BASE_HEIGHT - 45, i < lives);
    }

    this.scoreText.setText(`得分: ${this.score}`);

    this.levelProgressBar.clear();
    this.levelProgressBar.fillStyle(0x333333, 1);
    this.levelProgressBar.fillRect(BASE_WIDTH - 180, BASE_HEIGHT - 50, 150, 10);

    const progress = Math.min((this.score % 50) / 50, 1);
    this.levelProgressBar.fillStyle(0x00aaff, 1);
    this.levelProgressBar.fillRect(BASE_WIDTH - 180, BASE_HEIGHT - 50, 150 * progress, 10);

    this.levelText.setText(`Lv.${this.currentLevel}`);
  }

  private createEffects(): void {
    this.blueFlashOverlay = this.add.graphics();
    this.blueFlashOverlay.fillStyle(0x00aaff, 0);
    this.blueFlashOverlay.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    this.blueFlashOverlay.setDepth(200);
    this.blueFlashOverlay.setAlpha(0);

    this.redVignette = this.add.graphics();
    this.redVignette.setDepth(200);
    this.redVignette.setAlpha(0);
  }

  private showBlueFlash(): void {
    this.tweens.add({
      targets: this.blueFlashOverlay,
      alpha: { from: 0.3, to: 0 },
      duration: 300,
      ease: 'Linear'
    });
  }

  private showRedVignette(): void {
    this.redVignette.clear();
    this.redVignette.fillStyle(0xff0000, 0.5);
    for (let i = 0; i < 40; i++) {
      const alpha = (i / 40) * 0.4;
      this.redVignette.lineStyle(4, 0xff0000, alpha);
      this.redVignette.strokeRect(i * 2, i * 2, BASE_WIDTH - i * 4, BASE_HEIGHT - i * 4);
    }

    this.tweens.add({
      targets: this.redVignette,
      alpha: { from: 0.6, to: 0 },
      duration: 200,
      ease: 'Linear'
    });
  }

  private triggerGameOver(): void {
    this.isGameOver = true;

    this.gameOverText = this.add.text(BASE_WIDTH / 2, BASE_HEIGHT / 2 - 40, '游戏结束', {
      fontFamily: 'Arial',
      fontSize: '72px',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 4
    });
    this.gameOverText.setOrigin(0.5);
    this.gameOverText.setDepth(300);

    this.gameOverSubText = this.add.text(BASE_WIDTH / 2, BASE_HEIGHT / 2 + 40, `最终得分: ${this.score}  按 R 键重新开始`, {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    });
    this.gameOverSubText.setOrigin(0.5);
    this.gameOverSubText.setDepth(300);

    this.input.keyboard!.on('keydown-R', () => {
      this.restartGame();
    });
  }

  private restartGame(): void {
    this.obstacles.clear(true, true);
    this.collectibles.clear(true, true);
    this.hearts.forEach(h => h.destroy());
    this.hearts = [];

    if (this.gameOverText) this.gameOverText.destroy();
    if (this.gameOverSubText) this.gameOverSubText.destroy();
    if (this.player) this.player.destroy();

    if (this.hudGraphics) this.hudGraphics.destroy();
    if (this.scoreText) this.scoreText.destroy();
    if (this.levelText) this.levelText.destroy();
    if (this.levelProgressBar) this.levelProgressBar.destroy();
    if (this.blueFlashOverlay) this.blueFlashOverlay.destroy();
    if (this.redVignette) this.redVignette.destroy();
    if (this.backgroundGradient) this.backgroundGradient.destroy();

    this.scene.restart();
  }

  update(time: number, delta: number): void {
    if (this.isGameOver) return;

    this.player.update(time, delta);

    this.obstacleSpawnTimer += delta;
    if (this.obstacleSpawnTimer >= this.obstacleSpawnInterval) {
      this.obstacleSpawnTimer = 0;
      this.spawnObstacle();
    }

    this.collectibleSpawnTimer += delta;
    if (this.collectibleSpawnTimer >= this.collectibleSpawnInterval) {
      this.collectibleSpawnTimer = 0;
      this.collectibleSpawnInterval = 2000 + Math.random() * 2000;
      this.spawnCollectible();
    }

    this.obstacles.getChildren().forEach((child) => {
      const obstacle = child as Obstacle;
      if (obstacle.active) {
        obstacle.update(time, delta, BASE_WIDTH, BASE_HEIGHT);
      }
    });

    this.collectibles.getChildren().forEach((child) => {
      const collectible = child as Collectible;
      if (collectible.active) {
        collectible.update(time, delta);
      }
    });

    this.obstacles.getChildren().forEach((child) => {
      const obstacle = child as Obstacle;
      if (!obstacle.active || obstacle.scene === undefined) {
        this.obstacles.remove(obstacle, true, true);
      }
    });

    this.collectibles.getChildren().forEach((child) => {
      const collectible = child as Collectible;
      if (!collectible.active || collectible.scene === undefined) {
        this.collectibles.remove(collectible, true, true);
      }
    });
  }
}
