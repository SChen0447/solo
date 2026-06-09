import Phaser from 'phaser';

export class Player {
  private scene: Phaser.Scene;
  public sprite: Phaser.Physics.Arcade.Sprite;
  private thrustFlame: Phaser.GameObjects.Sprite;
  private sparkParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private trailGraphics: Phaser.GameObjects.Graphics;

  private acceleration: number = 0.2;
  private maxSpeed: number = 4;
  private friction: number = 0.98;
  private velocityX: number = 0;
  private velocityY: number = 0;

  private isBoosting: boolean = false;
  private boostCooldown: number = 0;
  private boostDuration: number = 0;
  private readonly BOOST_DURATION_MAX: number = 1000;
  private readonly BOOST_COOLDOWN_MAX: number = 3000;
  private readonly BOOST_MULTIPLIER: number = 2;

  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey: Phaser.Input.Keyboard.Key;

  private trailPoints: Array<{ x: number; y: number; alpha: number }> = [];
  private readonly MAX_TRAIL_POINTS: number = 20;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.spaceKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.createShipGraphics();
    this.sprite = scene.physics.add.sprite(x, y, 'ship');
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setSize(14, 14);
    this.sprite.setOffset(1, 1);

    this.thrustFlame = scene.add.sprite(x - 10, y, 'thrust');
    this.thrustFlame.setOrigin(1, 0.5);

    this.createSparkParticles();

