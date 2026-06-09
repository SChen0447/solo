export const TILE_SIZE = 32;

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facingRight: boolean;
  onGround: boolean;
  jumpsLeft: number;
  alive: boolean;
  roomIndex: number;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

const GRAVITY = 0.6;
const MOVE_SPEED = 4;
const JUMP_VELOCITY = -11;
const MAX_FALL_SPEED = 12;

export class Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  facingRight: boolean;
  onGround: boolean;
  jumpsLeft: number;
  alive: boolean;
  roomIndex: number;
  startX: number;
  startY: number;

  constructor(startX: number, startY: number) {
    this.x = startX;
    this.y = startY;
    this.vx = 0;
    this.vy = 0;
    this.width = TILE_SIZE * 0.7;
    this.height = TILE_SIZE * 0.9;
    this.facingRight = true;
    this.onGround = false;
    this.jumpsLeft = 2;
    this.alive = true;
    this.roomIndex = 0;
    this.startX = startX;
    this.startY = startY;
  }

  reset(): void {
    this.x = this.startX;
    this.y = this.startY;
    this.vx = 0;
    this.vy = 0;
    this.facingRight = true;
    this.onGround = false;
    this.jumpsLeft = 2;
    this.alive = true;
  }

  saveState(): PlayerState {
    return {
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      facingRight: this.facingRight,
      onGround: this.onGround,
      jumpsLeft: this.jumpsLeft,
      alive: this.alive,
      roomIndex: this.roomIndex
    };
  }

  restoreState(state: PlayerState): void {
    this.x = state.x;
    this.y = state.y;
    this.vx = state.vx;
    this.vy = state.vy;
    this.facingRight = state.facingRight;
    this.onGround = state.onGround;
    this.jumpsLeft = state.jumpsLeft;
    this.alive = state.alive;
    this.roomIndex = state.roomIndex;
  }

  update(keys: Record<string, boolean>, platforms: Platform[]): void {
    if (!this.alive) return;

    this.vx = 0;
    if (keys['ArrowLeft']) {
      this.vx = -MOVE_SPEED;
      this.facingRight = false;
    }
    if (keys['ArrowRight']) {
      this.vx = MOVE_SPEED;
      this.facingRight = true;
    }

    this.vy += GRAVITY;
    if (this.vy > MAX_FALL_SPEED) {
      this.vy = MAX_FALL_SPEED;
    }

    this.moveAndCollide(platforms);
  }

  jump(): void {
    if (this.jumpsLeft > 0) {
      this.vy = JUMP_VELOCITY;
      this.jumpsLeft--;
      this.onGround = false;
    }
  }

  private moveAndCollide(platforms: Platform[]): void {
    this.x += this.vx;
    this.collideHorizontal(platforms);

    this.y += this.vy;
    this.onGround = false;
    this.collideVertical(platforms);

    if (this.onGround) {
      this.jumpsLeft = 2;
    }
  }

  private collideHorizontal(platforms: Platform[]): void {
    for (const platform of platforms) {
      if (this.intersects(platform)) {
        if (this.vx > 0) {
          this.x = platform.x - this.width;
        } else if (this.vx < 0) {
          this.x = platform.x + platform.width;
        }
        this.vx = 0;
      }
    }
  }

  private collideVertical(platforms: Platform[]): void {
    for (const platform of platforms) {
      if (this.intersects(platform)) {
        if (this.vy > 0) {
          this.y = platform.y - this.height;
          this.onGround = true;
        } else if (this.vy < 0) {
          this.y = platform.y + platform.height;
        }
        this.vy = 0;
      }
    }
  }

  private intersects(rect: Platform): boolean {
    return (
      this.x < rect.x + rect.width &&
      this.x + this.width > rect.x &&
      this.y < rect.y + rect.height &&
      this.y + this.height > rect.y
    );
  }

  die(): void {
    this.alive = false;
  }

  getBounds(): Platform {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  render(ctx: CanvasRenderingContext2D): void {
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    ctx.save();

    const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
    gradient.addColorStop(0, '#60A5FA');
    gradient.addColorStop(1, '#2563EB');

    ctx.fillStyle = this.alive ? gradient : '#991B1B';
    ctx.strokeStyle = '#93C5FD';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#3B82F6';
    ctx.shadowBlur = 10;

    const bodyX = this.x + this.width * 0.1;
    const bodyY = this.y + this.height * 0.15;
    const bodyW = this.width * 0.8;
    const bodyH = this.height * 0.7;
    this.roundRect(ctx, bodyX, bodyY, bodyW, bodyH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1E3A8A';
    ctx.beginPath();
    const eyeOffsetX = this.facingRight ? 5 : -5;
    ctx.arc(cx + eyeOffsetX, cy - 5, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FDE047';
    ctx.beginPath();
    ctx.arc(cx + eyeOffsetX, cy - 5, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
