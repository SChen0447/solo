import Phaser from 'phaser';

export interface PlayerConfig {
  x: number;
  y: number;
  scene: Phaser.Scene;
}

export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite;
  private scene: Phaser.Scene;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW: Phaser.Input.Keyboard.Key;
  private baseSpeed: number = 200;
  private currentSpeed: number = 200;
  private isBoosting: boolean = false;
  private boostTimer: number = 0;
  private boostDuration: number = 3000;
  private energy: number = 100;
  private trailEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private trailParticlePool: Phaser.GameObjects.Particles.ParticleEmitterManager | null = null;
  private lastTrailTime: number = 0;
  private activeParticles: number = 0;
  private readonly maxParticles: number = 80;

  constructor(config: PlayerConfig) {
    this.scene = config.scene;
    this.sprite = this.scene.physics.add.sprite(config.x, config.y, 'playerShip');
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setBounce(0.2);
    this.sprite.setDrag(600);
    this.sprite.setAngularDrag(400);
    this.sprite.setMaxVelocity(400, 400);
    this.sprite.body.setSize(32, 32, true);

    this.cursors = this.scene.input.keyboard!.createCursorKeys();
    this.keyW = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);

    this.setupTrailParticles();
  }

  private setupTrailParticles(): void {
    this.trailParticlePool = this.scene.add.particles(0, 0, 'trailParticle', {
      lifespan: 400,
      speed: { min: 10, max: 30 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.8, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
      quantity: 0
    });
    this.trailEmitter = this.trailParticlePool;
  }

  public update(time: number, delta: number): void {
    this.handleInput(delta);
    this.updateBoost(delta);
    this.updateRotation();
    this.updateTrail(time);
  }

  private handleInput(delta: number): void {
    const moveX = (this.cursors.right.isDown ? 1 : 0) - (this.cursors.left.isDown ? 1 : 0);
    const moveY = (this.cursors.bottom.isDown ? 1 : 0) - (this.cursors.top.isDown ? 1 : 0);

    const hasMovement = moveX !== 0 || moveY !== 0;

    if (this.keyW.isDown && !this.isBoosting && this.energy >= 20) {
      this.activateBoost();
    }

    if (hasMovement) {
      const angle = Math.atan2(moveY, moveX);
      this.sprite.setRotation(angle + Math.PI / 2);
      this.sprite.setAcceleration(
        Math.cos(angle) * this.currentSpeed * 3,
        Math.sin(angle) * this.currentSpeed * 3
      );
    } else {
      this.sprite.setAcceleration(0, 0);
    }
  }

  private activateBoost(): void {
    this.isBoosting = true;
    this.boostTimer = this.boostDuration;
    this.currentSpeed = this.baseSpeed * 1.5;
    this.energy = Math.max(0, this.energy - 20);

    this.sprite.setTint(0xffaa44);
    this.scene.cameras.main.shake(100, 0.004);
  }

  private updateBoost(delta: number): void {
    if (this.isBoosting) {
      this.boostTimer -= delta;
      if (this.boostTimer <= 0) {
        this.deactivateBoost();
      }
    } else {
      this.energy = Math.min(100, this.energy + delta * 0.015);
    }
  }

  private deactivateBoost(): void {
    this.isBoosting = false;
    this.currentSpeed = this.baseSpeed;
    this.sprite.clearTint();
  }

  private updateRotation(): void {
    const vel = this.sprite.body.velocity;
    if (Math.abs(vel.x) > 10 || Math.abs(vel.y) > 10) {
      const targetAngle = Math.atan2(vel.y, vel.x) + Math.PI / 2;
      let diff = targetAngle - this.sprite.rotation;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.sprite.rotation += diff * 0.15;
    }
  }

  private updateTrail(time: number): void {
    const vel = this.sprite.body.velocity;
    const isMoving = Math.abs(vel.x) > 30 || Math.abs(vel.y) > 30;
    const interval = this.isBoosting ? 30 : 60;

    if (isMoving && time - this.lastTrailTime > interval && this.activeParticles < this.maxParticles) {
      this.lastTrailTime = time;
      const angle = this.sprite.rotation + Math.PI / 2;
      const offsetX = Math.cos(angle) * -16;
      const offsetY = Math.sin(angle) * -16;

      const particle = this.trailEmitter?.emitParticle(1, {
        x: this.sprite.x + offsetX,
        y: this.sprite.y + offsetY,
        lifespan: this.isBoosting ? 500 : 350,
        speedX: -Math.cos(angle) * (this.isBoosting ? 80 : 40) + Phaser.Math.Between(-20, 20),
        speedY: -Math.sin(angle) * (this.isBoosting ? 80 : 40) + Phaser.Math.Between(-20, 20),
        scaleX: this.isBoosting ? 0.8 : 0.5,
        scaleY: this.isBoosting ? 0.8 : 0.5,
        alpha: this.isBoosting ? 1 : 0.7,
        tint: this.isBoosting ? 0xff6600 : 0xffaa00
      });

      if (particle) {
        this.activeParticles++;
        this.scene.time.delayedCall(particle.lifespan, () => {
          this.activeParticles = Math.max(0, this.activeParticles - 1);
        });
      }
    }
  }

  public takeDamage(knockbackAngle?: number): void {
    if (knockbackAngle !== undefined) {
      this.sprite.setVelocity(
        Math.cos(knockbackAngle) * 300,
        Math.sin(knockbackAngle) * 300
      );
    }

    this.sprite.setTint(0xff0000);
    this.scene.cameras.main.shake(200, 0.008);

    this.scene.time.delayedCall(150, () => {
      if (!this.isBoosting) {
        this.sprite.clearTint();
      } else {
        this.sprite.setTint(0xffaa44);
      }
    });

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const particle = this.trailEmitter?.emitParticle(1, {
        x: this.sprite.x,
        y: this.sprite.y,
        lifespan: 400,
        speedX: Math.cos(angle) * Phaser.Math.Between(50, 150),
        speedY: Math.sin(angle) * Phaser.Math.Between(50, 150),
        scaleX: 0.6,
        scaleY: 0.6,
        tint: 0xff4444
      });
      if (particle) {
        this.activeParticles++;
        this.scene.time.delayedCall(particle.lifespan, () => {
          this.activeParticles = Math.max(0, this.activeParticles - 1);
        });
      }
    }
  }

  public getActiveParticleCount(): number {
    return this.activeParticles;
  }

  public getEnergy(): number {
    return this.energy;
  }

  public isBoostActive(): boolean {
    return this.isBoosting;
  }

  public destroy(): void {
    this.trailParticlePool?.destroy();
    this.sprite.destroy();
  }
}
