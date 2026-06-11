import Phaser from 'phaser';

export class UIManager {
  private scene: Phaser.Scene;
  private scoreText: Phaser.GameObjects.Text;
  private speedText: Phaser.GameObjects.Text;
  private hintText: Phaser.GameObjects.Text;
  private gameOverContainer: Phaser.GameObjects.Container;
  private gameOverFlash: Phaser.GameObjects.Graphics;
  private resetButton: Phaser.GameObjects.Text;
  private score: number = 0;
  private scoreAnimating: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.scoreText = scene.add.text(20, 20, '分数: 0', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#39ff14'
    }).setOrigin(0, 0);
    this.scoreText.setShadow(0, 0, '#39ff14', 10, true, true);
    this.scoreText.setDepth(100);

    this.speedText = scene.add.text(scene.scale.width - 20, 20, 'x1.0', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#ff6b9d'
    }).setOrigin(1, 0);
    this.speedText.setShadow(0, 0, '#ff6b9d', 8, true, true);
    this.speedText.setDepth(100);

    this.hintText = scene.add.text(
      scene.scale.width / 2,
      scene.scale.height - 30,
      '空格跳跃 / S滑铲 / 左键抓钩',
      {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffffff80'
      }
    ).setOrigin(0.5, 1);
    this.hintText.setDepth(100);

    this.gameOverContainer = scene.add.container(0, 0);
    this.gameOverContainer.setDepth(200);
    this.gameOverContainer.setVisible(false);

    this.gameOverFlash = scene.add.graphics();
    this.gameOverContainer.add(this.gameOverFlash);

    const gameOverText = scene.add.text(
      scene.scale.width / 2,
      scene.scale.height / 2 - 40,
      '游戏结束',
      {
        fontFamily: 'monospace',
        fontSize: '64px',
        color: '#ff0040',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);
    gameOverText.setShadow(0, 0, '#ff0040', 20, true, true);
    this.gameOverContainer.add(gameOverText);

    this.resetButton = scene.add.text(
      scene.scale.width / 2,
      scene.scale.height / 2 + 40,
      '[ 点击重新开始 ]',
      {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#00d4ff'
      }
    ).setOrigin(0.5);
    this.resetButton.setShadow(0, 0, '#00d4ff', 10, true, true);
    this.resetButton.setInteractive({ useHandCursor: true });
    this.gameOverContainer.add(this.resetButton);

    this.startHintFade();
  }

  private startHintFade(): void {
    this.scene.tweens.add({
      targets: this.hintText,
      alpha: { from: 1, to: 0 },
      duration: 1000,
      hold: 2000,
      delay: 0,
      ease: 'Quad.easeInOut'
    });
  }

  setScore(score: number): void {
    if (score !== this.score) {
      this.score = score;
      this.scoreText.setText(`分数: ${score}`);
      this.animateScore();
    }
  }

  addScore(amount: number): void {
    this.setScore(this.score + amount);
  }

  private animateScore(): void {
    if (this.scoreAnimating) return;
    this.scoreAnimating = true;

    this.scene.tweens.add({
      targets: this.scoreText,
      y: { from: 20, to: 10 },
      duration: 100,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.scoreAnimating = false;
      }
    });
  }

  setSpeedMultiplier(multiplier: number): void {
    this.speedText.setText(`x${multiplier.toFixed(1)}`);
  }

  showGameOver(onReset: () => void): void {
    this.gameOverContainer.setVisible(true);

    let flashCount = 0;
    const flashDuration = 200;
    const totalFlashes = 5;

    const doFlash = () => {
      this.gameOverFlash.clear();
      if (flashCount % 2 === 0) {
        this.gameOverFlash.fillStyle(0xff0000, 0.5);
        this.gameOverFlash.fillRect(0, 0, this.scene.scale.width, this.scene.scale.height);
      }

      flashCount++;
      if (flashCount < totalFlashes * 2) {
        this.scene.time.delayedCall(flashDuration / 2, doFlash);
      } else {
        this.gameOverFlash.clear();
      }
    };

    doFlash();

    this.resetButton.off('pointerdown');
    this.resetButton.on('pointerdown', () => {
      this.hideGameOver();
      onReset();
    });
  }

  hideGameOver(): void {
    this.gameOverContainer.setVisible(false);
    this.gameOverFlash.clear();
  }

  reset(): void {
    this.setScore(0);
    this.setSpeedMultiplier(1);
    this.hideGameOver();
  }

  destroy(): void {
    this.scoreText.destroy();
    this.speedText.destroy();
    this.hintText.destroy();
    this.gameOverContainer.destroy();
  }
}
