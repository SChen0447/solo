import Phaser from 'phaser';

export type ObstacleType = 'shark' | 'eel';

export default class Obstacle extends Phaser.Physics.Arcade.Sprite {
  private obstacleType: ObstacleType;
  private baseSpeed: number = 100;
  private speedMultiplier: number = 1;
  private waveTime: number = 0;
  private waveAmplitude: number = 5;
  private waveFrequency: number = 2;
  private startY: number = 0;
  private startX: number = 0;
  private direction: Phaser.Math.Vector2;
  private obstacleGraphics!: Phaser.GameObjects.Graphics;
  private targetX: number;
  private targetY: number;
  private screenPadding: number = 200;

  constructor(scene: Phaser.Scene, x: number, y: number, type: ObstacleType, targetX: number, targetY: number) {
    super(scene, x, y, 'obstacle');

    this.obstacleType = type;
    this.startX = x;
    this.startY = y;
    this.targetX = targetX;
    this.targetY = targetY;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.direction = new Phaser.Math.Vector2(targetX - x, targetY - y).normalize();

    this.setBodySize(60, 30, true);
    this.setOffset(30, 15);

    this.createObstacleGraphics();
  }

  private createObstacleGraphics(): void {
    this.obstacleGraphics = this.scene.add.graphics();
    this.drawObstacle(0);
  }

  private drawObstacle(waveOffset: number): void {
    this.obstacleGraphics.clear();

    const x = this.x;
    const y = this.y;
    const angle = Math.atan2(this.direction.y, this.direction.x);

    this.obstacleGraphics.save();
    this.obstacleGraphics.translateCanvas(x, y);
    this.obstacleGraphics.rotateCanvas(angle);

    if (this.obstacleType === 'shark') {
      this.obstacleGraphics.fillStyle(0x666688, 1);
      this.obstacleGraphics.fillEllipse(0, waveOffset, 140, 50);

      this.obstacleGraphics.fillStyle(0x555577, 1);
      this.obstacleGraphics.beginPath();
      this.obstacleGraphics.moveTo(-20, -20 + waveOffset);
      this.obstacleGraphics.lineTo(0, -40 + waveOffset);
      this.obstacleGraphics.lineTo(10, -20 + waveOffset);
      this.obstacleGraphics.closePath();
      this.obstacleGraphics.fillPath();

      this.obstacleGraphics.fillStyle(0x666688, 1);
      this.obstacleGraphics.beginPath();
      this.obstacleGraphics.moveTo(-30, waveOffset);
      this.obstacleGraphics.lineTo(-55, -20 + waveOffset);
      this.obstacleGraphics.lineTo(-55, 20 + waveOffset);
      this.obstacleGraphics.closePath();
      this.obstacleGraphics.fillPath();

      this.obstacleGraphics.fillStyle(0xffffff, 1);
      this.obstacleGraphics.fillCircle(25, -6 + waveOffset, 4);
      this.obstacleGraphics.fillStyle(0x000000, 1);
      this.obstacleGraphics.fillCircle(26, -6 + waveOffset, 2);

      this.obstacleGraphics.fillStyle(0xaaaaaa, 1);
      for (let i = 0; i < 4; i++) {
        this.obstacleGraphics.fillTriangle(20 + i * 8, 8 + waveOffset, 24 + i * 8, 12 + waveOffset, 28 + i * 8, 8 + waveOffset);
      }
    } else {
      this.obstacleGraphics.fillStyle(0x8844ff, 1);
      for (let i = 0; i < 8; i++) {
        const segX = -30 + i * 10;
        const segY = Math.sin(i * 0.8 + waveOffset * 2) * 8;
        this.obstacleGraphics.fillEllipse(segX, segY, 28, 24);
      }

      this.obstacleGraphics.fillStyle(0x6622dd, 1);
      this.obstacleGraphics.fillEllipse(40, waveOffset, 36, 32);

      this.obstacleGraphics.fillStyle(0xffff00, 1);
      this.obstacleGraphics.fillCircle(48, -4 + waveOffset, 4);
      this.obstacleGraphics.fillStyle(0x000000, 1);
      this.obstacleGraphics.fillCircle(49, -4 + waveOffset, 2);
    }

    this.obstacleGraphics.restore();
  }

  update(time: number, delta: number, gameWidth: number, gameHeight: number): void {
    this.waveTime += delta / 1000;
    const wave = Math.sin(this.waveTime * this.waveFrequency * Math.PI * 2) * this.waveAmplitude;

    const currentSpeed = this.baseSpeed * this.speedMultiplier;
    this.setVelocity(this.direction.x * currentSpeed, this.direction.y * currentSpeed);

    this.drawObstacle(wave);
    this.obstacleGraphics.setX(this.x - this.x);
    this.obstacleGraphics.setY(this.y - this.y);
    this.obstacleGraphics.setX(this.x);
    this.obstacleGraphics.setY(this.y);

    if (this.isOutOfBounds(gameWidth, gameHeight)) {
      this.destroy();
    }
  }

  private isOutOfBounds(gameWidth: number, gameHeight: number): boolean {
    return (
      this.x < -this.screenPadding ||
      this.x > gameWidth + this.screenPadding ||
      this.y < -this.screenPadding ||
      this.y > gameHeight + this.screenPadding
    );
  }

  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = multiplier;
  }

  getType(): ObstacleType {
    return this.obstacleType;
  }

  destroy(fromScene?: boolean): void {
    if (this.obstacleGraphics) this.obstacleGraphics.destroy();
    super.destroy(fromScene);
  }
}
