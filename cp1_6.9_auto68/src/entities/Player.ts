import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private wasdKeys: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key } | null = null;
  private readonly MOVE_SPEED: number = 250;
  private readonly TILT_ANGLE: number = 15;
  private readonly TILT_DURATION: number = 200;
  private targetAngle: number = 0;
  private isInvincible: boolean = false;
  private invincibleTimer: Phaser.Time.TimerEvent | null = null;
  private blinkEvent: Phaser.Time.TimerEvent | null = null;
  private lives: number = 3;
  private onLivesChange: ((lives: number) => void) | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'playerShip');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(false);
    this.setDisplaySize(32, 32);
    this.createShipTexture();
    this.setupInput();
  }

  private createShipTexture(): void {
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0x44aa44);
    graphics.beginPath();
    graphics.moveTo(16, 0);
    graphics.lineTo(32, 28);
    graphics.lineTo(16, 22);
    graphics.lineTo(0, 28);
    graphics.closePath();
    graphics.fillPath();
    graphics.fillStyle(0x66cc66);
    graphics.fillRect(12, 6, 8, 10);
    graphics.fillStyle(0xff6600);
    graphics.fillTriangle(12, 28, 20, 28, 16, 36);
    graphics.generateTexture('playerShip', 32, 40);
    graphics.destroy();
    this.setTexture('playerShip');
  }

  private setupInput(): void {
    if (this.scene.input.keyboard) {
      this.wasdKeys = this.scene.input.keyboard.addKeys('W,A,S,D') as { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
    }
  }

  public setLivesChangeCallback(callback: (lives: number) => void): void {
    this.onLivesChange = callback;
  }

  public getLives(): number {
    return this.lives;
  }

  public takeDamage(_loseTreasures: boolean = false): boolean {
    if (this.isInvincible) return false;

    this.lives--;
    if (this.onLivesChange) {
      this.onLivesChange(this.lives);
    }

    if (this.lives <= 0) {
      return true;
    }

    this.startInvincibility();
    return false;
  }

  private startInvincibility(): void {
    this.isInvincible = true;
    let isVisible = true;

    this.blinkEvent = this.scene.time.addEvent({
      delay: 80,
      callback: () => {
        isVisible = !isVisible;
        this.setAlpha(isVisible ? 1 : 0.3);
      },
      loop: true
    });

    this.invincibleTimer = this.scene.time.delayedCall(500, () => {
      this.isInvincible = false;
      this.setAlpha(1);
      if (this.blinkEvent) {
        this.blinkEvent.remove(false);
        this.blinkEvent = null;
      }
    });
  }

  public reset(x: number, y: number): void {
    this.setPosition(x, y);
    this.lives = 3;
    this.isInvincible = false;
    this.setAlpha(1);
    this.angle = 0;
    this.targetAngle = 0;
    if (this.onLivesChange) {
      this.onLivesChange(this.lives);
    }
  }

  update(_time: number, delta: number): void {
    this.handleMovement(delta);
    this.handleTilt(delta);
    this.wrapAroundBounds();
  }

  private handleMovement(_delta: number): void {
    let velocityX = 0;
    let velocityY = 0;

    if (this.wasdKeys) {
      if (this.wasdKeys.A.isDown) {
        velocityX -= this.MOVE_SPEED;
      }
      if (this.wasdKeys.D.isDown) {
        velocityX += this.MOVE_SPEED;
      }
      if (this.wasdKeys.W.isDown) {
        velocityY -= this.MOVE_SPEED;
      }
      if (this.wasdKeys.S.isDown) {
        velocityY += this.MOVE_SPEED;
      }
    }

    if (velocityX !== 0 && velocityY !== 0) {
      const factor = 1 / Math.sqrt(2);
      velocityX *= factor;
      velocityY *= factor;
    }

    this.setVelocity(velocityX, velocityY);
  }

  private handleTilt(delta: number): void {
    let newTargetAngle = 0;
    if (this.wasdKeys) {
      if (this.wasdKeys.A.isDown) {
        newTargetAngle = -this.TILT_ANGLE;
      } else if (this.wasdKeys.D.isDown) {
        newTargetAngle = this.TILT_ANGLE;
      }
    }
    this.targetAngle = newTargetAngle;

    const tiltSpeed = (this.TILT_ANGLE * 2) / (this.TILT_DURATION / delta);
    if (this.angle < this.targetAngle) {
      this.angle = Math.min(this.angle + tiltSpeed, this.targetAngle);
    } else if (this.angle > this.targetAngle) {
      this.angle = Math.max(this.angle - tiltSpeed, this.targetAngle);
    }
  }

  private wrapAroundBounds(): void {
    const halfWidth = this.displayWidth / 2;
    const halfHeight = this.displayHeight / 2;
    const gameWidth = this.scene.scale.width;
    const gameHeight = this.scene.scale.height;

    if (this.x < -halfWidth) {
      this.x = gameWidth + halfWidth;
    } else if (this.x > gameWidth + halfWidth) {
      this.x = -halfWidth;
    }

    if (this.y < -halfHeight) {
      this.y = gameHeight + halfHeight;
    } else if (this.y > gameHeight + halfHeight) {
      this.y = -halfHeight;
    }
  }

  public destroy(): void {
    if (this.invincibleTimer) {
      this.invincibleTimer.remove(false);
    }
    if (this.blinkEvent) {
      this.blinkEvent.remove(false);
    }
    super.destroy();
  }
}
