import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressFill!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const { width, height } = this.cameras.main;
    const cx = width / 2;
    const cy = height / 2;

    this.progressBar = this.add.graphics();
    this.progressFill = this.add.graphics();

    this.loadingText = this.add.text(cx, cy - 40, '魔法植物园加载中...', {
      fontSize: '24px',
      color: '#c9a96e',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    const barWidth = 400;
    const barHeight = 20;
    this.load.on('progress', (value: number) => {
      this.progressBar.clear();
      this.progressBar.fillStyle(0x3e2f1b, 1);
      this.progressBar.fillRect(cx - barWidth / 2, cy, barWidth, barHeight);

      this.progressFill.clear();
      this.progressFill.fillStyle(0xc9a96e, 1);
      this.progressFill.fillRect(cx - barWidth / 2, cy, barWidth * value, barHeight);
    });

    this.load.on('complete', () => {
      this.progressBar.destroy();
      this.progressFill.destroy();
      this.loadingText.destroy();
    });

    this.generateTextures();
  }

  create(): void {
    this.scene.start('MainScene');
  }

  private generateTextures(): void {
    this.generateSeedTextures();
    this.generatePotTexture();
    this.generateSoilTexture();
    this.generateParticleTexture();
    this.generateMagicCircleTexture();
    this.generateButtonTexture();
    this.generateWateringCanTexture();
    this.generatePlantStages();
  }

  private generateSeedTextures(): void {
    const seeds = [
      { key: 'seed_nightlight', color: 0x7b68ee, name: '夜光菇' },
      { key: 'seed_icemoss', color: 0x87ceeb, name: '冰晶苔' },
      { key: 'seed_firevine', color: 0xff4500, name: '火焰藤' },
      { key: 'seed_windbell', color: 0x98fb98, name: '风铃花' },
      { key: 'seed_crystal', color: 0xe0e0ff, name: '水晶兰' },
      { key: 'seed_rainbow', color: 0xff69b4, name: '幻彩蕨' },
    ];

    seeds.forEach((seed) => {
      const g = this.add.graphics();
      g.fillStyle(seed.color, 0.3);
      g.fillCircle(22, 22, 20);
      g.fillStyle(seed.color, 1);
      g.fillCircle(22, 22, 14);
      g.fillStyle(0xffffff, 0.4);
      g.fillCircle(18, 16, 5);
      g.generateTexture(seed.key, 44, 44);
      g.destroy();
    });
  }

  private generatePotTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(0x5c3a1e, 1);
    g.fillRoundedRect(4, 10, 112, 100, 8);
    g.lineStyle(3, 0x8b5e3c, 1);
    g.strokeRoundedRect(4, 10, 112, 100, 8);
    g.fillStyle(0x7a5230, 1);
    g.fillRoundedRect(2, 6, 116, 14, 4);
    g.lineStyle(2, 0x9b6b40, 1);
    g.strokeRoundedRect(2, 6, 116, 14, 4);
    g.generateTexture('pot', 120, 120);
    g.destroy();
  }

  private generateSoilTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(0x3e2f1b, 1);
    g.fillRect(0, 0, 108, 50);
    g.fillStyle(0x4a3728, 0.6);
    for (let i = 0; i < 12; i++) {
      const x = Phaser.Math.Between(5, 100);
      const y = Phaser.Math.Between(5, 45);
      g.fillCircle(x, y, Phaser.Math.Between(2, 5));
    }
    g.generateTexture('soil', 108, 50);
    g.destroy();
  }

  private generateParticleTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('particle', 8, 8);
    g.destroy();
  }

  private generateMagicCircleTexture(): void {
    const size = 220;
    const cx = size / 2;
    const cy = size / 2;
    const r = 90;
    const g = this.add.graphics();

    g.lineStyle(2, 0x9966ff, 0.6);
    g.strokeCircle(cx, cy, r);
    g.strokeCircle(cx, cy, r - 10);
    g.strokeCircle(cx, cy, r + 10);

    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3 - Math.PI / 2;
      const p1x = cx + Math.cos(angle) * r;
      const p1y = cy + Math.sin(angle) * r;
      const p2x = cx + Math.cos(angle + (Math.PI * 2) / 3) * r;
      const p2y = cy + Math.sin(angle + (Math.PI * 2) / 3) * r;
      const p3x = cx + Math.cos(angle + (Math.PI * 4) / 3) * r;
      const p3y = cy + Math.sin(angle + (Math.PI * 4) / 3) * r;

      g.lineStyle(2, 0xbb88ff, 0.8);
      g.beginPath();
      g.moveTo(p1x, p1y);
      g.lineTo(p2x, p2y);
      g.lineTo(p3x, p3y);
      g.closePath();
      g.strokePath();
    }

    g.fillStyle(0x6633cc, 0.15);
    g.fillCircle(cx, cy, r);

    g.generateTexture('magic_circle', size, size);
    g.destroy();
  }

  private generateButtonTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(0xc9a96e, 1);
    g.fillCircle(30, 30, 28);
    g.fillStyle(0xe8d5a0, 1);
    g.fillCircle(30, 30, 22);
    g.generateTexture('btn_circle', 60, 60);
    g.destroy();
  }

  private generateWateringCanTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(0x4488cc, 1);
    g.fillRect(4, 8, 24, 28);
    g.fillStyle(0x5599dd, 1);
    g.fillRect(0, 0, 12, 12);
    g.lineStyle(2, 0x336699, 1);
    g.beginPath();
    g.moveTo(28, 16);
    g.lineTo(40, 8);
    g.strokePath();
    g.fillStyle(0x66aaff, 1);
    g.fillCircle(40, 8, 4);
    g.generateTexture('watering_can', 44, 40);
    g.destroy();
  }

  private generatePlantStages(): void {
    const basePlants = [
      { key: 'nightlight', color: 0x7b68ee, color2: 0x9b88ff },
      { key: 'icemoss', color: 0x87ceeb, color2: 0xa0e0ff },
      { key: 'firevine', color: 0xff4500, color2: 0xff7744 },
      { key: 'windbell', color: 0x98fb98, color2: 0xb8ffb8 },
      { key: 'crystal', color: 0xe0e0ff, color2: 0xffffff },
      { key: 'rainbow', color: 0xff69b4, color2: 0xff99cc },
    ];

    basePlants.forEach((plant) => {
      this.generatePlantStage(plant.key + '_sprout', plant.color, 40, 1);
      this.generatePlantStage(plant.key + '_mature', plant.color, 80, 2);
      this.generatePlantStage(plant.key + '_seedling', plant.color, 20, 0);
    });
  }

  private generatePlantStage(key: string, color: number, height: number, stage: number): void {
    const g = this.add.graphics();
    const w = 60;

    if (stage === 0) {
      g.fillStyle(0x2a5a1a, 1);
      g.fillCircle(w / 2, 18, 8);
      g.fillStyle(color, 0.7);
      g.fillCircle(w / 2, 16, 5);
    } else {
      g.fillStyle(0x2a5a1a, 1);
      g.fillRect(w / 2 - 2, 10, 4, height);

      if (stage === 1) {
        g.fillStyle(color, 0.8);
        g.fillCircle(w / 2 - 10, height - 5, 8);
        g.fillCircle(w / 2 + 10, height - 5, 8);
        g.fillStyle(color, 0.6);
        g.fillCircle(w / 2, height - 10, 7);
      } else {
        g.fillStyle(color, 0.8);
        g.fillCircle(w / 2 - 14, height - 10, 10);
        g.fillCircle(w / 2 + 14, height - 10, 10);
        g.fillCircle(w / 2, height - 18, 12);
        g.fillStyle(color, 0.5);
        g.fillCircle(w / 2 - 8, height - 25, 7);
        g.fillCircle(w / 2 + 8, height - 25, 7);
      }
    }

    g.generateTexture(key, w, height + 20);
    g.destroy();
  }
}
