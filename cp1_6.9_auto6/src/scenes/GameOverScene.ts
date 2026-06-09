import Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
  private finalScore: number = 0;

  constructor() {
    super('GameOverScene');
  }

  init(data: { score: number }): void {
    this.finalScore = data?.score ?? 0;
  }

  create(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x1a0f08, 0.85);
    overlay.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

    const frame = this.add.graphics();
    frame.lineStyle(6, 0xd4a574, 1);
    frame.strokeRoundedRect(centerX - 300, centerY - 200, 600, 400, 16);
    frame.fillStyle(0x3d2817, 0.95);
    frame.fillRoundedRect(centerX - 297, centerY - 197, 594, 394, 14);

    const gear1 = this.add.image(centerX - 280, centerY - 180, 'gearIcon');
    gear1.setScale(0.8);
    this.tweens.add({
      targets: gear1,
      angle: 360,
      duration: 4000,
      repeat: -1,
      ease: 'Linear'
    });

    const gear2 = this.add.image(centerX + 280, centerY - 180, 'gearIcon');
    gear2.setScale(0.8);
    this.tweens.add({
      targets: gear2,
      angle: -360,
      duration: 4000,
      repeat: -1,
      ease: 'Linear'
    });

    const gear3 = this.add.image(centerX - 280, centerY + 180, 'gearIcon');
    gear3.setScale(0.6);
    this.tweens.add({
      targets: gear3,
      angle: -360,
      duration: 3000,
      repeat: -1,
      ease: 'Linear'
    });

    const gear4 = this.add.image(centerX + 280, centerY + 180, 'gearIcon');
    gear4.setScale(0.6);
    this.tweens.add({
      targets: gear4,
      angle: 360,
      duration: 3000,
      repeat: -1,
      ease: 'Linear'
    });

    this.add.text(centerX, centerY - 120, '蒸汽耗尽', {
      fontFamily: 'Georgia, serif',
      fontSize: '56px',
      color: '#ff6b35',
      fontStyle: 'bold',
      stroke: '#4a2010',
      strokeThickness: 4
    }).setOrigin(0.5);

    this.add.text(centerX, centerY - 40, '最终得分', {
      fontFamily: 'Georgia, serif',
      fontSize: '28px',
      color: '#d4a574',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    this.add.text(centerX, centerY + 10, this.finalScore.toString(), {
      fontFamily: 'Georgia, serif',
      fontSize: '64px',
      color: '#ffd700',
      fontStyle: 'bold',
      stroke: '#6b4423',
      strokeThickness: 3
    }).setOrigin(0.5);

    const btnBg = this.add.graphics();
    const btnX = centerX - 120;
    const btnY = centerY + 90;
    const btnW = 240;
    const btnH = 60;

    const drawBtn = (hovered: boolean) => {
      btnBg.clear();
      btnBg.lineStyle(3, hovered ? 0xffd700 : 0xd4a574, 1);
      btnBg.strokeRoundedRect(btnX, btnY, btnW, btnH, 8);
      btnBg.fillStyle(hovered ? 0x8b5a2b : 0x6b4423, 1);
      btnBg.fillRoundedRect(btnX + 2, btnY + 2, btnW - 4, btnH - 4, 6);
    };

    drawBtn(false);

    const btnText = this.add.text(centerX, btnY + btnH / 2, '⚙  重新开始', {
      fontFamily: 'Georgia, serif',
      fontSize: '26px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const btnZone = this.add.zone(btnX, btnY, btnW, btnH).setOrigin(0).setInteractive({ useHandCursor: true });

    btnZone.on('pointerover', () => {
      drawBtn(true);
      btnText.setColor('#ffffff');
    });

    btnZone.on('pointerout', () => {
      drawBtn(false);
      btnText.setColor('#ffd700');
    });

    btnZone.on('pointerdown', () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('GameScene');
      });
    });

    this.cameras.main.fadeIn(800, 0, 0, 0);
  }
}
