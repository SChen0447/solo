import Phaser from 'phaser';

export type CollectibleType = 'pearl' | 'rune';

export default class Collectible extends Phaser.Physics.Arcade.Sprite {
  private collectibleType: CollectibleType;
  private collectibleGraphics!: Phaser.GameObjects.Graphics;
  private glowGraphics!: Phaser.GameObjects.Graphics;
  private isCollected: boolean = false;
  private collectAnimTime: number = 0;
  private collectAnimDuration: number = 200;
  private floatTime: number = 0;
  private baseY: number = 0;
  private scoreValue: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, type: CollectibleType) {
    super(scene, x, y, 'collectible');

    this.collectibleType = type;
    this.baseY = y;
    this.scoreValue = type === 'pearl' ? 1 : 2;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setBodySize(24, 24, true);
    this.setOffset(12, 12);

    this.createGraphics();
  }

  private createGraphics(): void {
    this.collectibleGraphics = this.scene.add.graphics();
    this.glowGraphics = this.scene.add.graphics();
    this.drawCollectible(1, false);
  }

  private drawCollectible(scale: number, withFlash: boolean): void {
    this.collectibleGraphics.clear();
    this.glowGraphics.clear();

    const x = this.x;
    const y = this.y;

    if (this.collectibleType === 'pearl') {
      if (withFlash) {
        this.glowGraphics.fillStyle(0xffffff, 0.8);
        this.glowGraphics.beginPath();
        this.glowGraphics.arc(x, y, 18 * scale, 0, Math.PI * 2);
        this.glowGraphics.fillPath();
      }

      this.collectibleGraphics.fillStyle(0xffdd88, 1);
      this.collectibleGraphics.beginPath();
      this.collectibleGraphics.arc(x, y, 6 * scale, 0, Math.PI * 2);
      this.collectibleGraphics.fillPath();

      this.collectibleGraphics.fillStyle(0xffffff, 0.6);
      this.collectibleGraphics.beginPath();
      this.collectibleGraphics.arc(x - 2 * scale, y - 2 * scale, 2 * scale, 0, Math.PI * 2);
      this.collectibleGraphics.fillPath();
    } else {
      if (withFlash) {
        this.glowGraphics.fillStyle(0xffffff, 0.8);
        this.glowGraphics.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
          const px = x + Math.cos(angle) * 18 * scale;
          const py = y + Math.sin(angle) * 18 * scale;
          if (i === 0) {
            this.glowGraphics.moveTo(px, py);
          } else {
            this.glowGraphics.lineTo(px, py);
          }
        }
        this.glowGraphics.closePath();
        this.glowGraphics.fillPath();
      }

      this.collectibleGraphics.fillStyle(0x88ddff, 1);
      this.collectibleGraphics.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const px = x + Math.cos(angle) * 8 * scale;
        const py = y + Math.sin(angle) * 8 * scale;
        if (i === 0) {
          this.collectibleGraphics.moveTo(px, py);
        } else {
          this.collectibleGraphics.lineTo(px, py);
        }
      }
      this.collectibleGraphics.closePath();
      this.collectibleGraphics.fillPath();

      this.collectibleGraphics.fillStyle(0xffffff, 0.5);
      this.collectibleGraphics.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const px = x + Math.cos(angle) * 4 * scale;
        const py = y + Math.sin(angle) * 4 * scale;
        if (i === 0) {
          this.collectibleGraphics.moveTo(px, py);
        } else {
          this.collectibleGraphics.lineTo(px, py);
        }
      }
      this.collectibleGraphics.closePath();
      this.collectibleGraphics.fillPath();
    }
  }

  update(time: number, delta: number): void {
    if (this.isCollected) {
      this.collectAnimTime += delta;
      const progress = this.collectAnimTime / this.collectAnimDuration;

      if (progress < 0.5) {
        const scale = 1 + progress * 2 * 0.5;
        this.drawCollectible(scale, false);
      } else {
        const scale = 1.5 - (progress - 0.5) * 2 * 0.5;
        const flash = progress < 0.75;
        this.drawCollectible(scale, flash);
      }

      if (this.collectAnimTime >= this.collectAnimDuration) {
        this.destroy();
      }
      return;
    }

    this.floatTime += delta / 1000;
    const floatOffset = Math.sin(this.floatTime * 2 * Math.PI) * 5;
    this.y = this.baseY + floatOffset;

    this.drawCollectible(1, false);
    this.collectibleGraphics.setX(this.x - this.x);
    this.collectibleGraphics.setY(this.y - this.y);
    this.collectibleGraphics.setX(this.x);
    this.collectibleGraphics.setY(this.y);
    this.glowGraphics.setX(this.x - this.x);
    this.glowGraphics.setY(this.y - this.y);
    this.glowGraphics.setX(this.x);
    this.glowGraphics.setY(this.y);
  }

  collect(): { collected: boolean; score: number; type: CollectibleType } {
    if (this.isCollected) {
      return { collected: false, score: 0, type: this.collectibleType };
    }
    this.isCollected = true;
    this.collectAnimTime = 0;
    this.disableBody(true, false);
    return { collected: true, score: this.scoreValue, type: this.collectibleType };
  }

  getType(): CollectibleType {
    return this.collectibleType;
  }

  destroy(fromScene?: boolean): void {
    if (this.collectibleGraphics) this.collectibleGraphics.destroy();
    if (this.glowGraphics) this.glowGraphics.destroy();
    super.destroy(fromScene);
  }
}
