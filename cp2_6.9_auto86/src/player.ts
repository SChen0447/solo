export interface Ripple {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  maxRadius: number;
}

export class Player {
  x: number = 0;
  y: number = 0;
  vy: number = 0;
  lives: number = 3;
  isJumping: boolean = false;
  scale: number = 1;
  flashTimer: number = 0;
  landAnimTimer: number = 0;
  baseY: number = 0;
  gravity: number = 0.7;
  jumpForce: number = -13;
  ripples: Ripple[] = [];
  private initialLives: number = 3;

  constructor(initialLives: number = 3) {
    this.initialLives = initialLives;
    this.lives = initialLives;
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.baseY = y;
  }

  jump(): void {
    if (!this.isJumping) {
      this.vy = this.jumpForce;
      this.isJumping = true;
    }
  }

  update(_deltaTime: number): void {
    if (this.isJumping) {
      this.vy += this.gravity;
      this.y += this.vy;

      if (this.y >= this.baseY) {
        this.y = this.baseY;
        this.vy = 0;
        this.isJumping = false;
        this.triggerLandAnimation();
      }
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= 1;
    }

    if (this.landAnimTimer > 0) {
      this.landAnimTimer -= 1;
      this.scale = 0.8 + 0.2 * (1 - this.landAnimTimer / 12);
    } else {
      this.scale = 1;
    }

    this.ripples = this.ripples.filter((r) => {
      r.radius += 1.5;
      r.alpha -= 0.015;
      return r.alpha > 0;
    });
  }

  loseLife(): boolean {
    this.lives = Math.max(0, this.lives - 1);
    return this.lives <= 0;
  }

  triggerPerfectFlash(): void {
    this.flashTimer = 6;
  }

  triggerLandAnimation(): void {
    this.landAnimTimer = 12;
    this.ripples.push({
      x: this.x,
      y: this.baseY,
      radius: 5,
      alpha: 0.3,
      maxRadius: 35
    });
  }

  reset(): void {
    this.lives = this.initialLives;
    this.vy = 0;
    this.isJumping = false;
    this.scale = 1;
    this.flashTimer = 0;
    this.landAnimTimer = 0;
    this.ripples = [];
    this.y = this.baseY;
  }
}
