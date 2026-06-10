export type CharacterAction = 'run' | 'jump' | 'slide';

export class Character {
  x: number;
  y: number;
  baseY: number;
  velocityY: number;
  action: CharacterAction;
  animationFrame: number;
  animationTime: number;
  isGrounded: boolean;
  jumpHeight: number;
  gravity: number;
  slideDuration: number;
  slideTimer: number;
  width: number;
  height: number;
  runHeight: number;
  slideHeight: number;
  jumpVelocity: number;

  constructor(x: number, baseY: number) {
    this.x = x;
    this.baseY = baseY;
    this.y = baseY;
    this.velocityY = 0;
    this.action = 'run';
    this.animationFrame = 0;
    this.animationTime = 0;
    this.isGrounded = true;
    this.jumpHeight = 140;
    this.gravity = 2800;
    this.slideDuration = 0.5;
    this.slideTimer = 0;
    this.runHeight = 70;
    this.slideHeight = 35;
    this.width = 45;
    this.height = this.runHeight;
    this.jumpVelocity = -Math.sqrt(2 * this.gravity * this.jumpHeight);
  }

  update(deltaTime: number, bpm: number): void {
    const beatInterval = 60 / bpm;
    const animSpeed = 1 / beatInterval;

    switch (this.action) {
      case 'run':
        this.animationTime += deltaTime * animSpeed;
        this.animationFrame = Math.floor(this.animationTime * 4) % 4;
        this.y = this.baseY;
        this.height = this.runHeight;
        this.velocityY = 0;
        this.isGrounded = true;
        break;

      case 'jump':
        this.velocityY += this.gravity * deltaTime;
        this.y += this.velocityY * deltaTime;
        this.height = this.runHeight;

        if (this.y >= this.baseY) {
          this.y = this.baseY;
          this.velocityY = 0;
          this.isGrounded = true;
          this.action = 'run';
          this.animationTime = 0;
        } else {
          this.isGrounded = false;
          const jumpProgress = (this.baseY - this.y) / this.jumpHeight;
          this.animationFrame = jumpProgress < 0.5 ? 0 : 1;
        }
        break;

      case 'slide':
        this.slideTimer -= deltaTime;
        this.height = this.slideHeight;
        this.y = this.baseY + (this.runHeight - this.slideHeight);
        this.animationTime += deltaTime * animSpeed * 1.5;
        this.animationFrame = Math.floor(this.animationTime * 2) % 2;

        if (this.slideTimer <= 0) {
          this.action = 'run';
          this.height = this.runHeight;
          this.y = this.baseY;
          this.animationTime = 0;
        }
        break;
    }
  }

  jump(): boolean {
    if (this.action === 'run' && this.isGrounded) {
      this.action = 'jump';
      this.velocityY = this.jumpVelocity;
      this.isGrounded = false;
      this.animationTime = 0;
      return true;
    }
    return false;
  }

  slide(): boolean {
    if (this.action === 'run' && this.isGrounded) {
      this.action = 'slide';
      this.slideTimer = this.slideDuration;
      this.animationTime = 0;
      return true;
    }
    if (this.action === 'jump') {
      this.action = 'slide';
      this.slideTimer = this.slideDuration;
      this.velocityY = this.gravity * 0.3;
      this.animationTime = 0;
      return true;
    }
    return false;
  }

  run(): void {
    if (this.action !== 'run') {
      this.action = 'run';
      this.y = this.baseY;
      this.height = this.runHeight;
      this.velocityY = 0;
      this.isGrounded = true;
      this.animationTime = 0;
    }
  }

  getHitbox(): { x: number; y: number; w: number; h: number } {
    return {
      x: this.x - this.width / 2 + 5,
      y: this.y - this.height + 5,
      w: this.width - 10,
      h: this.height - 10
    };
  }
}