    this.trailGraphics = scene.add.graphics();
  }

  private createShipGraphics(): void {
    if (this.scene.textures.exists('ship')) return;

    const shipGraphics = this.scene.make.graphics({ x: 0, y: 0, add: false });

    shipGraphics.fillStyle(0x44aaff);
    shipGraphics.fillRect(4, 4, 4, 8);

    shipGraphics.fillStyle(0x66ccff);
    shipGraphics.fillRect(8, 2, 4, 12);
    shipGraphics.fillRect(12, 6, 2, 4);

    shipGraphics.fillStyle(0x2288dd);
    shipGraphics.fillRect(4, 0, 4, 4);
    shipGraphics.fillRect(4, 12, 4, 4);

    shipGraphics.fillStyle(0xffffff);
    shipGraphics.fillRect(10, 6, 2, 4);

    shipGraphics.fillStyle(0x88ddff);
    shipGraphics.fillRect(6, 6, 2, 4);

    shipGraphics.generateTexture('ship', 16, 16);
    shipGraphics.destroy();

    this.createThrustTexture();
  }

  private createThrustTexture(): void {
    if (this.scene.textures.exists('thrust')) return;

    const thrustGraphics = this.scene.make.graphics({ x: 0, y: 0, add: false });

    thrustGraphics.fillStyle(0xffaa00);
    thrustGraphics.fillRect(0, 4, 6, 4);

    thrustGraphics.fillStyle(0xffff00);
    thrustGraphics.fillRect(2, 5, 3, 2);

    thrustGraphics.fillStyle(0xffffff);
    thrustGraphics.fillRect(4, 5, 1, 2);

    thrustGraphics.generateTexture('thrust', 8, 12);
    thrustGraphics.destroy();
  }

  private createSparkParticles(): void {
    if (this.scene.textures.exists('spark')) {
      this.sparkParticles = this.scene.add.particles(0, 0, 'spark', {
        lifespan: 300,
        speed: { min: 50, max: 150 },
        scale: { start: 0.5, end: 0 },
        blendMode: 'ADD',
        emitting: false
      });
      return;
    }

    const sparkGraphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
    sparkGraphics.fillStyle(0xffff00);
    sparkGraphics.fillRect(0, 0, 2, 2);
    sparkGraphics.fillStyle(0xff8800);
    sparkGraphics.fillRect(1, 1, 1, 1);
    sparkGraphics.generateTexture('spark', 3, 3);
    sparkGraphics.destroy();

    this.sparkParticles = this.scene.add.particles(0, 0, 'spark', {
      lifespan: 300,
      speed: { min: 50, max: 150 },
      scale: { start: 0.5, end: 0 },
      blendMode: 'ADD',
      emitting: false
    });
  }

  update(delta: number): void {
    if (this.boostCooldown > 0) {
      this.boostCooldown -= delta;
    }

    if (this.isBoosting) {
      this.boostDuration -= delta;
      if (this.boostDuration <= 0) {
        this.isBoosting = false;
        if (this.sparkParticles) {
          this.sparkParticles.stop();
        }
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.boostCooldown <= 0 && !this.isBoosting) {
      this.isBoosting = true;
      this.boostDuration = this.BOOST_DURATION_MAX;
      this.boostCooldown = this.BOOST_COOLDOWN_MAX;
      if (this.sparkParticles) {
        this.sparkParticles.start();
      }
    }

    const currentAccel = this.isBoosting ? this.acceleration * this.BOOST_MULTIPLIER : this.acceleration;
    const currentMaxSpeed = this.isBoosting ? this.maxSpeed * this.BOOST_MULTIPLIER : this.maxSpeed;

    if (this.cursors.left.isDown) {
      this.velocityX -= currentAccel;
    }
    if (this.cursors.right.isDown) {
      this.velocityX += currentAccel;
    }
    if (this.cursors.up.isDown) {
      this.velocityY -= currentAccel;
    }
    if (this.cursors.down.isDown) {
      this.velocityY += currentAccel;
    }

    this.velocityX *= this.friction;
    this.velocityY *= this.friction;

    const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
    if (speed > currentMaxSpeed) {
      this.velocityX = (this.velocityX / speed) * currentMaxSpeed;
      this.velocityY = (this.velocityY / speed) * currentMaxSpeed;
    }

    if (Math.abs(this.velocityX) < 0.01) this.velocityX = 0;
    if (Math.abs(this.velocityY) < 0.01) this.velocityY = 0;

    this.sprite.setVelocity(this.velocityX * 60, this.velocityY * 60);

    const isMoving = speed > 0.5;
    this.thrustFlame.setVisible(isMoving);
    if (isMoving) {
      this.thrustFlame.setPosition(this.sprite.x - 10, this.sprite.y);
      const flameScale = this.isBoosting ? 1.8 : 1 + Math.random() * 0.3;
      this.thrustFlame.setScale(flameScale, 1 + Math.random() * 0.2);
      this.thrustFlame.angle = Math.atan2(this.velocityY, this.velocityX) * (180 / Math.PI) + 180;

      if (this.sparkParticles) {
        this.sparkParticles.emitParticleAt(this.sprite.x - 10, this.sprite.y, this.isBoosting ? 3 : 1);
      }
    }

    this.updateTrail();
  }

  private updateTrail(): void {
    this.trailPoints.unshift({ x: this.sprite.x, y: this.sprite.y, alpha: 0.6 });

    if (this.trailPoints.length > this.MAX_TRAIL_POINTS) {
      this.trailPoints.pop();
    }

    this.trailGraphics.clear();

    for (let i = this.trailPoints.length - 1; i >= 0; i--) {
      const point = this.trailPoints[i];
      const alpha = (1 - i / this.MAX_TRAIL_POINTS) * 0.5;
      const size = (1 - i / this.MAX_TRAIL_POINTS) * 8;

      this.trailGraphics.fillStyle(0x4488ff, alpha);
      this.trailGraphics.fillRect(point.x - size / 2, point.y - size / 2, size, size);
    }
  }

  getBoostReady(): boolean {
    return this.boostCooldown <= 0 && !this.isBoosting;
  }

  getBoostCooldownPercent(): number {
    if (this.isBoosting) return 1;
    if (this.boostCooldown <= 0) return 1;
    return 1 - this.boostCooldown / this.BOOST_COOLDOWN_MAX;
  }

  destroy(): void {
    this.trailGraphics.destroy();
    if (this.sparkParticles) {
      this.sparkParticles.destroy();
    }
    this.thrustFlame.destroy();
    this.sprite.destroy();
  }
}
