import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.load.setBaseURL('./');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0d0221');

    const title = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 - 60,
      '赛博朋克跑酷',
      {
        fontFamily: 'monospace',
        fontSize: '48px',
        color: '#39ff14',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);

    title.setShadow(0, 0, '#39ff14', 10);

    const subtitle = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 + 20,
      'CYBERPUNK PARKOUR',
      {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#ff6b9d'
      }
    ).setOrigin(0.5);

    subtitle.setShadow(0, 0, '#ff6b9d', 8);

    const tip = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 + 80,
      '点击任意位置开始游戏',
      {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ffffff'
      }
    ).setOrigin(0.5);

    this.tweens.add({
      targets: tip,
      alpha: { from: 0.3, to: 1 },
      duration: 1000,
      yoyo: true,
      repeat: -1
    });

    this.input.once('pointerdown', () => {
      this.scene.start('GameScene');
    });

    this.input.keyboard!.once('keydown-SPACE', () => {
      this.scene.start('GameScene');
    });
  }
}
