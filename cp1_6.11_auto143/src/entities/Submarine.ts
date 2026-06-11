import Phaser from 'phaser';

export class Submarine extends Phaser.Physics.Arcade.Sprite {
  private readonly MAX_SPEED = 200;
  private readonly ACCELERATION = 400;
  private readonly FRICTION = 0.95;
  private readonly LIGHT_RADIUS = 120;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private lightGraphics!: Phaser.GameObjects.Graphics;
  private lightContainer!: Phaser.GameObjects.Container;
  private oxygen: number = 100;
  private lightAngle: number = 0;
  private targetLightAngle: number = 0;
  private isInLight: boolean = true;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, '');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDrag(this.FRICTION * 100, this.FRICTION * 100);
    this.setMaxVelocity(this.MAX_SPEED, this.MAX_SPEED);
    this.setBounce(0.3);

    if (this.body) {
      this.body.setSize(40, 25);
    }

    this.cursors = scene.input.keyboard?.createCursorKeys()!;
    this.createSubmarineSprite();
    this.createLight();
  }

  private createSubmarineSprite(): void {
    const graphics = this.scene.add.graphics();

    graphics.fillStyle(0x2c5aa0, 1);
    graphics.beginPath();
    this.drawEllipse(graphics, 0, 0, 35, 18);
    graphics.fill();

    graphics.fillStyle(0x5bbaff, 0.8);
    graphics.beginPath();
    this.drawEllipse(graphics, 10, -5, 15, 10);
    graphics.fill();

    graphics.fillStyle(0xffd700, 1);
    graphics.fillCircle(25, -2, 4);

    graphics.fillStyle(0x1a3a5c, 1);
    graphics.fillRect(-35, -3, 8, 6);

    graphics.fillStyle(0x3d6b8a, 1);
    graphics.fillRect(-5, -20, 10, 12);

    graphics.generateTexture('submarine', 80, 50);
    graphics.destroy();

    this.setTexture('submarine');
    this.setDisplaySize(70, 45);
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

  private createLight(): void {
    this.lightContainer = this.scene.add.container(this.x, this.y);
    this.lightGraphics = this.scene.add.graphics();
    this.lightContainer.add(this.lightGraphics);
    this.lightContainer.setDepth(-1);

    this.updateLight();
  }

  private updateLight(): void {
    this.lightGraphics.clear();

    const angle = this.rotation + this.lightAngle;
    const spreadAngle = Math.PI / 3;

    this.lightGraphics.save();
    this.lightGraphics.beginPath();

    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const currentAngle = angle - spreadAngle / 2 + t * spreadAngle;
      const radius = this.LIGHT_RADIUS;
      const x = Math.cos(currentAngle) * radius;
      const y = Math.sin(currentAngle) * radius;

      if (i === 0) {
        this.lightGraphics.moveTo(0, 0);
      }
      this.lightGraphics.lineTo(x, y);
    }

    this.lightGraphics.closePath();
    this.lightGraphics.fillStyle(0x5bbaff, 0.3);
    this.lightGraphics.fill();
    this.lightGraphics.restore();

    this.lightGraphics.save();
    this.lightGraphics.beginPath();
    this.lightGraphics.arc(0, 0, 20, 0, Math.PI * 2);
    this.lightGraphics.fillStyle(0x5bbaff, 0.2);
    this.lightGraphics.fill();
    this.lightGraphics.restore();
  }

  update(time: number, delta: number): void {
    this.handleInput(delta);
    this.updateLightAngle(delta);
    this.updateOxygen(delta);
    this.updateLightPosition();
    this.updateRotation();
  }

  private handleInput(delta: number): void {
    if (!this.body) return;

    const accel = this.ACCELERATION * (delta / 1000);
    let vx = this.body.velocity.x;
    let vy = this.body.velocity.y;

    if (this.cursors.left?.isDown) {
      vx -= accel * 60;
    }
    if (this.cursors.right?.isDown) {
      vx += accel * 60;
    }
    if (this.cursors.up?.isDown) {
      vy -= accel * 60;
    }
    if (this.cursors.down?.isDown) {
      vy += accel * 60;
    }

    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > this.MAX_SPEED) {
      vx = (vx / speed) * this.MAX_SPEED;
      vy = (vy / speed) * this.MAX_SPEED;
    }

    this.setVelocity(vx, vy);
  }

  private updateLightAngle(delta: number): void {
    const turnRate = 0.05;
    if (this.cursors.left?.isDown) {
      this.targetLightAngle = -0.26;
    } else if (this.cursors.right?.isDown) {
      this.targetLightAngle = 0.26;
    } else {
      this.targetLightAngle = 0;
    }

    this.lightAngle += (this.targetLightAngle - this.lightAngle) * turnRate;
    this.updateLight();
  }

  private updateOxygen(delta: number): void {
    const consumptionRate = this.isInLight ? 0.1 : 0.3;
    this.oxygen -= consumptionRate * (delta / 1000);
    this.oxygen = Math.max(0, this.oxygen);
  }

  private updateLightPosition(): void {
    this.lightContainer.setPosition(this.x, this.y);
  }

  private updateRotation(): void {
    if (!this.body) return;

    if (Math.abs(this.body.velocity.x) > 10 || Math.abs(this.body.velocity.y) > 10) {
      const targetRotation = Math.atan2(this.body.velocity.y, this.body.velocity.x);
      this.rotation = targetRotation;
    }
  }

  public getOxygen(): number {
    return this.oxygen;
  }

  public addOxygen(amount: number): void {
    this.oxygen = Math.min(100, this.oxygen + amount);
  }

  public setInLight(inLight: boolean): void {
    this.isInLight = inLight;
  }

  public getLightRadius(): number {
    return this.LIGHT_RADIUS;
  }

  public getLightContainer(): Phaser.GameObjects.Container {
    return this.lightContainer;
  }

  public applyCurrentForce(force: Phaser.Math.Vector2): void {
    if (!this.body) return;
    this.setVelocity(
      this.body.velocity.x + force.x,
      this.body.velocity.y + force.y
    );
  }
}
