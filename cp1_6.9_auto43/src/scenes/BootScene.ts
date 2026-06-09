import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBox!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;
  private percentText!: Phaser.GameObjects.Text;

  constructor() {
    super('BootScene');
  }

  preload(): void {
    const { width, height } = this.cameras.main;

    this.add.text(width / 2, height / 2 - 80, '酒吧记忆配对', {
      fontFamily: 'Georgia',
      fontSize: '36px',
      color: '#d4a85a'
    }).setOrigin(0.5);

    this.progressBox = this.add.graphics();
    this.progressBox.fillStyle(0x3a2218, 0.8);
    this.progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);
    this.progressBox.lineStyle(2, 0xd4a85a, 1);
    this.progressBox.strokeRect(width / 2 - 160, height / 2 - 25, 320, 50);

    this.progressBar = this.add.graphics();

    this.loadingText = this.add.text(width / 2, height / 2, '正在加载...', {
      fontFamily: 'Georgia',
      fontSize: '18px',
      color: '#d4a85a'
    }).setOrigin(0.5);

    this.percentText = this.add.text(width / 2, height / 2 + 40, '0%', {
      fontFamily: 'Georgia',
      fontSize: '16px',
      color: '#d4a85a'
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      this.progressBar.clear();
      this.progressBar.fillStyle(0xdaa520, 1);
      this.progressBar.fillRect(width / 2 - 156, height / 2 - 21, 312 * value, 42);
      this.percentText.setText(`${Math.round(value * 100)}%`);
    });

    this.load.on('complete', () => {
      this.loadingText.setText('加载完成！');
    });

    this.generateTextures();
  }

  private generateTextures(): void {
    this.createCardBackTexture();
    this.createCardFrontTexture();
    this.createDrinkTextures();
    this.createHeartTexture();
  }

  private createCardBackTexture(): void {
    const w = 120, h = 160;
    const g = this.add.graphics();

    g.clear();
    g.fillStyle(0x5c3a21, 1);
    g.fillRoundedRect(0, 0, w, h, 10);

    for (let y = 0; y < h; y += 8) {
      g.lineStyle(1, 0x4a2e1a, 0.4);
      g.beginPath();
      g.moveTo(2, y);
      g.lineTo(w - 2, y + Phaser.Math.Between(-2, 2));
      g.strokePath();
    }
    for (let x = 0; x < w; x += 20) {
      g.lineStyle(1, 0x4a2e1a, 0.25);
      g.beginPath();
      g.moveTo(x, 2);
      g.lineTo(x + Phaser.Math.Between(-3, 3), h - 2);
      g.strokePath();
    }

    g.lineStyle(3, 0xd4a85a, 0.7);
    g.strokeRoundedRect(0, 0, w, h, 10);

    g.generateTexture('cardBack', w, h);
    g.destroy();
  }

  private createCardFrontTexture(): void {
    const w = 120, h = 160;
    const g = this.add.graphics();

    g.fillStyle(0x2a1a10, 1);
    g.fillRoundedRect(0, 0, w, h, 10);

    g.lineStyle(2, 0xd4a85a, 0.6);
    g.strokeRoundedRect(3, 3, w - 6, h - 6, 8);

    g.generateTexture('cardFront', w, h);
    g.destroy();
  }

  private createDrinkTextures(): void {
    const drinks: { key: string; color: number; draw: (g: Phaser.GameObjects.Graphics) => void }[] = [
      {
        key: 'martini',
        color: 0x87ceeb,
        draw: (g) => {
          g.fillTriangle(50, 30, 70, 30, 60, 70);
          g.fillRect(58, 70, 4, 20);
          g.fillRect(45, 90, 30, 6);
        }
      },
      {
        key: 'beer',
        color: 0xd4a017,
        draw: (g) => {
          g.fillRect(35, 30, 40, 55);
          g.fillStyle(0x8b4513, 1);
          g.fillRect(75, 40, 12, 30);
          g.fillStyle(0xffffff, 0.9);
          g.fillEllipse(55, 28, 38, 10);
        }
      },
      {
        key: 'wine',
        color: 0x8b0000,
        draw: (g) => {
          g.fillEllipse(60, 55, 40, 45);
          g.fillRect(57, 75, 6, 20);
          g.fillRect(40, 95, 40, 5);
        }
      },
      {
        key: 'cocktail',
        color: 0xff69b4,
        draw: (g) => {
          g.fillRect(40, 40, 40, 35);
          g.fillStyle(0xffffff, 0.4);
          g.fillRect(42, 42, 36, 8);
          g.fillStyle(0x000000, 1);
          g.fillRect(58, 20, 4, 20);
          g.fillStyle(0xff4444, 1);
          g.fillCircle(56, 18, 5);
        }
      },
      {
        key: 'whiskey',
        color: 0xd4a017,
        draw: (g) => {
          g.fillRect(35, 35, 50, 50);
          g.fillStyle(0xffffff, 0.3);
          g.fillRect(38, 38, 44, 12);
        }
      },
      {
        key: 'juice',
        color: 0xff8c00,
        draw: (g) => {
          g.fillRect(38, 30, 44, 60);
          g.fillStyle(0xffffff, 0.25);
          g.fillRect(40, 32, 40, 10);
          g.fillStyle(0x228b22, 1);
          g.fillEllipse(60, 25, 18, 10);
        }
      },
      {
        key: 'coffee',
        color: 0x654321,
        draw: (g) => {
          g.fillEllipse(55, 60, 45, 35);
          g.fillStyle(0x3d2413, 1);
          g.fillEllipse(55, 52, 38, 25);
          g.fillStyle(0xffffff, 0.6);
          g.fillEllipse(50, 48, 8, 5);
          g.fillStyle(0xd4a85a, 1);
          g.fillRect(78, 45, 10, 20);
        }
      },
      {
        key: 'soda',
        color: 0x00ced1,
        draw: (g) => {
          g.fillRect(40, 28, 40, 65);
          g.fillStyle(0xffffff, 0.5);
          g.fillCircle(48, 45, 3);
          g.fillCircle(60, 55, 3);
          g.fillCircle(68, 42, 3);
          g.fillCircle(52, 65, 3);
          g.fillStyle(0x444444, 1);
          g.fillRect(38, 22, 44, 10);
        }
      }
    ];

    drinks.forEach(({ key, color, draw }) => {
      const size = 80;
      const g = this.add.graphics();

      g.fillStyle(color, 1);
      g.lineStyle(2, 0xffffff, 0.8);
      draw(g);

      g.generateTexture(key, size, size);
      g.destroy();
    });
  }

  private createHeartTexture(): void {
    const size = 32;
    const g = this.add.graphics();

    g.fillStyle(0xff3366, 1);
    g.fillCircle(10, 11, 7);
    g.fillCircle(22, 11, 7);
    g.fillTriangle(4, 14, 28, 14, 16, 30);

    g.lineStyle(1, 0xff88aa, 0.6);
    g.strokeCircle(10, 11, 7);
    g.strokeCircle(22, 11, 7);
    g.beginPath();
    g.moveTo(4, 14);
    g.lineTo(16, 30);
    g.lineTo(28, 14);
    g.strokePath();

    g.fillStyle(0xffffff, 0.4);
    g.fillCircle(8, 9, 2);

    g.generateTexture('heart', size, size);
    g.destroy();
  }

  create(): void {
    this.time.delayedCall(500, () => {
      this.scene.start('GameScene');
    });
  }
}
