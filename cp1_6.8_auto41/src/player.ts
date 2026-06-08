import { Ball } from './ball';
import { Wall, clampRectToWall, checkBallRectCollision } from './collision';

export interface PlayerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  throw: boolean;
}

export class Player {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  color: string;
  score: number;
  cooldown: number;
  maxCooldown: number;
  isHit: boolean;
  hitTimer: number;
  hitDuration: number;
  hitFlashRate: number;
  hitFlashTimer: number;
  showWhite: boolean;
  throwKeyPressed: boolean;
  facingX: number;
  facingY: number;

  constructor(id: number, x: number, y: number, color: string) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.width = 30;
    this.height = 30;
    this.speed = 3;
    this.color = color;
    this.score = 0;
    this.cooldown = 0;
    this.maxCooldown = 60;
    this.isHit = false;
    this.hitTimer = 0;
    this.hitDuration = 30;
    this.hitFlashRate = 10;
    this.hitFlashTimer = 0;
    this.showWhite = false;
    this.throwKeyPressed = false;
    this.facingX = id === 1 ? 1 : -1;
    this.facingY = 0;
  }

  update(input: PlayerInput, wall: Wall): void {
    let dx = 0;
    let dy = 0;

    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;

    if (dx !== 0 && dy !== 0) {
      const factor = 1 / Math.sqrt(2);
      dx *= factor;
      dy *= factor;
    }

    if (dx !== 0 || dy !== 0) {
      this.facingX = dx;
      this.facingY = dy;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        this.facingX /= len;
        this.facingY /= len;
      }
    }

    this.x += dx * this.speed;
    this.y += dy * this.speed;

    const clamped = clampRectToWall(
      { x: this.x, y: this.y, width: this.width, height: this.height },
      wall
    );
    this.x = clamped.x;
    this.y = clamped.y;

    if (this.cooldown > 0) {
      this.cooldown--;
    }

    if (this.isHit) {
      this.hitTimer--;
      this.hitFlashTimer++;
      if (this.hitFlashTimer >= this.hitFlashRate) {
        this.hitFlashTimer = 0;
        this.showWhite = !this.showWhite;
      }
      if (this.hitTimer <= 0) {
        this.isHit = false;
        this.showWhite = false;
      }
    }
  }

  tryThrowBall(): Ball | null {
    if (this.cooldown > 0) return null;

    this.cooldown = this.maxCooldown;

    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    const dirX = this.facingX;
    const dirY = this.facingY;

    return new Ball(
      centerX + dirX * (this.width / 2 + 15),
      centerY + dirY * (this.height / 2 + 15),
      dirX,
      dirY,
      this.color,
      this.id
    );
  }

  checkHit(ball: Ball): boolean {
    if (!ball.active || ball.ownerId === this.id) return false;

    const hit = checkBallRectCollision(
      { x: ball.x, y: ball.y, radius: ball.radius },
      { x: this.x, y: this.y, width: this.width, height: this.height }
    );

    if (hit) {
      this.isHit = true;
      this.hitTimer = this.hitDuration;
      this.hitFlashTimer = 0;
      this.showWhite = true;
      ball.active = false;
    }

    return hit;
  }

  addScore(): void {
    this.score++;
  }

  getCooldownPercent(): number {
    return 1 - this.cooldown / this.maxCooldown;
  }

  reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.cooldown = 0;
    this.isHit = false;
    this.hitTimer = 0;
    this.showWhite = false;
  }

  resetScore(): void {
    this.score = 0;
  }
}
