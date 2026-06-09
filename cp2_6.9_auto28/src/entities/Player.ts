import type { PlayerInput } from '../utils/InputManager';

export interface FrameSnapshot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  isJumping: boolean;
  onGround: boolean;
}

export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public body!: Phaser.Physics.Arcade.Body;
  private scene: Phaser.Scene;
  private startX: number;
  private startY: number;
  private readonly MOVE_SPEED = 260;
  private readonly JUMP_FORCE = -420;
  private facing: number = 1;
  private dustParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private glowEffect!: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.startX = x;
    this.startY = y;
    this.sprite = scene.physics.add.sprite(x, y, '');
    this.sprite.setSize(32, 32);
    this.sprite.setDisplaySize(32, 32);
    this.sprite.setCollideWorldBounds(false);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setGravityY(0);
    this.createVisual();
    this.createDustParticles();
  }

  private createVisual(): void {
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0x00d4ff, 1);
    graphics.fillRoundedRect(0, 0, 32, 32, 4);
    graphics.generateTexture('player-texture', 32, 32);
    graphics.destroy();

    this.sprite.setTexture('player-texture');

    this.glowEffect = this.scene.add.rectangle(0, 0, 38, 38, 0xffffff, 0);
    this.glowEffect.setStrokeStyle(2, 0xffffff, 0.6);
    this.sprite.setDepth(10);
    this.glowEffect.setDepth(9);
  }

  private createDustParticles(): void {
    this.dustParticles = this.scene.add.particles(0, 0, '', {
      speed: { min: -40, max: 40 },
      angle: { min: 180, max: 360 },
      scale: { start: 0.08, end: 0 },
      lifespan: 350,
      quantity: 4,
      tint: 0xffdd44,
      emitting: false,
    });
    this.dustParticles.setDepth(5);

    const pg = this.scene.add.graphics();
    pg.fillStyle(0xffdd44, 1);
    pg.fillCircle(2, 2, 2);
    pg.generateTexture('dust-particle', 4, 4);
    pg.destroy();
    this.dustParticles.setTexture('dust-particle');
  }

  public update(input: PlayerInput): void {
    let vx = 0;
    if (input.left) {
      vx = -this.MOVE_SPEED;
      this.facing = -1;
    }
    if (input.right) {
      vx = this.MOVE_SPEED;
      this.facing = 1;
    }

    const wasOnGround = this.body.onFloor();
    this.body.setVelocityX(vx);

    if (input.jumpPressed && wasOnGround) {
      this.body.setVelocityY(this.JUMP_FORCE);
      this.emitDust();
    }

    if (!wasOnGround && this.body.onFloor()) {
      this.emitDust();
    }

    this.glowEffect.setPosition(this.sprite.x, this.sprite.y);
  }

  private emitDust(): void {
    this.dustParticles.emitParticleAt(this.sprite.x, this.sprite.y + 16, 6);
  }

  public reset(): void {
    this.sprite.setPosition(this.startX, this.startY);
    this.body.setVelocity(0, 0);
  }

  public getSnapshot(): FrameSnapshot {
    return {
      x: this.sprite.x,
      y: this.sprite.y,
      vx: this.body.velocity.x,
      vy: this.body.velocity.y,
      facing: this.facing,
      isJumping: !this.body.onFloor(),
      onGround: this.body.onFloor(),
    };
  }

  public setStartPosition(x: number, y: number): void {
    this.startX = x;
    this.startY = y;
    this.sprite.setPosition(x, y);
  }

  public destroy(): void {
    this.sprite.destroy();
    this.glowEffect.destroy();
    this.dustParticles.destroy();
  }
}
