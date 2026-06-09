export type PlayerState = 'running' | 'jumping' | 'sliding';

export interface PlayerConfig {
  x: number;
  groundY: number;
}

export class Player {
  x: number;
  y: number;
  baseY: number;
  width: number = 16;
  height: number = 16;
  state: PlayerState = 'running';
  velocityY: number = 0;
  stateTimer: number = 0;
  animFrame: number = 0;
  animTimer: number = 0;

  private readonly gravity: number = 1800;
  private readonly jumpVelocity: number = -520;
  private readonly jumpUpDuration: number = 0.4;
  private readonly jumpHoldDuration: number = 0.15;
  private readonly jumpLandDuration: number = 0.1;
  private readonly slideDuration: number = 0.35;
  private readonly slideWidth: number = 16;
  private readonly slideHeight: number = 8;
  private readonly runAnimSpeed: number = 0.1;

  constructor(config: PlayerConfig) {
    this.x = config.x;
    this.y = config.groundY;
    this.baseY = config.groundY;
  }

  get hitbox(): { x: number; y: number; width: number; height: number } {
    if (this.state === 'sliding') {
      return {
        x: this.x,
        y: this.y + (this.height - this.slideHeight),
        width: this.slideWidth,
        height: this.slideHeight
      };
    }
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  get color(): string {
    switch (this.state) {
      case 'jumping':
        return '#FF8C00';
      case 'sliding':
        return '#FF6347';
      default:
        return '#FFD700';
    }
  }

  jump(): boolean {
    if (this.state === 'running') {
      this.state = 'jumping';
      this.stateTimer = 0;
      this.velocityY = this.jumpVelocity;
      return true;
    }
    return false;
  }

  startSlide(): boolean {
    if (this.state === 'running') {
      this.state = 'sliding';
      this.stateTimer = 0;
      return true;
    }
    return false;
  }

  endSlide(): void {
    if (this.state === 'sliding') {
      this.state = 'running';
      this.stateTimer = 0;
    }
  }

  update(deltaTime: number): void {
    this.animTimer += deltaTime;
    if (this.animTimer >= this.runAnimSpeed) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 4;
    }

    this.stateTimer += deltaTime;

    switch (this.state) {
      case 'jumping':
        this.updateJump(deltaTime);
        break;
      case 'sliding':
        this.updateSlide();
        break;
      case 'running':
      default:
        this.y = this.baseY;
        break;
    }
  }

  private updateJump(deltaTime: number): void {
    if (this.stateTimer < this.jumpUpDuration) {
      this.velocityY += this.gravity * deltaTime;
      this.y += this.velocityY * deltaTime;
    } else if (this.stateTimer < this.jumpUpDuration + this.jumpHoldDuration) {
      // hold position near peak
      this.y += this.velocityY * deltaTime * 0.1;
    } else {
      this.velocityY += this.gravity * deltaTime;
      this.y += this.velocityY * deltaTime;
    }

    if (this.y >= this.baseY) {
      this.y = this.baseY;
      this.velocityY = 0;
      if (this.stateTimer >= this.jumpUpDuration + this.jumpHoldDuration + this.jumpLandDuration) {
        this.state = 'running';
        this.stateTimer = 0;
      }
    }
  }

  private updateSlide(): void {
    if (this.stateTimer >= this.slideDuration) {
      this.state = 'running';
      this.stateTimer = 0;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const color = this.color;
    ctx.fillStyle = color;

    const hb = this.hitbox;

    if (this.state === 'running') {
      this.drawRunning(ctx);
    } else if (this.state === 'jumping') {
      this.drawJumping(ctx);
    } else if (this.state === 'sliding') {
      this.drawSliding(ctx, hb);
    }

    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.fillRect(hb.x, hb.y, 2, 2);
    ctx.shadowBlur = 0;
  }

  private drawRunning(ctx: CanvasRenderingContext2D): void {
    const px = 2;
    const x = this.x;
    const y = this.y;

    ctx.fillStyle = this.color;
    ctx.fillRect(x + px * 2, y, px * 4, px * 4);
    ctx.fillRect(x + px * 1, y + px * 4, px * 6, px * 3);

    const frame = this.animFrame;
    if (frame === 0) {
      ctx.fillRect(x + px * 1, y + px * 7, px * 2, px * 1);
      ctx.fillRect(x + px * 5, y + px * 7, px * 2, px * 1);
    } else if (frame === 1) {
      ctx.fillRect(x + px * 2, y + px * 7, px * 2, px * 1);
      ctx.fillRect(x + px * 4, y + px * 7, px * 2, px * 1);
    } else if (frame === 2) {
      ctx.fillRect(x + px * 0, y + px * 7, px * 2, px * 1);
      ctx.fillRect(x + px * 6, y + px * 7, px * 2, px * 1);
    } else {
      ctx.fillRect(x + px * 3, y + px * 7, px * 2, px * 1);
      ctx.fillRect(x + px * 5, y + px * 7, px * 2, px * 1);
    }

    ctx.fillStyle = '#0D0D1E';
    ctx.fillRect(x + px * 3, y + px * 1, px, px);
    ctx.fillRect(x + px * 5, y + px * 1, px, px);
  }

  private drawJumping(ctx: CanvasRenderingContext2D): void {
    const px = 2;
    const x = this.x;
    const y = this.y;

    ctx.fillStyle = this.color;
    ctx.fillRect(x + px * 2, y, px * 4, px * 4);
    ctx.fillRect(x + px * 1, y + px * 4, px * 6, px * 3);

    ctx.fillRect(x + px * 0, y + px * 3, px * 1, px * 2);
    ctx.fillRect(x + px * 7, y + px * 3, px * 1, px * 2);

    ctx.fillRect(x + px * 2, y + px * 7, px * 2, px * 1);
    ctx.fillRect(x + px * 4, y + px * 7, px * 2, px * 1);

    ctx.fillStyle = '#0D0D1E';
    ctx.fillRect(x + px * 3, y + px * 1, px, px);
    ctx.fillRect(x + px * 5, y + px * 1, px, px);
  }

  private drawSliding(ctx: CanvasRenderingContext2D, hb: { x: number; y: number; width: number; height: number }): void {
    const px = 2;
    const x = hb.x;
    const y = hb.y;

    ctx.fillStyle = this.color;
    ctx.fillRect(x, y, px * 8, px * 4);

    ctx.fillStyle = '#0D0D1E';
    ctx.fillRect(x + px * 5, y + px * 1, px, px);
  }

  reset(): void {
    this.y = this.baseY;
    this.state = 'running';
    this.velocityY = 0;
    this.stateTimer = 0;
    this.animFrame = 0;
    this.animTimer = 0;
  }
}
