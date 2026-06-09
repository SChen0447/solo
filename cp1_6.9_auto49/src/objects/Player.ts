import Phaser from 'phaser';

const MOVE_SPEED = 200;
const JUMP_FORCE = 400;
const DOUBLE_JUMP_FORCE = 200;
const INVINCIBLE_DURATION = 1500;
const DAMAGE_FLASH_DURATION = 300;

export interface PlayerInput {
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpPressed: boolean;
  doubleJumpPressed: boolean;
}

export class Player {
  public sprite!: Phaser.Physics.Arcade.Sprite;
  public lives: number = 3;
  public maxLives: number = 3;
  public isInvincible: boolean = false;

  private scene!: Phaser.Scene;
  private hasDoubleJumped: boolean = false;
  private isOnGround: boolean = false;
  private invincibleTimer: number = 0;
  private flashTimer: number = 0;
  private isFlashing: boolean = false;
  private facingRight: boolean = true;
  private animFrame: number = 0;
  private animTimer: number = 0;
  private jumpPressedPrev: boolean = false;
  private doubleJumpPressedPrev: boolean = false;

  constructor() {}

  public create(scene: Phaser.Scene, x: number, y: number): void {
    this.scene = scene;
    this.lives = 3;
    this.hasDoubleJumped = false;
    this.isInvincible = false;
    this.invincibleTimer = 0;

    this.sprite = scene.physics.add.sprite(x, y, 'player');
    this.sprite.setSize(24, 40);
    this.sprite.setOffset(4, 8);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setGravityY(600);
    this.sprite.setBounce(0);
    this.sprite.setMaxVelocity(300, 600);

    this.createPlayerGraphics();
  }

  private createPlayerGraphics(): void {
    const graphics = this.scene.add.graphics();
    
    graphics.fillStyle(0x4a9eff, 1);
    graphics.fillRect(4, 20, 24, 16);
    
    graphics.fillStyle(0xf5c99d, 1);
    graphics.fillRect(8, 4, 16, 16);
    
    graphics.fillStyle(0x8b4513, 1);
    graphics.fillRect(4, 36, 10, 12);
    graphics.fillRect(18, 36, 10, 12);
    
    graphics.fillStyle(0x000000, 1);
    graphics.fillRect(12, 10, 3, 3);
    graphics.fillRect(18, 10, 3, 3);
    
    graphics.generateTexture('player_idle', 32, 48);
    graphics.destroy();

    this.sprite.setTexture('player_idle');
  }

  public update(input: PlayerInput, time: number, delta: number): void {
    if (!this.sprite || !this.sprite.body) return;

    this.isOnGround = (this.sprite.body as Phaser.Physics.Arcade.Body).onFloor();

    if (this.isOnGround) {
      this.hasDoubleJumped = false;
    }

    if (input.left) {
      this.sprite.setVelocityX(-MOVE_SPEED);
      this.facingRight = false;
    } else if (input.right) {
      this.sprite.setVelocityX(MOVE_SPEED);
      this.facingRight = true;
    } else {
      this.sprite.setVelocityX(0);
    }

    if (input.jumpPressed && !this.jumpPressedPrev && this.isOnGround) {
      this.sprite.setVelocityY(-JUMP_FORCE);
      this.hasDoubleJumped = false;
    }

    if (input.doubleJumpPressed && !this.doubleJumpPressedPrev && !this.isOnGround && !this.hasDoubleJumped) {
      this.sprite.setVelocityY(-DOUBLE_JUMP_FORCE);
      this.hasDoubleJumped = true;
    }

    this.jumpPressedPrev = input.jumpPressed;
    this.doubleJumpPressedPrev = input.doubleJumpPressed;

    this.updateAnimation(delta);

    if (this.isInvincible) {
      this.invincibleTimer -= delta;
      this.flashTimer -= delta;

      if (this.flashTimer <= 0) {
        this.isFlashing = !this.isFlashing;
        this.flashTimer = 80;
        this.sprite.setAlpha(this.isFlashing ? 0.3 : 1);
      }

      if (this.invincibleTimer <= 0) {
        this.isInvincible = false;
        this.sprite.setAlpha(1);
      }
    }

    this.sprite.setFlipX(!this.facingRight);
  }

  private updateAnimation(delta: number): void {
    this.animTimer += delta;

    if (!this.isOnGround) {
      this.updateJumpFrame();
    } else if (Math.abs(this.sprite.body!.velocity.x) > 10) {
      if (this.animTimer > 100) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 4;
        this.updateRunFrame();
      }
    } else {
      this.updateIdleFrame();
    }
  }

  private updateRunFrame(): void {
    const graphics = this.scene.add.graphics();
    
    const legOffset = [0, 3, 0, -3][this.animFrame];
    
    graphics.fillStyle(0x4a9eff, 1);
    graphics.fillRect(4, 20, 24, 16);
    
    graphics.fillStyle(0xf5c99d, 1);
    graphics.fillRect(8, 4, 16, 16);
    
    graphics.fillStyle(0x8b4513, 1);
    graphics.fillRect(4, 36 + legOffset, 10, 12);
    graphics.fillRect(18, 36 - legOffset, 10, 12);
    
    graphics.fillStyle(0x000000, 1);
    graphics.fillRect(12, 10, 3, 3);
    graphics.fillRect(18, 10, 3, 3);
    
    graphics.generateTexture('player_run_' + this.animFrame, 32, 48);
    graphics.destroy();
    
    this.sprite.setTexture('player_run_' + this.animFrame);
  }

  private updateJumpFrame(): void {
    const graphics = this.scene.add.graphics();
    
    graphics.fillStyle(0x4a9eff, 1);
    graphics.fillRect(4, 18, 24, 14);
    
    graphics.fillStyle(0xf5c99d, 1);
    graphics.fillRect(8, 2, 16, 16);
    
    graphics.fillStyle(0x8b4513, 1);
    graphics.fillRect(4, 32, 10, 10);
    graphics.fillRect(18, 32, 10, 10);
    
    graphics.fillStyle(0xf5c99d, 1);
    graphics.fillRect(0, 18, 4, 6);
    graphics.fillRect(28, 18, 4, 6);
    
    graphics.fillStyle(0x000000, 1);
    graphics.fillRect(12, 8, 3, 3);
    graphics.fillRect(18, 8, 3, 3);
    
    graphics.generateTexture('player_jump', 32, 48);
    graphics.destroy();
    
    this.sprite.setTexture('player_jump');
  }

  private updateIdleFrame(): void {
    this.sprite.setTexture('player_idle');
  }

  public takeDamage(): boolean {
    if (this.isInvincible) return false;

    this.lives--;
    this.isInvincible = true;
    this.invincibleTimer = INVINCIBLE_DURATION;
    this.flashTimer = 0;
    this.isFlashing = true;

    this.sprite.setAlpha(0.3);
    this.sprite.setTint(0xff0000);

    this.scene.time.delayedCall(DAMAGE_FLASH_DURATION, () => {
      this.sprite.clearTint();
    });

    this.sprite.setVelocityY(-200);

    return true;
  }

  public canDoubleJump(): boolean {
    return !this.hasDoubleJumped && !this.isOnGround;
  }

  public consumeDoubleJump(): void {
    this.hasDoubleJumped = true;
  }

  public reset(x: number, y: number): void {
    this.sprite.setPosition(x, y);
    this.sprite.setVelocity(0, 0);
    this.hasDoubleJumped = false;
    this.isInvincible = false;
    this.sprite.setAlpha(1);
    this.sprite.clearTint();
  }

  public destroy(): void {
    if (this.sprite) {
      this.sprite.destroy();
    }
  }
}
