export interface RunnerState {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  width: number;
  height: number;
  isJumping: boolean;
  isOnGround: boolean;
  rotation: number;
}

export class Runner {
  private x: number = 150;
  private y: number = 0;
  private baseY: number = 0;
  private velocityY: number = 0;
  private width: number = 50;
  private height: number = 60;
  private isJumping: boolean = false;
  private isOnGround: boolean = true;

  private scaleX: number = 1;
  private scaleY: number = 1;
  private isSquashing: boolean = false;
  private squashTime: number = 0;
  private readonly SQUASH_DURATION = 0.3;
  private readonly SQUASH_AMOUNT = 0.35;
  private rotation: number = 0;

  private readonly GRAVITY = 2200;
  private readonly JUMP_FORCE = -900;

  constructor(groundY: number) {
    this.baseY = groundY - this.height;
    this.y = this.baseY;
  }

  init(groundY: number): void {
    this.baseY = groundY - this.height;
    this.y = this.baseY;
    this.velocityY = 0;
    this.isJumping = false;
    this.isOnGround = true;
    this.scaleX = 1;
    this.scaleY = 1;
    this.isSquashing = false;
    this.squashTime = 0;
    this.rotation = 0;
  }

  jump(): void {
    if (this.isOnGround && !this.isJumping) {
      this.velocityY = this.JUMP_FORCE;
      this.isJumping = true;
      this.isOnGround = false;
      this.triggerSquash();
    }
  }

  private triggerSquash(): void {
    this.isSquashing = true;
    this.squashTime = 0;
  }

  update(deltaTime: number): void {
    if (!this.isOnGround) {
      this.velocityY += this.GRAVITY * deltaTime;
      this.y += this.velocityY * deltaTime;

      if (this.y >= this.baseY) {
        this.y = this.baseY;
        this.velocityY = 0;
        this.isOnGround = true;
        this.isJumping = false;
        this.rotation = 0;
      } else {
        this.rotation += deltaTime * 4;
      }
    }

    if (this.isSquashing) {
      this.squashTime += deltaTime;
      const progress = Math.min(1, this.squashTime / this.SQUASH_DURATION);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      if (progress < 0.5) {
        const compressProgress = easeOut * 2;
        this.scaleX = 1 + this.SQUASH_AMOUNT * compressProgress;
        this.scaleY = 1 - this.SQUASH_AMOUNT * compressProgress;
      } else {
        const stretchProgress = (easeOut - 0.5) * 2;
        this.scaleX = 1 + this.SQUASH_AMOUNT * (1 - stretchProgress);
        this.scaleY = 1 - this.SQUASH_AMOUNT * (1 - stretchProgress * 1.2);
      }

      if (progress >= 1) {
        this.isSquashing = false;
        this.scaleX = 1;
        this.scaleY = 1;
      }
    }

    if (this.isOnGround && !this.isSquashing) {
      const idleBob = Math.sin(Date.now() / 200) * 0.02;
      this.scaleX = 1 + idleBob;
      this.scaleY = 1 - idleBob;
    }
  }

  getState(): RunnerState {
    return {
      x: this.x,
      y: this.y,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      width: this.width,
      height: this.height,
      isJumping: this.isJumping,
      isOnGround: this.isOnGround,
      rotation: this.rotation
    };
  }

  getBoundingBox(): { x: number; y: number; width: number; height: number } {
    const actualWidth = this.width * this.scaleX;
    const actualHeight = this.height * this.scaleY;
    const offsetX = (this.width - actualWidth) / 2;
    const offsetY = this.height - actualHeight;

    return {
      x: this.x + offsetX + 5,
      y: this.y + offsetY + 5,
      width: actualWidth - 10,
      height: actualHeight - 10
    };
  }

  handleKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      e.preventDefault();
      this.jump();
    }
  }

  handleClick(): void {
    this.jump();
  }
}
