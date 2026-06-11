import Phaser from 'phaser';

export class Scarab extends Phaser.GameObjects.Container {
  private rotationIndex: number;
  private bodyGraphics: Phaser.GameObjects.Graphics;
  private mirrorGraphics: Phaser.GameObjects.Graphics;
  private glowGraphics: Phaser.GameObjects.Graphics;
  private baseSize: number = 50;
  private isHovered: boolean = false;
  private isRotating: boolean = false;
  private onClickCallback: (() => void) | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, rotation: number = 0) {
    super(scene, x, y);

    this.rotationIndex = rotation;

    this.glowGraphics = scene.add.graphics();
    this.bodyGraphics = scene.add.graphics();
    this.mirrorGraphics = scene.add.graphics();

    this.add(this.glowGraphics);
    this.add(this.bodyGraphics);
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
    this.bodyGraphics.clear();
    this.mirrorGraphics.clear();

    this.drawScarabBody();
    this.drawMirror();
  }

  private drawEllipse(g: Phaser.GameObjects.Graphics, cx: number, cy: number, rx: number, ry: number): void {
    const steps = 32;
    g.beginPath();
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const x = cx + Math.cos(angle) * rx;
      const y = cy + Math.sin(angle) * ry;
      if (i === 0) {
        g.moveTo(x, y);
      } else {
        g.lineTo(x, y);
      }
    }
    g.closePath();
  }

  private drawScarabBody(): void {
    const size = this.baseSize;
    const half = size / 2;

    this.bodyGraphics.fillStyle(0x1a472a, 1);
    this.drawEllipse(this.bodyGraphics, 0, 0, half * 0.8, half * 0.95);
    this.bodyGraphics.fillPath();

    this.bodyGraphics.lineStyle(2, 0x0d2818, 1);
    this.drawEllipse(this.bodyGraphics, 0, 0, half * 0.8, half * 0.95);
    this.bodyGraphics.strokePath();

    this.bodyGraphics.fillStyle(0x0d2818, 1);
    this.drawEllipse(this.bodyGraphics, 0, -half * 0.6, half * 0.5, half * 0.35);
    this.bodyGraphics.fillPath();

    this.bodyGraphics.fillStyle(0xffd700, 1);
    this.bodyGraphics.fillRect(-half * 0.3, -half * 0.65, 3, 3);
    this.bodyGraphics.fillRect(half * 0.2, -half * 0.65, 3, 3);

    this.bodyGraphics.lineStyle(2, 0x0d2818, 0.7);
    this.bodyGraphics.beginPath();
    this.bodyGraphics.moveTo(0, -half * 0.3);
    this.bodyGraphics.lineTo(0, half * 0.7);
    this.bodyGraphics.strokePath();

    this.bodyGraphics.lineStyle(1.5, 0x2d6a4f, 0.8);
    for (let i = 0; i < 3; i++) {
      const yOffset = -half * 0.1 + i * half * 0.3;
      this.bodyGraphics.beginPath();
      this.bodyGraphics.moveTo(-half * 0.6, yOffset);
      this.bodyGraphics.lineTo(-half * 0.3, yOffset - 5);
      this.bodyGraphics.lineTo(0, yOffset - 3);
      this.bodyGraphics.lineTo(half * 0.3, yOffset - 5);
      this.bodyGraphics.lineTo(half * 0.6, yOffset);
      this.bodyGraphics.strokePath();
    }

    this.bodyGraphics.fillStyle(0xffd700, 0.9);
    this.bodyGraphics.beginPath();
    this.bodyGraphics.arc(0, 0, 4, 0, Math.PI * 2);
    this.bodyGraphics.fillPath();
  }

  private drawMirror(): void {
    this.mirrorGraphics.clear();

    const size = this.baseSize * 0.7;
    const half = size / 2;

    const isSlash = this.rotationIndex % 2 === 0;

    this.mirrorGraphics.lineStyle(3, 0x00ff88, 1);
    this.mirrorGraphics.beginPath();

    if (isSlash) {
      this.mirrorGraphics.moveTo(-half, half);
      this.mirrorGraphics.lineTo(half, -half);
    } else {
      this.mirrorGraphics.moveTo(-half, -half);
      this.mirrorGraphics.lineTo(half, half);
    }

    this.mirrorGraphics.strokePath();

    this.mirrorGraphics.lineStyle(1.5, 0x88ffcc, 0.8);
    this.mirrorGraphics.beginPath();

    if (isSlash) {
      this.mirrorGraphics.moveTo(-half + 1, half - 1);
      this.mirrorGraphics.lineTo(half - 1, -half + 1);
    } else {
      this.mirrorGraphics.moveTo(-half + 1, -half + 1);
      this.mirrorGraphics.lineTo(half - 1, half - 1);
    }

    this.mirrorGraphics.strokePath();
  }

  private updateGlow(): void {
    this.glowGraphics.clear();

    if (this.isHovered) {
      const size = this.baseSize + 10;
      const half = size / 2;

      this.glowGraphics.lineStyle(3, 0x00ff88, 0.6);
      this.drawEllipse(this.glowGraphics, 0, 0, half * 0.85, half);
      this.glowGraphics.strokePath();

      this.glowGraphics.lineStyle(6, 0x00ff88, 0.3);
      this.drawEllipse(this.glowGraphics, 0, 0, half * 0.95, half * 1.1);
      this.glowGraphics.strokePath();
    }
  }

  public rotate(): void {
    if (this.isRotating) return;

    this.isRotating = true;

    this.scene.tweens.add({
      targets: { rotation: this.rotationIndex },
      rotation: this.rotationIndex + 2,
      duration: 300,
      ease: Phaser.Math.Easing.Quadratic.InOut,
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        const value = tween.getValue() as number;
        const visualRotation = (value * Math.PI) / 2;
        this.mirrorGraphics.rotation = visualRotation;
        this.bodyGraphics.rotation = visualRotation;
      },
      onComplete: () => {
        this.rotationIndex = (this.rotationIndex + 2) % 4;
        this.mirrorGraphics.rotation = 0;
        this.bodyGraphics.rotation = 0;
        this.draw();
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

  public getSize(): number {
    return this.baseSize;
  }

  public setScaleSize(scale: number): void {
    this.baseSize = 50 * scale;
    this.setSize(this.baseSize, this.baseSize);
    this.draw();
    this.updateGlow();
  }
}
