import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  private turtleContainer!: Phaser.GameObjects.Container;
  private turtleGraphics!: Phaser.GameObjects.Graphics;
  private loadText!: Phaser.GameObjects.Text;

  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.createBackground();
    this.createTurtle();
    this.createLoadText();
  }

  create(): void {
    this.startTurtleAnimation();
  }

  private createBackground(): void {
    const graphics = this.add.graphics();
    const height = this.scale.height;
    const width = this.scale.width;

    for (let y = 0; y < height; y += 2) {
      const t = y / height;
      const r = Math.floor(11 + t * 2);
      const g = Math.floor(26 + t * 17);
      const b = Math.floor(43 + t * 26);
      const color = Phaser.Display.Color.GetColor(r, g, b);
      graphics.fillStyle(color, 1);
      graphics.fillRect(0, y, width, 2);
    }
  }

  private createTurtle(): void {
    this.turtleContainer = this.add.container(
      this.scale.width / 2,
      this.scale.height / 2
    );

    this.turtleGraphics = this.add.graphics();
    this.drawTurtle(1);
    this.turtleContainer.add(this.turtleGraphics);
  }

  private drawTurtle(scale: number): void {
    this.turtleGraphics.clear();

    const s = scale;

    this.turtleGraphics.fillStyle(0x4a7c59, 1);
    this.turtleGraphics.beginPath();
    this.drawEllipse(this.turtleGraphics, 0, 0, 40 * s, 30 * s);
    this.turtleGraphics.fill();

    this.turtleGraphics.fillStyle(0x3d6b4a, 1);
    for (let i = -2; i <= 2; i++) {
      this.turtleGraphics.beginPath();
      this.drawEllipse(this.turtleGraphics, i * 12 * s, -5 * s, 8 * s, 6 * s);
      this.turtleGraphics.fill();
    }

    this.turtleGraphics.fillStyle(0x5b9a6e, 1);
    this.turtleGraphics.beginPath();
    this.drawEllipse(this.turtleGraphics, 35 * s, 0, 15 * s, 12 * s);
    this.turtleGraphics.fill();

    this.turtleGraphics.fillStyle(0xffffff, 1);
    this.turtleGraphics.fillCircle(40 * s, -3 * s, 3 * s);
    this.turtleGraphics.fillStyle(0x000000, 1);
    this.turtleGraphics.fillCircle(41 * s, -3 * s, 1.5 * s);

    this.turtleGraphics.fillStyle(0x4a7c59, 1);
    this.turtleGraphics.beginPath();
    this.turtleGraphics.moveTo(25 * s, -25 * s);
    this.turtleGraphics.lineTo(15 * s, -35 * s);
    this.turtleGraphics.lineTo(35 * s, -30 * s);
    this.turtleGraphics.closePath();
    this.turtleGraphics.fill();

    this.turtleGraphics.beginPath();
    this.turtleGraphics.moveTo(25 * s, 25 * s);
    this.turtleGraphics.lineTo(15 * s, 35 * s);
    this.turtleGraphics.lineTo(35 * s, 30 * s);
    this.turtleGraphics.closePath();
    this.turtleGraphics.fill();

    this.turtleGraphics.beginPath();
    this.turtleGraphics.moveTo(-25 * s, -20 * s);
    this.turtleGraphics.lineTo(-35 * s, -28 * s);
    this.turtleGraphics.lineTo(-20 * s, -28 * s);
    this.turtleGraphics.closePath();
    this.turtleGraphics.fill();

    this.turtleGraphics.beginPath();
    this.turtleGraphics.moveTo(-25 * s, 20 * s);
    this.turtleGraphics.lineTo(-35 * s, 28 * s);
    this.turtleGraphics.lineTo(-20 * s, 28 * s);
    this.turtleGraphics.closePath();
    this.turtleGraphics.fill();
  }

  private drawEllipse(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    radiusX: number,
    radiusY: number
  ): void {
    const steps = 32;
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const px = x + Math.cos(angle) * radiusX;
      const py = y + Math.sin(angle) * radiusY;
      if (i === 0) {
        graphics.moveTo(px, py);
      } else {
        graphics.lineTo(px, py);
      }
    }
  }

  private createLoadText(): void {
    this.loadText = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 + 80,
      '正在探索深海...',
      {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#5bbaff'
      }
    ).setOrigin(0.5);
  }

  private startTurtleAnimation(): void {
    const startX = -100;
    const endX = this.scale.width + 100;
    const centerY = this.scale.height / 2;
    const amplitude = 80;

    this.tweens.add({
      targets: this.turtleContainer,
      x: { from: startX, to: endX },
      duration: 2000,
      ease: 'Linear',
      onUpdate: (tween) => {
        const progress = tween.progress;
        const yOffset = Math.sin(progress * Math.PI * 2) * amplitude;
        this.turtleContainer.y = centerY + yOffset;

        const scale = 0.8 + Math.sin(progress * Math.PI * 4) * 0.1;
        this.drawTurtle(scale);
      },
      onComplete: () => {
        this.scene.start('GameScene');
      }
    });
  }
}
