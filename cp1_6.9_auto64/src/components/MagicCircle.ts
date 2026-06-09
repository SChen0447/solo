import * as Phaser from 'phaser';

export class MagicCircle extends Phaser.GameObjects.Container {
  private outerContainer: Phaser.GameObjects.Container;
  private middleContainer: Phaser.GameObjects.Container;
  private innerContainer: Phaser.GameObjects.Container;
  private outerRing: Phaser.GameObjects.Graphics;
  private middleRing: Phaser.GameObjects.Graphics;
  private innerRing: Phaser.GameObjects.Graphics;
  private radius: number;

  constructor(scene: Phaser.Scene, x: number, y: number, radius: number = 200) {
    super(scene, x, y);
    this.radius = radius;

    this.outerContainer = scene.add.container(0, 0);
    this.middleContainer = scene.add.container(0, 0);
    this.innerContainer = scene.add.container(0, 0);

    this.outerRing = scene.add.graphics();
    this.middleRing = scene.add.graphics();
    this.innerRing = scene.add.graphics();

    this.outerContainer.add(this.outerRing);
    this.middleContainer.add(this.middleRing);
    this.innerContainer.add(this.innerRing);

    this.add([this.outerContainer, this.middleContainer, this.innerContainer]);

    this.drawRings();
    scene.add.existing(this);
  }

  private drawRings(): void {
    this.outerRing.clear();
    this.middleRing.clear();
    this.innerRing.clear();

    this.outerRing.lineStyle(3, 0x9933ff, 0.6);
    this.outerRing.strokeCircle(0, 0, this.radius);
    this.outerRing.lineStyle(2, 0xcc66ff, 0.4);
    this.outerRing.strokeCircle(0, 0, this.radius - 8);

    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI * 2) / 12;
      const x1 = Math.cos(angle) * (this.radius - 5);
      const y1 = Math.sin(angle) * (this.radius - 5);
      const x2 = Math.cos(angle) * (this.radius + 5);
      const y2 = Math.sin(angle) * (this.radius + 5);
      this.outerRing.lineStyle(2, 0xffcc00, 0.8);
      this.outerRing.lineBetween(x1, y1, x2, y2);
    }

    this.middleRing.lineStyle(2, 0x6666ff, 0.5);
    this.middleRing.strokeCircle(0, 0, this.radius * 0.66);
    this.middleRing.lineStyle(1, 0x9999ff, 0.4);
    this.middleRing.strokeCircle(0, 0, this.radius * 0.66 - 6);

    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const x = Math.cos(angle) * (this.radius * 0.66 - 3);
      const y = Math.sin(angle) * (this.radius * 0.66 - 3);
      this.middleRing.fillStyle(0xffaa00, 0.8);
      this.middleRing.fillCircle(x, y, 4);
    }

    this.innerRing.lineStyle(2, 0xffccff, 0.6);
    this.innerRing.strokeCircle(0, 0, this.radius * 0.33);
    this.innerRing.lineStyle(1, 0xffffff, 0.5);
    this.innerRing.strokeCircle(0, 0, this.radius * 0.33 - 4);

    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      const x1 = 0;
      const y1 = 0;
      const x2 = Math.cos(angle) * (this.radius * 0.33 - 2);
      const y2 = Math.sin(angle) * (this.radius * 0.33 - 2);
      this.innerRing.lineStyle(1, 0xffff00, 0.6);
      this.innerRing.lineBetween(x1, y1, x2, y2);
    }

    this.innerRing.fillStyle(0xffdd00, 0.9);
    this.innerRing.fillCircle(0, 0, 8);
  }

  public update(time: number, delta: number): void {
    this.outerContainer.rotation += (delta / 1000) * (Math.PI * 2 / 2);
    this.middleContainer.rotation -= (delta / 1000) * (Math.PI * 2 / 3);
    this.innerContainer.rotation += (delta / 1000) * (Math.PI * 2 / 5);
  }
}
