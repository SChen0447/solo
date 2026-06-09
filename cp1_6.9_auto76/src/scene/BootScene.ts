import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  private progressBar?: Phaser.GameObjects.Graphics;
  private progressBox?: Phaser.GameObjects.Graphics;
  private percentText?: Phaser.GameObjects.Text;
  private loadingText?: Phaser.GameObjects.Text;
  private assetText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'BootScene' });
  }

  public preload(): void {
    this.createLoadingUI();

    this.load.on('progress', this.onLoadProgress, this);
    this.load.on('fileprogress', this.onFileProgress, this);
    this.load.on('complete', this.onLoadComplete, this);

    this.load.textures = this.load.textures;

    this.time.delayedCall(500, () => {
      this.onLoadComplete();
    });
  }

  private createLoadingUI(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.progressBox = this.add.graphics();
    this.progressBox.fillStyle(0x222222, 0.8);
    this.progressBox.fillRect(width / 2 - 160, height / 2 - 30, 320, 50);

    this.progressBar = this.add.graphics();

    this.loadingText = this.add.text(width / 2, height / 2 - 80, '正在加载地牢...', {
      fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
      fontSize: '28px',
      color: '#ffffff'
    });
    this.loadingText.setOrigin(0.5);

    this.percentText = this.add.text(width / 2, height / 2 - 5, '0%', {
      fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
      fontSize: '20px',
      color: '#ffffff'
    });
    this.percentText.setOrigin(0.5);

    this.assetText = this.add.text(width / 2, height / 2 + 50, '', {
      fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
      fontSize: '16px',
      color: '#888888'
    });
    this.assetText.setOrigin(0.5);

    this.tweens.add({
      targets: this.loadingText,
      alpha: { from: 0.6, to: 1 },
      duration: 800,
      yoyo: true,
      repeat: -1
    });
  }

  private onLoadProgress(value: number): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    if (this.progressBar) {
      this.progressBar.clear();
      const gradient = this.progressBar.createLinearGradient(0, 0, 300, 0);
      gradient.addColorStop(0, 0x1e3a8a);
      gradient.addColorStop(0.5, 0x3b82f6);
      gradient.addColorStop(1, 0x60a5fa);
      this.progressBar.fillGradientStyle(0x3b82f6, 0x1e40af, 0x1e40af, 0x3b82f6, 1, 1, 1, 1);
      this.progressBar.fillRect(width / 2 - 150, height / 2 - 20, 300 * value, 30);
    }

    if (this.percentText) {
      const percent = Math.floor(value * 100);
      this.percentText.setText(percent + '%');
      this.percentText.setScale(1 + value * 0.1);
    }
  }

  private onFileProgress(_file: Phaser.Loader.File): void {
    // Optional: show file name
  }

  private onLoadComplete(): void {
    if (this.progressBar) {
      this.progressBar.clear();
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      const gradient = this.progressBar.createLinearGradient(0, 0, 300, 0);
      gradient.addColorStop(0, 0x1e3a8a);
      gradient.addColorStop(0.5, 0x3b82f6);
      gradient.addColorStop(1, 0x60a5fa);
      this.progressBar.fillGradientStyle(0x3b82f6, 0x1e40af, 0x1e40af, 0x3b82f6, 1, 1, 1, 1);
      this.progressBar.fillRect(width / 2 - 150, height / 2 - 20, 300, 30);
    }
    if (this.percentText) {
      this.percentText.setText('100%');
    }
    if (this.assetText) {
      this.assetText.setText('加载完成！');
    }

    this.time.delayedCall(800, () => {
      this.scene.start('GameScene');
    });
  }

  public create(): void {
    // Placeholder
  }
}
