export class UI {
  private scene: Phaser.Scene;
  private health: number = 3;
  private score: number = 0;
  private level: number = 1;

  private healthIcons: Phaser.GameObjects.Group;
  private levelText: Phaser.GameObjects.Text;
  private scoreText: Phaser.GameObjects.Text;
  private hintText: Phaser.GameObjects.Text;
  private resetButton: Phaser.GameObjects.Text;
  private gameOverContainer: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.healthIcons = this.scene.add.group();
    this.levelText = this.scene.add.text(0, 0, '', this.getTextStyle(20));
    this.scoreText = this.scene.add.text(0, 0, '', this.getTextStyle(18));
    this.hintText = this.scene.add.text(0, 0, '', this.getTextStyle(16));
    this.resetButton = this.scene.add.text(0, 0, '', this.getTextStyle(16));
  }

  private getTextStyle(fontSize: number): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: `${fontSize}px`,
      color: '#d4af37',
      fontStyle: 'italic'
    };
  }

  public create(x: number, y: number, width: number, height: number): void {
    this.createLevelText(x + 40, y + 30);
    this.createHealthIcons(width - 140, y + 30);
    this.createScoreText(width / 2, y + height - 60);
    this.createHintText(width / 2, y + height - 110);
    this.createResetButton(width / 2, y + height - 30);
  }

  private createLevelText(x: number, y: number): void {
    this.levelText.setPosition(x, y);
    this.levelText.setOrigin(0, 0.5);
    this.updateLevel(this.level);
  }

  private createHealthIcons(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      const heart = this.createHeartShape(x + i * 35, y);
      this.healthIcons.add(heart);
    }
  }

  private createHeartShape(x: number, y: number): Phaser.GameObjects.Graphics {
    const heart = this.scene.add.graphics();
    heart.fillStyle(0xff6b6b, 1);

    heart.beginPath();
    heart.moveTo(x, y + 8);
    heart.lineTo(x - 12, y - 2);
    heart.arc(x - 6, y - 4, 6, Math.PI, 0, false);
    heart.arc(x + 6, y - 4, 6, Math.PI, 0, false);
    heart.lineTo(x + 12, y - 2);
    heart.closePath();
    heart.fillPath();

    heart.setData('active', true);
    heart.setData('centerX', x);
    heart.setData('centerY', y);
    return heart;
  }

  private createScoreText(x: number, y: number): void {
    this.scoreText.setPosition(x, y);
    this.scoreText.setOrigin(0.5);
    this.updateScore(0);
  }

  private createHintText(x: number, y: number): void {
    this.hintText.setPosition(x, y);
    this.hintText.setOrigin(0.5);
    this.hintText.setText('绘制封闭符文回路（至少6个节点）以激活核心');
    this.hintText.setAlpha(0.7);
  }

  private createResetButton(x: number, y: number): void {
    this.resetButton.setPosition(x, y);
    this.resetButton.setOrigin(0.5);
    this.resetButton.setText('重置当前石板');
    this.resetButton.setPadding({ x: 20, y: 10 });
    this.resetButton.setStyle({
      ...this.getTextStyle(16),
      backgroundColor: 'transparent',
      stroke: '#8b7355',
      strokeThickness: 2
    });

    this.resetButton.setInteractive({ useHandCursor: true });

    this.resetButton.on('pointerover', () => {
      this.resetButton.setStyle({
        ...this.getTextStyle(16),
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        stroke: '#d4af37',
        strokeThickness: 2
      });
    });

    this.resetButton.on('pointerout', () => {
      this.resetButton.setStyle({
        ...this.getTextStyle(16),
        backgroundColor: 'transparent',
        stroke: '#8b7355',
        strokeThickness: 2
      });
    });
  }

  public setResetButtonCallback(callback: () => void): void {
    this.resetButton.on('pointerdown', callback);
  }

  public updateHealth(health: number): void {
    this.health = health;
    const hearts = this.healthIcons.getChildren() as Phaser.GameObjects.Graphics[];
    hearts.forEach((heart, index) => {
      const isActive = index < health;
      heart.setData('active', isActive);
      heart.setAlpha(isActive ? 1 : 0.2);

      const color = isActive ? 0xff6b6b : 0x555555;
      const alpha = isActive ? 1 : 0.5;
      const x = heart.getData('centerX') as number;
      const y = heart.getData('centerY') as number;

      heart.clear();
      heart.fillStyle(color, alpha);
      heart.beginPath();
      heart.moveTo(x, y + 8);
      heart.lineTo(x - 12, y - 2);
      heart.arc(x - 6, y - 4, 6, Math.PI, 0, false);
      heart.arc(x + 6, y - 4, 6, Math.PI, 0, false);
      heart.lineTo(x + 12, y - 2);
      heart.closePath();
      heart.fillPath();
    });
  }

  public updateScore(points: number): void {
    this.score += points;
    this.scoreText.setText(`分数: ${this.score}`);
  }

  public getScore(): number {
    return this.score;
  }

  public updateLevel(level: number): void {
    this.level = level;
    this.levelText.setText(`符文遗迹 - 第${level}层`);
  }

  public setHint(text: string): void {
    this.hintText.setText(text);
  }

  public showGameOver(finalScore: number, onRestart: () => void): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    this.gameOverContainer = this.scene.add.container(0, 0);
    this.gameOverContainer.setAlpha(0);

    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);

    const title = this.scene.add.text(
      width / 2,
      height / 2 - 80,
      '游戏结束',
      { ...this.getTextStyle(48), color: '#ff6b6b' }
    );
    title.setOrigin(0.5);

    const scoreDisplay = this.scene.add.text(
      width / 2,
      height / 2,
      `最终得分: ${finalScore}`,
      this.getTextStyle(28)
    );
    scoreDisplay.setOrigin(0.5);

    const restartButton = this.scene.add.text(
      width / 2,
      height / 2 + 80,
      '重新开始',
      {
        ...this.getTextStyle(22),
        backgroundColor: 'transparent',
        stroke: '#8b7355',
        strokeThickness: 2
      }
    );
    restartButton.setOrigin(0.5);
    restartButton.setPadding({ x: 30, y: 15 });
    restartButton.setInteractive({ useHandCursor: true });

    restartButton.on('pointerover', () => {
      restartButton.setStyle({
        ...this.getTextStyle(22),
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        stroke: '#d4af37',
        strokeThickness: 2
      });
    });

    restartButton.on('pointerout', () => {
      restartButton.setStyle({
        ...this.getTextStyle(22),
        backgroundColor: 'transparent',
        stroke: '#8b7355',
        strokeThickness: 2
      });
    });

    restartButton.on('pointerdown', () => {
      this.hideGameOver();
      onRestart();
    });

    this.gameOverContainer.add([overlay, title, scoreDisplay, restartButton]);

    this.scene.tweens.add({
      targets: this.gameOverContainer,
      alpha: 1,
      duration: 1000,
      ease: 'Linear'
    });
  }

  private hideGameOver(): void {
    if (this.gameOverContainer) {
      this.gameOverContainer.destroy();
      this.gameOverContainer = null;
    }
  }

  public reset(level: number): void {
    this.health = 3;
    this.score = 0;
    this.level = level;
    this.updateHealth(3);
    this.updateScore(-this.score);
    this.updateLevel(level);
    this.setHint('绘制封闭符文回路（至少6个节点）以激活核心');
  }

  public destroy(): void {
    this.healthIcons.destroy(true);
    this.levelText.destroy();
    this.scoreText.destroy();
    this.hintText.destroy();
    this.resetButton.destroy();
    if (this.gameOverContainer) {
      this.gameOverContainer.destroy();
    }
  }
}
