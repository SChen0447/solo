const GRAVITY = 0.6;
const JUMP_VELOCITY = -12;
const BIRD_WIDTH = 16;
const BIRD_HEIGHT = 24;
const LANDING_TOLERANCE = 2;
const BIRD_COLOR = '#ff6347';
const WING_COLOR = '#ff4500';
const EYE_COLOR = '#ffffff';

export class Bird {
  private x: number;
  private y: number;
  private velocityY: number = 0;
  private isOnGround: boolean = true;
  private score: number = 0;
  private combo: number = 0;
  private maxCombo: number = 0;
  private jumpCount: number = 0;
  private gameOver: boolean = false;
  private initialY: number;

  onValidJump?: () => void;
  onComboBonus?: () => void;

  constructor(startX: number, startY: number) {
    this.x = startX;
    this.y = startY;
    this.initialY = startY;
  }

  jump(): void {
    if (this.gameOver) return;
    if (this.isOnGround) {
      this.velocityY = JUMP_VELOCITY;
      this.isOnGround = false;
    }
  }

  update(terrainHeight: number): void {
    if (this.gameOver) return;

    if (!this.isOnGround) {
      this.velocityY += GRAVITY;
      this.y += this.velocityY;
    }

    const birdBottom = this.y + BIRD_HEIGHT;
    const diff = birdBottom - terrainHeight;

    if (diff >= -LANDING_TOLERANCE && diff <= LANDING_TOLERANCE && this.velocityY >= 0) {
      this.y = terrainHeight - BIRD_HEIGHT;
      this.velocityY = 0;
      if (!this.isOnGround) {
        this.isOnGround = true;
        this.handleValidLanding();
      }
    } else if (diff > LANDING_TOLERANCE) {
      this.y = terrainHeight - BIRD_HEIGHT;
      this.gameOver = true;
    }

    if (this.y > this.initialY + 300) {
      this.gameOver = true;
    }
  }

  private handleValidLanding(): void {
    this.score += 1;
    this.combo += 1;
    this.jumpCount += 1;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }
    if (this.onValidJump) {
      this.onValidJump();
    }
    if (this.combo % 10 === 0) {
      this.score += 5;
      if (this.onComboBonus) {
        this.onComboBonus();
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const px = Math.floor(this.x);
    const py = Math.floor(this.y);

    ctx.fillStyle = BIRD_COLOR;
    ctx.fillRect(px, py + 4, BIRD_WIDTH, BIRD_HEIGHT - 8);
    ctx.fillRect(px + 2, py, BIRD_WIDTH - 4, 4);
    ctx.fillRect(px + 2, py + BIRD_HEIGHT - 4, BIRD_WIDTH - 4, 4);

    ctx.fillStyle = WING_COLOR;
    const wingOffset = this.isOnGround ? 0 : (this.velocityY < 0 ? -2 : 2);
    ctx.fillRect(px - 2, py + 8 + wingOffset, 6, 8);
    ctx.fillRect(px + BIRD_WIDTH - 4, py + 8 - wingOffset, 6, 8);

    ctx.fillStyle = EYE_COLOR;
    ctx.fillRect(px + 10, py + 6, 3, 3);

    ctx.restore();
  }

  getX(): number {
    return this.x + BIRD_WIDTH / 2;
  }

  getScore(): number {
    return this.score;
  }

  getMaxCombo(): number {
    return this.maxCombo;
  }

  getJumpCount(): number {
    return this.jumpCount;
  }

  isGameOver(): boolean {
    return this.gameOver;
  }

  reset(startY: number): void {
    this.y = startY;
    this.initialY = startY;
    this.velocityY = 0;
    this.isOnGround = true;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.jumpCount = 0;
    this.gameOver = false;
  }

  getWidth(): number {
    return BIRD_WIDTH;
  }

  getHeight(): number {
    return BIRD_HEIGHT;
  }

  breakCombo(): void {
    this.combo = 0;
  }
}
