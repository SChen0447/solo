import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { ObstacleManager, Treasure } from '../entities/ObstacleManager';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private obstacleManager!: ObstacleManager;
  private stars: Phaser.GameObjects.Graphics[] = [];
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private scorePulseTween: Phaser.Tweens.Tween | null = null;
  private livesContainer!: Phaser.GameObjects.Container;
  private heartTexturesCreated: boolean = false;
  private gameOver: boolean = false;
  private gameOverLayer!: Phaser.GameObjects.Container;
  private finalScoreText!: Phaser.GameObjects.Text;
  private restartHintText!: Phaser.GameObjects.Text;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private fadeOverlay!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {}

  create(): void {
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.createFadeOverlay();
    this.createStarfield();
    this.createPlayer();
    this.createObstacleManager();
    this.createUI();
    this.setupCollisions();
    this.setupInput();
    this.createGameOverLayer();
    this.obstacleManager.startSpawning();
  }

  private createFadeOverlay(): void {
    this.fadeOverlay = this.add.graphics();
    this.fadeOverlay.fillStyle(0x000000, 1);
    this.fadeOverlay.fillRect(0, 0, this.scale.width, this.scale.height);
    this.fadeOverlay.setDepth(100);
    this.tweens.add({
      targets: this.fadeOverlay,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        this.fadeOverlay.setVisible(false);
      }
    });
  }

  private createStarfield(): void {
    for (let i = 0; i < 50; i++) {
      const star = this.add.graphics();
      const x = Phaser.Math.Between(0, this.scale.width);
      const y = Phaser.Math.Between(0, this.scale.height);
      const brightness = Phaser.Math.FloatBetween(0.3, 0.8);
      star.fillStyle(0xffffff, brightness);
      star.fillRect(x, y, 2, 2);
      this.stars.push(star);

      this.tweens.add({
        targets: star,
        alpha: { from: brightness * 0.5, to: brightness },
        duration: Phaser.Math.Between(1500, 3000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 2000)
      });
    }
  }

  private createPlayer(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    this.player = new Player(this, centerX, centerY);

    this.player.setLivesChangeCallback((lives: number) => {
      this.updateLivesDisplay(lives);
    });
  }

  private createObstacleManager(): void {
    this.obstacleManager = new ObstacleManager(this);
    this.obstacleManager.setTreasureCollectCallback((_treasure: Treasure, position: Phaser.Math.Vector2) => {
      this.score += 10;
      this.updateScoreDisplay();
      this.showScorePopup(position.x, position.y, '+10');
    });
  }

  private createUI(): void {
    this.scoreText = this.add.text(20, 20, '分数: 0', {
      fontFamily: 'Courier New',
      fontSize: '24px',
      color: '#ffd700',
      fontStyle: 'bold'
    });
    this.scoreText.setShadow(2, 2, 'rgba(0,0,0,0.8)', 2);

    this.livesContainer = this.add.container(this.scale.width - 20, 30);
    this.createHeartTexture();
    this.updateLivesDisplay(3);

    const hintBar = this.add.graphics();
    hintBar.fillStyle(0x000000, 0.5);
    hintBar.fillRect(0, this.scale.height - 40, this.scale.width, 40);

    this.add.text(this.scale.width / 2, this.scale.height - 20, 
      'WASD 移动飞船  |  收集金色宝箱  |  躲避小行星和星际警察', {
      fontFamily: 'Courier New',
      fontSize: '14px',
      color: '#aaccff'
    }).setOrigin(0.5);
  }

  private createHeartTexture(): void {
    if (this.heartTexturesCreated) return;
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xff4466);
    graphics.fillCircle(7, 7, 5);
    graphics.fillCircle(17, 7, 5);
    graphics.beginPath();
    graphics.moveTo(2, 8);
    graphics.lineTo(12, 22);
    graphics.lineTo(22, 8);
    graphics.closePath();
    graphics.fillPath();
    graphics.fillStyle(0xff88aa);
    graphics.fillRect(4, 4, 3, 2);
    graphics.generateTexture('heartTex', 24, 24);
    graphics.destroy();
    this.heartTexturesCreated = true;
  }

  private updateLivesDisplay(lives: number): void {
    this.livesContainer.removeAll(true);
    for (let i = 0; i < lives; i++) {
      const heart = this.add.sprite(-i * 30, 0, 'heartTex');
      heart.setDisplaySize(24, 24);
      heart.setOrigin(1, 0.5);
      this.livesContainer.add(heart);
    }

    if (lives < 3 && this.livesContainer.list.length > 0) {
      this.livesContainer.list.forEach(heart => {
        const sprite = heart as Phaser.GameObjects.Sprite;
        this.tweens.add({
          targets: sprite,
          x: sprite.x + Phaser.Math.Between(-3, 3),
          y: sprite.y + Phaser.Math.Between(-3, 3),
          duration: 50,
          yoyo: true,
          repeat: 1
        });
      });
    }
  }

  private updateScoreDisplay(): void {
    this.scoreText.setText(`分数: ${this.score}`);

    if (this.scorePulseTween) {
      this.scorePulseTween.stop();
    }
    this.scorePulseTween = this.tweens.add({
      targets: this.scoreText,
      scaleX: { from: 1, to: 1.2 },
      scaleY: { from: 1, to: 1.2 },
      duration: 150,
      yoyo: true,
      ease: 'Cubic.easeOut'
    });
  }

  private showScorePopup(x: number, y: number, text: string): void {
    const popup = this.add.text(x, y, text, {
      fontFamily: 'Courier New',
      fontSize: '18px',
      color: '#ffd700',
      fontStyle: 'bold'
    });
    popup.setOrigin(0.5);
    popup.setShadow(1, 1, 'rgba(0,0,0,0.8)', 1);

    this.tweens.add({
      targets: popup,
      y: y - 40,
      alpha: { from: 1, to: 0 },
      duration: 500,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        popup.destroy();
      }
    });
  }

  private setupCollisions(): void {
    this.physics.add.overlap(
      this.player,
      this.obstacleManager.getTreasures().map(t => t.sprite),
      (_playerObj, treasureObj) => {
        const treasure = this.obstacleManager.getTreasures().find(
          t => t.sprite === treasureObj
        );
        if (treasure) {
          this.obstacleManager.collectTreasure(treasure);
        }
      },
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.obstacleManager.getAsteroids(),
      (playerObj) => {
        const p = playerObj as Player;
        const isDead = p.takeDamage(false);
        if (isDead) {
          this.triggerGameOver();
        }
      },
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.obstacleManager.getPoliceShips(),
      (playerObj) => {
        const p = playerObj as Player;
        this.obstacleManager.dropTreasures(p.x, p.y);
        const isDead = p.takeDamage(true);
        if (isDead) {
          this.triggerGameOver();
        }
      },
      undefined,
      this
    );
  }

  private updateDynamicCollisions(): void {
    this.physics.add.overlap(
      this.player,
      this.obstacleManager.getTreasures().map(t => t.sprite),
      (_playerObj, treasureObj) => {
        const treasure = this.obstacleManager.getTreasures().find(
          t => t.sprite === treasureObj
        );
        if (treasure) {
          this.obstacleManager.collectTreasure(treasure);
        }
      },
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.obstacleManager.getAsteroids(),
      (playerObj) => {
        const p = playerObj as Player;
        const isDead = p.takeDamage(false);
        if (isDead) {
          this.triggerGameOver();
        }
      },
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.obstacleManager.getPoliceShips(),
      (playerObj) => {
        const p = playerObj as Player;
        this.obstacleManager.dropTreasures(p.x, p.y);
        const isDead = p.takeDamage(true);
        if (isDead) {
          this.triggerGameOver();
        }
      },
      undefined,
      this
    );
  }

  private setupInput(): void {
    if (this.input.keyboard) {
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }
  }

  private createGameOverLayer(): void {
    this.gameOverLayer = this.add.container(0, 0);
    this.gameOverLayer.setDepth(50);
    this.gameOverLayer.setVisible(false);

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, this.scale.width, this.scale.height);
    this.gameOverLayer.add(overlay);

    const title = this.add.text(this.scale.width / 2, this.scale.height / 2 - 80, '游戏结束', {
      fontFamily: 'Courier New',
      fontSize: '48px',
      color: '#ff4444',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    title.setShadow(3, 3, 'rgba(0,0,0,0.9)', 3);
    this.gameOverLayer.add(title);

    this.finalScoreText = this.add.text(this.scale.width / 2, this.scale.height / 2, '最终得分: 0', {
      fontFamily: 'Courier New',
      fontSize: '28px',
      color: '#ffd700'
    });
    this.finalScoreText.setOrigin(0.5);
    this.gameOverLayer.add(this.finalScoreText);

    this.restartHintText = this.add.text(this.scale.width / 2, this.scale.height / 2 + 80, '按空格键重新开始', {
      fontFamily: 'Courier New',
      fontSize: '20px',
      color: '#aaccff'
    });
    this.restartHintText.setOrigin(0.5);
    this.gameOverLayer.add(this.restartHintText);
  }

  private triggerGameOver(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.obstacleManager.destroy();
    this.player.setActive(false);
    this.player.setVisible(false);

    this.gameOverLayer.setVisible(true);
    this.gameOverLayer.setAlpha(0);
    this.finalScoreText.setText(`最终得分: ${this.score}`);

    this.tweens.add({
      targets: this.gameOverLayer,
      alpha: 1,
      duration: 500,
      ease: 'Cubic.easeIn'
    });
  }

  private restartGame(): void {
    this.fadeOverlay.setVisible(true);
    this.fadeOverlay.setAlpha(0);

    this.tweens.add({
      targets: this.fadeOverlay,
      alpha: 1,
      duration: 300,
      onComplete: () => {
        this.gameOver = false;
        this.score = 0;
        this.updateScoreDisplay();
        this.player.reset(this.scale.width / 2, this.scale.height / 2);
        this.player.setActive(true);
        this.player.setVisible(true);
        this.gameOverLayer.setVisible(false);
        this.obstacleManager.destroy();
        this.obstacleManager = new ObstacleManager(this);
        this.obstacleManager.setTreasureCollectCallback((_treasure: Treasure, position: Phaser.Math.Vector2) => {
          this.score += 10;
          this.updateScoreDisplay();
          this.showScorePopup(position.x, position.y, '+10');
        });
        this.obstacleManager.startSpawning();

        this.tweens.add({
          targets: this.fadeOverlay,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            this.fadeOverlay.setVisible(false);
          }
        });
      }
    });
  }

  update(time: number, delta: number): void {
    if (!this.gameOver) {
      this.player.update(time, delta);
      this.obstacleManager.update();
      this.updateDynamicCollisions();
    }

    if (this.gameOver && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.restartGame();
    }
  }
}
