import Phaser from 'phaser';

export class StoneDoor extends Phaser.GameObjects.Container {
  private doorGraphics: Phaser.GameObjects.Graphics;
  private frameGraphics: Phaser.GameObjects.Graphics;
  private gemGraphics: Phaser.GameObjects.Graphics;
  private chamberGraphics: Phaser.GameObjects.Graphics;
  private doorWidth: number = 200;
  private doorHeight: number = 300;
  private isOpen: boolean = false;
  private isGemActivated: boolean = false;
  private gemPulseTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.frameGraphics = scene.add.graphics();
    this.chamberGraphics = scene.add.graphics();
    this.doorGraphics = scene.add.graphics();
    this.gemGraphics = scene.add.graphics();

    this.add(this.frameGraphics);
    this.add(this.chamberGraphics);
    this.add(this.doorGraphics);
    this.add(this.gemGraphics);

    this.setSize(this.doorWidth, this.doorHeight);

    this.drawFrame();
    this.drawChamber();
    this.drawDoor();
    this.drawGem();
    this.startGemPulse();

    scene.add.existing(this);
  }

  private drawFrame(): void {
    this.frameGraphics.clear();

    const w = this.doorWidth + 30;
    const h = this.doorHeight + 30;
    const halfW = w / 2;
    const halfH = h / 2;

    this.frameGraphics.fillStyle(0x5c3d1e, 1);
    this.frameGraphics.fillRoundedRect(-halfW, -halfH, w, h, 10);

    this.frameGraphics.lineStyle(3, 0x8b5a2b, 1);
    this.frameGraphics.strokeRoundedRect(-halfW, -halfH, w, h, 10);

    this.frameGraphics.fillStyle(0x8b5a2b, 1);
    this.frameGraphics.fillRect(-halfW - 5, -halfH - 10, w + 10, 20);

    this.frameGraphics.fillStyle(0x5c3d1e, 1);
    for (let i = 0; i < 6; i++) {
      const x = -halfW + 10 + i * (w - 20) / 5;
      this.frameGraphics.fillRect(x - 3, -halfH - 5, 6, 10);
    }
  }

  private drawChamber(): void {
    this.chamberGraphics.clear();

    const halfW = this.doorWidth / 2;
    const halfH = this.doorHeight / 2;

    const color1 = 0x2d1b4e;
    const color2 = 0x1a0a2e;

    this.chamberGraphics.fillGradientStyle(color1, color1, color2, color2, 1);
    this.chamberGraphics.fillRect(-halfW + 5, -halfH + 5, this.doorWidth - 10, this.doorHeight - 10);

    this.chamberGraphics.fillStyle(0x4a3f6b, 0.3);
    for (let i = 0; i < 10; i++) {
      const x = Phaser.Math.Between(-halfW + 10, halfW - 10);
      const y = Phaser.Math.Between(-halfH + 10, halfH - 10);
      const size = Phaser.Math.Between(2, 6);
      this.chamberGraphics.fillRect(x, y, size, size);
    }

    this.chamberGraphics.fillStyle(0xffd700, 0.4);
    this.chamberGraphics.beginPath();
    this.chamberGraphics.moveTo(0, -halfH + 30);
    this.chamberGraphics.lineTo(-20, -halfH + 60);
    this.chamberGraphics.lineTo(20, -halfH + 60);
    this.chamberGraphics.closePath();
    this.chamberGraphics.fillPath();

    this.chamberGraphics.fillStyle(0xffd700, 0.3);
    this.chamberGraphics.fillRect(-15, -halfH + 70, 30, 80);
  }

  private drawDoor(): void {
    this.doorGraphics.clear();

    const halfW = this.doorWidth / 2;
    const halfH = this.doorHeight / 2;

    this.doorGraphics.fillStyle(0x8b5a2b, 1);
    this.doorGraphics.fillRoundedRect(-halfW, -halfH, this.doorWidth, this.doorHeight, 5);

    this.doorGraphics.lineStyle(2, 0x6b4423, 1);
    this.doorGraphics.strokeRoundedRect(-halfW, -halfH, this.doorWidth, this.doorHeight, 5);

    this.doorGraphics.lineStyle(1, 0x6b4423, 0.5);
    for (let i = 1; i < 5; i++) {
      const y = -halfH + i * (this.doorHeight / 5);
      this.doorGraphics.beginPath();
      this.doorGraphics.moveTo(-halfW + 10, y);
      this.doorGraphics.lineTo(halfW - 10, y);
      this.doorGraphics.strokePath();
    }

    for (let i = 1; i < 3; i++) {
      const x = -halfW + i * (this.doorWidth / 3);
      this.doorGraphics.beginPath();
      this.doorGraphics.moveTo(x, -halfH + 10);
      this.doorGraphics.lineTo(x, halfH - 10);
      this.doorGraphics.strokePath();
    }

    this.drawEyeOfHorus();
    this.drawHieroglyphs();
  }

  private drawEyeOfHorus(): void {
    const centerY = -this.doorHeight * 0.15;
    const size = 40;

    this.doorGraphics.lineStyle(3, 0xffd700, 1);

    this.doorGraphics.beginPath();
    this.doorGraphics.arc(0, centerY, size, Math.PI * 0.15, Math.PI * 0.85);
    this.doorGraphics.strokePath();

    this.doorGraphics.beginPath();
    this.doorGraphics.arc(0, centerY + 5, size * 0.5, Math.PI * 0.1, Math.PI * 0.9);
    this.doorGraphics.strokePath();

    this.doorGraphics.fillStyle(0xffd700, 1);
    this.doorGraphics.beginPath();
    this.doorGraphics.arc(0, centerY + 5, size * 0.2, 0, Math.PI * 2);
    this.doorGraphics.fillPath();

    this.doorGraphics.lineStyle(2, 0xffd700, 1);
    this.doorGraphics.beginPath();
    this.doorGraphics.moveTo(-size * 0.8, centerY - size * 0.3);
    this.doorGraphics.lineTo(-size * 0.3, centerY - size * 0.1);
    this.doorGraphics.strokePath();

    this.doorGraphics.beginPath();
    this.doorGraphics.moveTo(size * 0.8, centerY - size * 0.3);
    this.doorGraphics.lineTo(size * 0.3, centerY - size * 0.1);
    this.doorGraphics.strokePath();

    this.doorGraphics.beginPath();
    this.doorGraphics.moveTo(0, centerY + size * 0.7);
    this.doorGraphics.lineTo(0, centerY + size * 1.1);
    this.doorGraphics.strokePath();

    this.doorGraphics.beginPath();
    this.doorGraphics.moveTo(-size * 0.5, centerY + size * 0.9);
    this.doorGraphics.lineTo(-size * 0.35, centerY + size * 1.1);
    this.doorGraphics.lineTo(-size * 0.15, centerY + size * 1.15);
    this.doorGraphics.lineTo(0, centerY + size * 1.1);
    this.doorGraphics.strokePath();
  }

  private drawHieroglyphs(): void {
    const y = this.doorHeight * 0.2;
    const symbolSize = 12;

    this.doorGraphics.fillStyle(0xffd700, 0.7);

    this.doorGraphics.fillRect(-60, y, symbolSize, symbolSize * 1.5);
    this.doorGraphics.fillRect(-62, y + symbolSize * 1.5, symbolSize * 1.4, symbolSize * 0.4);

    this.doorGraphics.beginPath();
    this.doorGraphics.arc(-25, y + symbolSize * 0.6, symbolSize * 0.6, 0, Math.PI * 2);
    this.doorGraphics.fillPath();
    this.doorGraphics.fillRect(-27, y + symbolSize, symbolSize * 0.4, symbolSize);

    this.doorGraphics.fillRect(10, y, symbolSize * 0.5, symbolSize * 1.5);
    this.doorGraphics.fillRect(8, y, symbolSize, symbolSize * 0.5);
    this.doorGraphics.fillRect(8, y + symbolSize, symbolSize, symbolSize * 0.5);

    this.doorGraphics.beginPath();
    this.doorGraphics.arc(50, y + symbolSize * 0.5, symbolSize * 0.5, 0, Math.PI * 2);
    this.doorGraphics.fillPath();
    this.doorGraphics.fillRect(48, y + symbolSize * 0.8, symbolSize * 0.4, symbolSize);

    const y2 = y + symbolSize * 2.5;

    this.doorGraphics.fillRect(-60, y2, symbolSize * 1.2, symbolSize * 0.5);
    this.doorGraphics.fillRect(-58, y2 + symbolSize * 0.5, symbolSize * 0.4, symbolSize);

    this.doorGraphics.beginPath();
    this.doorGraphics.moveTo(-25, y2 + symbolSize);
    this.doorGraphics.lineTo(-30, y2);
    this.doorGraphics.lineTo(-20, y2);
    this.doorGraphics.closePath();
    this.doorGraphics.fillPath();

    this.doorGraphics.fillRect(10, y2, symbolSize * 0.4, symbolSize * 1.3);
    this.doorGraphics.fillRect(5, y2 + symbolSize * 0.4, symbolSize, symbolSize * 0.5);

    this.doorGraphics.beginPath();
    this.doorGraphics.arc(50, y2 + symbolSize * 0.6, symbolSize * 0.6, 0, Math.PI * 2);
    this.doorGraphics.fillPath();
  }

  private drawGem(): void {
    this.gemGraphics.clear();

    const gemY = -this.doorHeight / 2 - 20;
    const gemRadius = 8;

    this.gemGraphics.fillStyle(0x8b0000, 1);
    this.gemGraphics.beginPath();
    this.gemGraphics.arc(0, gemY, gemRadius, 0, Math.PI * 2);
    this.gemGraphics.fillPath();

    this.gemGraphics.fillStyle(0xff4444, 0.7);
    this.gemGraphics.beginPath();
    this.gemGraphics.arc(-2, gemY - 2, gemRadius * 0.4, 0, Math.PI * 2);
    this.gemGraphics.fillPath();

    this.gemGraphics.lineStyle(2, 0xffaaaa, 0.8);
    this.gemGraphics.beginPath();
    this.gemGraphics.arc(0, gemY, gemRadius, 0, Math.PI * 2);
    this.gemGraphics.strokePath();

    const slotY = -this.doorHeight / 2 - 5;
    this.gemGraphics.fillStyle(0x5c3d1e, 1);
    this.gemGraphics.fillRoundedRect(-gemRadius - 3, slotY, (gemRadius + 3) * 2, 10, 3);
  }

  private startGemPulse(): void {
    if (this.gemPulseTween) {
      this.gemPulseTween.remove();
    }

    this.gemPulseTween = this.scene.tweens.add({
      targets: { scale: 1 },
      scale: 1.2,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: Phaser.Math.Easing.Sine.InOut,
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        const scale = tween.getValue() as number;
        this.gemGraphics.setScale(scale);
      }
    });
  }

  public open(duration: number = 2000): Promise<void> {
    return new Promise((resolve) => {
      if (this.isOpen) {
        resolve();
        return;
      }

      this.isOpen = true;
      this.activateGem();

      this.scene.tweens.add({
        targets: this.doorGraphics,
        y: -this.doorHeight,
        duration,
        ease: Phaser.Math.Easing.Quadratic.InOut,
        onComplete: () => {
          resolve();
        }
      });
    });
  }

  public close(duration: number = 1000): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isOpen) {
        resolve();
        return;
      }

      this.isOpen = false;
      this.deactivateGem();

      this.scene.tweens.add({
        targets: this.doorGraphics,
        y: 0,
        duration,
        ease: Phaser.Math.Easing.Quadratic.InOut,
        onComplete: () => {
          resolve();
        }
      });
    });
  }

  public activateGem(): void {
    this.isGemActivated = true;

    const gemY = -this.doorHeight / 2 - 20;
    const gemRadius = 8;

    this.gemGraphics.clear();

    this.gemGraphics.fillStyle(0xff0000, 1);
    this.gemGraphics.beginPath();
    this.gemGraphics.arc(0, gemY, gemRadius, 0, Math.PI * 2);
    this.gemGraphics.fillPath();

    this.gemGraphics.fillStyle(0xffff88, 0.9);
    this.gemGraphics.beginPath();
    this.gemGraphics.arc(-2, gemY - 2, gemRadius * 0.5, 0, Math.PI * 2);
    this.gemGraphics.fillPath();

    if (this.gemPulseTween) {
      this.gemPulseTween.remove();
    }

    this.gemPulseTween = this.scene.tweens.add({
      targets: { scale: 1 },
      scale: 1.5,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: Phaser.Math.Easing.Sine.InOut,
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        const scale = tween.getValue() as number;
        this.gemGraphics.setScale(scale);
      }
    });
  }

  public deactivateGem(): void {
    this.isGemActivated = false;
    this.drawGem();
    this.startGemPulse();
  }

  public getDoorBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x,
      y: this.y,
      width: this.doorWidth,
      height: this.doorHeight
    };
  }

  public getGemPosition(): { x: number; y: number } {
    return {
      x: this.x,
      y: this.y - this.doorHeight / 2 - 20
    };
  }

  public getGemRadius(): number {
    return 8;
  }

  public reset(): void {
    if (this.isOpen) {
      this.close(0);
    }
    this.deactivateGem();
  }

  public setScaleSize(scale: number): void {
    this.doorWidth = 200 * scale;
    this.doorHeight = 300 * scale;
    this.setSize(this.doorWidth, this.doorHeight);
    this.drawFrame();
    this.drawChamber();
    this.drawDoor();
    this.drawGem();
  }
}
