import Phaser from 'phaser';

export interface ScoreEntry {
  name: string;
  score: number;
}

export class StartScene extends Phaser.Scene {
  private titleText: Phaser.GameObjects.Text | null = null;
  private startButton: Phaser.GameObjects.Text | null = null;
  private scores: ScoreEntry[] = [];
  private readonly SCORE_KEY: string = 'space_delivery_scores';

  constructor() {
    super({ key: 'StartScene' });
  }

  preload(): void {
    this.loadScores();
  }

  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    this.addStarBackground();

    this.titleText = this.add.text(width / 2, height * 0.15, 'SPACE DELIVERY', {
      fontFamily: 'monospace',
      fontSize: '56px',
      fontStyle: 'bold',
      color: '#6688ff',
      stroke: '#00ff88',
      strokeThickness: 4
    }).setOrigin(0.5);

    this.tweens.add({
      targets: this.titleText,
      color: { from: '#6688ff', to: '#aa66ff' },
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.tweens.add({
      targets: this.titleText,
      scale: { from: 1, to: 1.05 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const subtitle = this.add.text(width / 2, height * 0.25, 'ARROW KEYS TO MOVE | SPACE TO BOOST', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#88ffaa',
      stroke: '#004422',
      strokeThickness: 2
    }).setOrigin(0.5);

    this.tweens.add({
      targets: subtitle,
      alpha: { from: 0.5, to: 1 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.createLeaderboard(width / 2, height * 0.4);

    this.startButton = this.add.text(width / 2, height * 0.85, 'START', {
      fontFamily: 'monospace',
      fontSize: '40px',
      fontStyle: 'bold',
      color: '#00ff88',
      stroke: '#004422',
      strokeThickness: 4
    }).setOrigin(0.5);

    this.startButton.setInteractive({ useHandCursor: true });

    this.startButton.on('pointerover', () => {
      this.tweens.add({
        targets: this.startButton,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 150,
        ease: 'Back.easeOut'
      });
      if (this.startButton) {
        this.startButton.setColor('#ffff00');
      }
    });

    this.startButton.on('pointerout', () => {
      this.tweens.add({
        targets: this.startButton,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Back.easeOut'
      });
      if (this.startButton) {
        this.startButton.setColor('#00ff88');
      }
    });

    this.startButton.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start('GameScene');
      });
    });

    this.input.keyboard!.on('keydown-SPACE', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start('GameScene');
      });
    });

    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  private addStarBackground(): void {
    const graphics = this.add.graphics();

    for (let i = 0; i < 100; i++) {
      const x = Phaser.Math.Between(0, this.scale.width);
      const y = Phaser.Math.Between(0, this.scale.height);
      const size = Phaser.Math.Between(1, 3);
      const brightness = Phaser.Math.Between(100, 255);

      graphics.fillStyle(Phaser.Display.Color.GetColor(brightness, brightness, brightness), 0.8);
      graphics.fillRect(x, y, size, size);
    }

    this.tweens.add({
      targets: graphics,
      alpha: { from: 0.5, to: 1 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private createLeaderboard(x: number, y: number): void {
    const panelWidth = 360;
    const panelHeight = 260;
    const panelX = x - panelWidth / 2;
    const panelY = y - panelHeight / 2;

    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.7);
    panel.lineStyle(3, 0x00ff88, 0.8);
    panel.fillRect(panelX, panelY, panelWidth, panelHeight);
    panel.strokeRect(panelX, panelY, panelWidth, panelHeight);

    const title = this.add.text(x, panelY + 20, 'HIGH SCORES', {
      fontFamily: 'monospace',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#00ff88',
      stroke: '#002211',
      strokeThickness: 3
    }).setOrigin(0.5);

    if (this.scores.length === 0) {
      this.add.text(x, y, 'NO RECORDS YET', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#888888'
      }).setOrigin(0.5);
      return;
    }

    for (let i = 0; i < Math.min(this.scores.length, 10); i++) {
      const entry = this.scores[i];
      const rowY = panelY + 55 + i * 20;

      let color = '#ffffff';
      if (i === 0) color = '#ffd700';
      else if (i === 1) color = '#c0c0c0';
      else if (i === 2) color = '#cd7f32';

      const rankText = this.add.text(panelX + 20, rowY, `${i + 1}.`, {
        fontFamily: 'monospace',
        fontSize: '16px',
        fontStyle: 'bold',
        color: color,
        stroke: '#000000',
        strokeThickness: 2
      }).setOrigin(0, 0.5);

      const nameText = this.add.text(panelX + 60, rowY, entry.name, {
        fontFamily: 'monospace',
        fontSize: '16px',
        fontStyle: 'bold',
        color: color,
        stroke: '#000000',
        strokeThickness: 2
      }).setOrigin(0, 0.5);

      const scoreText = this.add.text(panelX + panelWidth - 20, rowY, entry.score.toString(), {
        fontFamily: 'monospace',
        fontSize: '16px',
        fontStyle: 'bold',
        color: color,
        stroke: '#000000',
        strokeThickness: 2
      }).setOrigin(1, 0.5);
    }
  }

  private loadScores(): void {
    try {
      const stored = localStorage.getItem(this.SCORE_KEY);
      if (stored) {
        this.scores = JSON.parse(stored);
      }
    } catch (e) {
      this.scores = [];
    }
  }
}
