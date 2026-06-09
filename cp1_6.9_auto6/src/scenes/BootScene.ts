import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.createTextures();
  }

  private createTextures(): void {
    this.createCopperWallTexture();
    this.createStoneFloorTexture();
    this.createGearTexture();
    this.createPlayerTexture();
    this.createDroneTexture();
    this.createEnergyCoreTexture();
    this.createLaserTexture();
    this.createParticleTextures();
  }

  private createCopperWallTexture(): void {
    const g = this.add.graphics();
    const w = 64;
    const h = 64;
    g.fillStyle(0x8b4513, 1);
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      const x = Phaser.Math.Between(0, w);
      const y = Phaser.Math.Between(0, h);
      g.fillStyle(0x6b3410, 0.5);
      g.fillCircle(x, y, Phaser.Math.Between(2, 6));
    }
    for (let i = 0; i < 4; i++) {
      const x = Phaser.Math.Between(0, w - 4);
      const y = Phaser.Math.Between(0, h - 4);
      g.fillStyle(0xcd7f32, 0.6);
      g.fillCircle(x, y, 2);
    }
    g.lineStyle(2, 0x4a2410, 1);
    g.strokeRect(0, 0, w, h);
    g.generateTexture('copperWall', w, h);
    g.destroy();
  }

  private createStoneFloorTexture(): void {
    const g = this.add.graphics();
    const w = 64;
    const h = 64;
    g.fillStyle(0x3d2817, 1);
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) {
      const x = Phaser.Math.Between(0, w);
      const y = Phaser.Math.Between(0, h);
      g.fillStyle(0x2a1a0f, 0.4);
      g.fillCircle(x, y, Phaser.Math.Between(4, 10));
    }
    for (let i = 0; i < 10; i++) {
      const x = Phaser.Math.Between(0, w);
      const y = Phaser.Math.Between(0, h);
      g.fillStyle(0x5a3a22, 0.3);
      g.fillCircle(x, y, Phaser.Math.Between(1, 3));
    }
    g.generateTexture('stoneFloor', w, h);
    g.destroy();
  }

  private createGearTexture(): void {
    const g = this.add.graphics();
    const cx = 32;
    const cy = 32;
    const outerR = 28;
    const innerR = 14;
    const teeth = 12;
    g.fillStyle(0xd4a574, 1);
    for (let i = 0; i < teeth; i++) {
      const angle = (i / teeth) * Math.PI * 2;
      const x1 = cx + Math.cos(angle) * innerR;
      const y1 = cy + Math.sin(angle) * innerR;
      const x2 = cx + Math.cos(angle) * outerR;
      const y2 = cy + Math.sin(angle) * outerR;
      g.lineStyle(8, 0xd4a574, 1);
      g.lineBetween(x1, y1, x2, y2);
    }
    g.fillStyle(0xb8864a, 1);
    g.fillCircle(cx, cy, innerR);
    g.fillStyle(0x6b4423, 1);
    g.fillCircle(cx, cy, 6);
    g.generateTexture('gearIcon', 64, 64);
    g.destroy();
  }

  private createPlayerTexture(): void {
    const g = this.add.graphics();
    g.lineStyle(2, 0xd4a574, 1);
    g.fillStyle(0x8b4513, 1);
    g.beginPath();
    g.moveTo(0, -20);
    g.lineTo(16, 10);
    g.lineTo(8, 14);
    g.lineTo(-8, 14);
    g.lineTo(-16, 10);
    g.closePath();
    g.fillPath();
    g.strokePath();
    g.fillStyle(0xff6b35, 0.8);
    g.fillCircle(0, -6, 6);
    g.fillStyle(0xffd700, 0.9);
    g.fillCircle(0, -6, 3);
    g.fillStyle(0x6b3410, 1);
    g.fillCircle(-10, 14, 4);
    g.fillCircle(10, 14, 4);
    g.fillStyle(0xd4a574, 1);
    g.fillCircle(-10, 14, 2);
    g.fillCircle(10, 14, 2);
    g.generateTexture('playerShip', 64, 64);
    g.destroy();
  }

  private createDroneTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(0x4a2020, 1);
    g.lineStyle(2, 0xff4444, 1);
    g.fillCircle(0, 0, 18);
    g.strokeCircle(0, 0, 18);
    g.fillStyle(0x2a1010, 1);
    g.fillCircle(0, 0, 12);
    g.fillStyle(0xff0000, 1);
    g.fillCircle(0, 0, 6);
    g.fillStyle(0xff6666, 1);
    g.fillCircle(0, 0, 3);
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      g.fillStyle(0x6b3410, 1);
      g.fillCircle(Math.cos(angle) * 18, Math.sin(angle) * 18, 4);
    }
    g.generateTexture('drone', 64, 64);
    g.destroy();
  }

  private createEnergyCoreTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(0xffd700, 0.3);
    g.fillCircle(0, 0, 22);
    g.fillStyle(0xffa500, 0.6);
    g.fillCircle(0, 0, 16);
    g.fillStyle(0xffd700, 1);
    g.fillCircle(0, 0, 10);
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(-3, -3, 4);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      g.fillStyle(0xffa500, 0.7);
      g.fillCircle(Math.cos(angle) * 20, Math.sin(angle) * 20, 2);
    }
    g.generateTexture('energyCore', 64, 64);
    g.destroy();
  }

  private createLaserTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(0xff0000, 1);
    g.fillRect(0, 0, 64, 8);
    g.fillStyle(0xff6666, 0.8);
    g.fillRect(0, 2, 64, 4);
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(0, 3, 64, 2);
    g.generateTexture('laserBeam', 64, 8);
    g.destroy();

    const g2 = this.add.graphics();
    g2.fillStyle(0x6b3410, 1);
    g2.fillRect(0, 0, 16, 32);
    g2.fillStyle(0xd4a574, 1);
    g2.fillRect(2, 2, 12, 28);
    g2.fillStyle(0x4a2010, 1);
    g2.fillRect(4, 12, 8, 8);
    g2.generateTexture('laserEmitter', 16, 32);
    g2.destroy();
  }

  private createParticleTextures(): void {
    const g = this.add.graphics();
    g.fillStyle(0xff8c00, 1);
    g.fillCircle(0, 0, 4);
    g.fillStyle(0xffd700, 0.7);
    g.fillCircle(0, 0, 2);
    g.generateTexture('trailParticle', 8, 8);
    g.destroy();

    const g2 = this.add.graphics();
    g2.fillStyle(0xffd700, 1);
    g2.fillCircle(0, 0, 6);
    g2.fillStyle(0xffffff, 0.8);
    g2.fillCircle(0, 0, 3);
    g2.generateTexture('explosionParticle', 12, 12);
    g2.destroy();

    const g3 = this.add.graphics();
    g3.fillStyle(0xff4444, 1);
    g3.fillCircle(0, 0, 5);
    g3.fillStyle(0xffaaaa, 0.6);
    g3.fillCircle(0, 0, 2);
    g3.generateTexture('sparkParticle', 10, 10);
    g3.destroy();
  }

  create(): void {
    this.scene.start('GameScene');
  }
}
