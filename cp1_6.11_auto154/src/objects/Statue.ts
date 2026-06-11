import Phaser from 'phaser';
import { StatueType } from '../utils/PuzzleGenerator';

export class Statue extends Phaser.GameObjects.Container {
  private statueType: StatueType;
  private rotationIndex: number;
  private statueGraphics: Phaser.GameObjects.Graphics;
  private mirrorGraphics: Phaser.GameObjects.Graphics;
  private glowGraphics: Phaser.GameObjects.Graphics;
  private baseSize: number = 60;
  private isHovered: boolean = false;
  private isRotating: boolean = false;
  private onClickCallback: (() => void) | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, type: StatueType, rotation: number = 0) {
    super(scene, x, y);

    this.statueType = type;
    this.rotationIndex = rotation;

    this.glowGraphics = scene.add.graphics();
    this.statueGraphics = scene.add.graphics();
    this.mirrorGraphics = scene.add.graphics();

    this.add(this.glowGraphics);
    this.add(this.statueGraphics);
    this.add(this.mirrorGraphics);

    this.setSize(this.baseSize, this.baseSize);
    this.setInteractive();

    this.on('pointerover', () => {
      this.isHovered = true;
      this.updateGlow();
    });

    this.on('pointerout', () => {
      this.isHovered = false;
      this.updateGlow();
    });

    this.on('pointerdown', () => {
      if (!this.isRotating) {
        this.rotate();
      }
    });

    this.draw();
    this.updateGlow();
    scene.add.existing(this);
  }

  private draw(): void {
    this.statueGraphics.clear();
    this.mirrorGraphics.clear();

    const size = this.baseSize;
    const half = size / 2;

    const colors = this.getStatueColors();

    this.statueGraphics.fillStyle(colors.base, 1);
    this.statueGraphics.fillRoundedRect(-half, -half, size, size, 8);

    this.statueGraphics.lineStyle(2, colors.border, 1);
    this.statueGraphics.strokeRoundedRect(-half, -half, size, size, 8);

    this.drawStatueHead(colors);
    this.drawHieroglyphs(colors);
    this.drawMirror();
  }

  private getStatueColors(): { base: number; border: number; accent: number; eye: number } {
    switch (this.statueType) {
      case StatueType.HORUS:
        return { base: 0x1a5f7a, border: 0x0d3b4d, accent: 0xffd700, eye: 0xff6b6b };
      case StatueType.ANUBIS:
        return { base: 0x2d2d2d, border: 0x1a1a1a, accent: 0xffd700, eye: 0xffd700 };
      case StatueType.SET:
        return { base: 0x6b3fa0, border: 0x4a2a70, accent: 0xff6b6b, eye: 0xffd700 };
      default:
        return { base: 0x8b5a2b, border: 0x5c3d1e, accent: 0xffd700, eye: 0xffffff };
    }
  }

  private drawStatueHead(colors: { base: number; border: number; accent: number; eye: number }): void {
    const headSize = this.baseSize * 0.35;
    const headY = -this.baseSize * 0.25;

    this.statueGraphics.fillStyle(colors.base, 1);
    this.statueGraphics.beginPath();
    this.statueGraphics.arc(0, headY, headSize, 0, Math.PI * 2);
    this.statueGraphics.fillPath();

    this.statueGraphics.lineStyle(2, colors.border, 1);
    this.statueGraphics.beginPath();
    this.statueGraphics.arc(0, headY, headSize, 0, Math.PI * 2);
    this.statueGraphics.strokePath();

    const eyeY = headY - 2;
    const eyeSize = headSize * 0.2;

    this.statueGraphics.fillStyle(colors.eye, 1);
    this.statueGraphics.fillRect(-headSize * 0.35, eyeY - eyeSize / 2, eyeSize, eyeSize);
    this.statueGraphics.fillRect(headSize * 0.15, eyeY - eyeSize / 2, eyeSize, eyeSize);

    this.drawHeaddress(colors, headSize, headY);
  }

  private drawHeaddress(colors: { base: number; border: number; accent: number; eye: number }, headSize: number, headY: number): void {
    if (this.statueType === StatueType.HORUS) {
      this.statueGraphics.fillStyle(0x1a5f7a, 1);
      this.statueGraphics.beginPath();
      this.statueGraphics.moveTo(-headSize * 0.8, headY - headSize * 0.3);
      this.statueGraphics.lineTo(-headSize * 0.4, headY - headSize * 0.8);
      this.statueGraphics.lineTo(-headSize * 0.3, headY - headSize * 0.3);
      this.statueGraphics.closePath();
      this.statueGraphics.fillPath();

      this.statueGraphics.beginPath();
      this.statueGraphics.moveTo(headSize * 0.8, headY - headSize * 0.3);
      this.statueGraphics.lineTo(headSize * 0.4, headY - headSize * 0.8);
      this.statueGraphics.lineTo(headSize * 0.3, headY - headSize * 0.3);
      this.statueGraphics.closePath();
      this.statueGraphics.fillPath();
    } else if (this.statueType === StatueType.ANUBIS) {
      this.statueGraphics.fillStyle(0x2d2d2d, 1);
      this.statueGraphics.beginPath();
      this.statueGraphics.moveTo(-headSize * 0.6, headY - headSize * 0.9);
      this.statueGraphics.lineTo(-headSize * 0.3, headY - headSize * 0.5);
      this.statueGraphics.lineTo(-headSize * 0.2, headY - headSize * 0.9);
      this.statueGraphics.closePath();
      this.statueGraphics.fillPath();

      this.statueGraphics.beginPath();
      this.statueGraphics.moveTo(headSize * 0.6, headY - headSize * 0.9);
      this.statueGraphics.lineTo(headSize * 0.3, headY - headSize * 0.5);
      this.statueGraphics.lineTo(headSize * 0.2, headY - headSize * 0.9);
      this.statueGraphics.closePath();
      this.statueGraphics.fillPath();
    }

    this.statueGraphics.fillStyle(colors.accent, 1);
    this.statueGraphics.fillRect(-headSize * 0.6, headY + headSize * 0.5, headSize * 1.2, 4);
  }

  private drawHieroglyphs(colors: { base: number; border: number; accent: number; eye: number }): void {
    const y = this.baseSize * 0.15;
    const size = 6;

    this.statueGraphics.fillStyle(colors.accent, 0.8);

    this.statueGraphics.fillRect(-size * 1.5, y, size, size * 1.5);
    this.statueGraphics.fillRect(-size * 1.5, y + size * 1.5, size * 3, size * 0.5);

    this.statueGraphics.beginPath();
    this.statueGraphics.arc(size * 1.5, y + size * 0.5, size * 0.5, 0, Math.PI * 2);
    this.statueGraphics.fillPath();
    this.statueGraphics.fillRect(size * 1.3, y + size * 0.8, size * 0.4, size * 1.2);
  }

  private drawMirror(): void {
    this.mirrorGraphics.clear();

    const size = this.baseSize * 0.8;
    const half = size / 2;

    const isSlash = this.rotationIndex % 2 === 0;

    this.mirrorGraphics.lineStyle(4, 0xc0c0c0, 1);
    this.mirrorGraphics.beginPath();

    if (isSlash) {
      this.mirrorGraphics.moveTo(-half, half);
      this.mirrorGraphics.lineTo(half, -half);
    } else {
      this.mirrorGraphics.moveTo(-half, -half);
      this.mirrorGraphics.lineTo(half, half);
    }

    this.mirrorGraphics.strokePath();

    this.mirrorGraphics.lineStyle(2, 0xffd700, 0.8);
    this.mirrorGraphics.beginPath();

    if (isSlash) {
      this.mirrorGraphics.moveTo(-half + 2, half - 2);
      this.mirrorGraphics.lineTo(half - 2, -half + 2);
    } else {
      this.mirrorGraphics.moveTo(-half + 2, -half + 2);
      this.mirrorGraphics.lineTo(half - 2, half - 2);
    }

    this.mirrorGraphics.strokePath();
  }

  private updateGlow(): void {
    this.glowGraphics.clear();

    if (this.isHovered) {
      const size = this.baseSize + 10;
      const half = size / 2;

      this.glowGraphics.lineStyle(3, 0xffd700, 0.6);
      this.glowGraphics.strokeRoundedRect(-half, -half, size, size, 10);

      this.glowGraphics.lineStyle(6, 0xffd700, 0.3);
      this.glowGraphics.strokeRoundedRect(-half - 2, -half - 2, size + 4, size + 4, 12);
    }
  }

  public rotate(): void {
    if (this.isRotating) return;

    this.isRotating = true;

    this.scene.tweens.add({
      targets: { rotation: this.rotationIndex },
      rotation: this.rotationIndex + 1,
      duration: 200,
      ease: Phaser.Math.Easing.Quadratic.InOut,
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        const value = tween.getValue() as number;
        const visualRotation = (value * Math.PI) / 2;
        this.mirrorGraphics.setRotation(visualRotation);
      },
      onComplete: () => {
        this.rotationIndex = (this.rotationIndex + 1) % 4;
        this.mirrorGraphics.setRotation(0);
        this.drawMirror();
        this.isRotating = false;

        if (this.onClickCallback) {
          this.onClickCallback();
        }
      }
    });
  }

  public setOnClickCallback(callback: () => void): void {
    this.onClickCallback = callback;
  }

  public getRotation(): number {
    return this.rotationIndex;
  }

  public setRotationIndex(rotation: number): void {
    this.rotationIndex = rotation % 4;
    this.drawMirror();
  }

  public getType(): StatueType {
    return this.statueType;
  }

  public getSize(): number {
    return this.baseSize;
  }

  public setScaleSize(scale: number): void {
    this.baseSize = 60 * scale;
    this.setSize(this.baseSize, this.baseSize);
    this.draw();
    this.updateGlow();
  }
}
