import { Ball, Paddle, Brick, PowerUp, CollisionBox } from './objects';

export const GRAVITY = 0.15;
export const RESTITUTION = 0.98;
export const FRICTION = 0.995;
export const MAX_PARTICLES = 300;

export interface CollisionResult {
  hit: boolean;
  side: 'top' | 'bottom' | 'left' | 'right' | null;
  brick?: Brick;
}

interface SpatialHashCell {
  bricks: Brick[];
}

export class SpatialHash {
  private cellSize: number;
  private cells: Map<string, SpatialHashCell>;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  private getKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }

  public clear(): void {
    this.cells.clear();
  }

  public insert(brick: Brick): void {
    if (!brick.active) return;

    const box = brick.getCollisionBox();
    const minX = Math.floor(box.x / this.cellSize);
    const maxX = Math.floor((box.x + box.width) / this.cellSize);
    const minY = Math.floor(box.y / this.cellSize);
    const maxY = Math.floor((box.y + box.height) / this.cellSize);

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const key = `${cx},${cy}`;
        if (!this.cells.has(key)) {
          this.cells.set(key, { bricks: [] });
        }
        this.cells.get(key)!.bricks.push(brick);
      }
    }
  }

  public query(box: CollisionBox): Brick[] {
    const candidates: Set<Brick> = new Set();

    const minX = Math.floor(box.x / this.cellSize);
    const maxX = Math.floor((box.x + box.width) / this.cellSize);
    const minY = Math.floor(box.y / this.cellSize);
    const maxY = Math.floor((box.y + box.height) / this.cellSize);

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const key = `${cx},${cy}`;
        const cell = this.cells.get(key);
        if (cell) {
          for (const brick of cell.bricks) {
            if (brick.active) {
              candidates.add(brick);
            }
          }
        }
      }
    }

    return Array.from(candidates);
  }
}

export class PhysicsEngine {
  private canvasWidth: number;
  private canvasHeight: number;
  public spatialHash: SpatialHash;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.spatialHash = new SpatialHash(64);
  }

  public applyGravity(ball: Ball): void {
    ball.vy += GRAVITY;
  }

  public applyFriction(ball: Ball): void {
    ball.vx *= FRICTION;
    ball.vy *= FRICTION;
  }

  public checkWallCollision(ball: Ball): boolean {
    let collided = false;

    if (ball.x - ball.radius <= 0) {
      ball.x = ball.radius;
      ball.vx = Math.abs(ball.vx) * RESTITUTION;
      collided = true;
    }

    if (ball.x + ball.radius >= this.canvasWidth) {
      ball.x = this.canvasWidth - ball.radius;
      ball.vx = -Math.abs(ball.vx) * RESTITUTION;
      collided = true;
    }

    if (ball.y - ball.radius <= 0) {
      ball.y = ball.radius;
      ball.vy = Math.abs(ball.vy) * RESTITUTION;
      collided = true;
    }

    return collided;
  }

  public checkBottomCollision(ball: Ball): boolean {
    return ball.y - ball.radius > this.canvasHeight;
  }

  public checkPaddleCollision(ball: Ball, paddle: Paddle): boolean {
    const ballBox = ball.getCollisionBox();
    const paddleBox = paddle.getCollisionBox();

    if (!this.checkAABBCollision(ballBox, paddleBox)) {
      return false;
    }

    if (ball.vy <= 0) {
      return false;
    }

    const closestX = Math.max(paddleBox.x, Math.min(ball.x, paddleBox.x + paddleBox.width));
    const closestY = Math.max(paddleBox.y, Math.min(ball.y, paddleBox.y + paddleBox.height));

    const distanceX = ball.x - closestX;
    const distanceY = ball.y - closestY;
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

    if (distance < ball.radius) {
      const hitX = ball.x;
      const angle = paddle.getReflectionAngle(hitX);
      const speed = Math.hypot(ball.vx, ball.vy);

      ball.vx = Math.sin(angle) * speed;
      ball.vy = -Math.abs(Math.cos(angle) * speed) * RESTITUTION;

      ball.y = paddleBox.y - ball.radius;

      return true;
    }

    return false;
  }

  public checkBrickCollision(ball: Ball): CollisionResult {
    const ballBox = ball.getCollisionBox();
    const candidates = this.spatialHash.query(ballBox);

    let result: CollisionResult = { hit: false, side: null };
    let closestDistance = Infinity;

    for (const brick of candidates) {
      if (!brick.active) continue;

      const collision = this.checkBallBrickCollision(ball, brick);
      if (collision.hit) {
        const box = brick.getCollisionBox();
        const brickCenterX = box.x + box.width / 2;
        const brickCenterY = box.y + box.height / 2;
        const dist = Math.hypot(ball.x - brickCenterX, ball.y - brickCenterY);

        if (dist < closestDistance) {
          closestDistance = dist;
          result = collision;
        }
      }
    }

    return result;
  }

  private checkBallBrickCollision(ball: Ball, brick: Brick): CollisionResult {
    const box = brick.getCollisionBox();

    const closestX = Math.max(box.x, Math.min(ball.x, box.x + box.width));
    const closestY = Math.max(box.y, Math.min(ball.y, box.y + box.height));

    const distanceX = ball.x - closestX;
    const distanceY = ball.y - closestY;
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

    if (distance >= ball.radius) {
      return { hit: false, side: null };
    }

    let side: 'top' | 'bottom' | 'left' | 'right' = 'top';
    const overlapX = ball.radius - Math.abs(distanceX);
    const overlapY = ball.radius - Math.abs(distanceY);

    if (overlapX < overlapY) {
      if (distanceX > 0) {
        side = 'left';
        ball.x = box.x + box.width + ball.radius;
        ball.vx = Math.abs(ball.vx) * RESTITUTION;
      } else {
        side = 'right';
        ball.x = box.x - ball.radius;
        ball.vx = -Math.abs(ball.vx) * RESTITUTION;
      }
    } else {
      if (distanceY > 0) {
        side = 'bottom';
        ball.y = box.y + box.height + ball.radius;
        ball.vy = Math.abs(ball.vy) * RESTITUTION;
      } else {
        side = 'top';
        ball.y = box.y - ball.radius;
        ball.vy = -Math.abs(ball.vy) * RESTITUTION;
      }
    }

    return { hit: true, side, brick };
  }

  public checkPowerUpPaddleCollision(powerUp: PowerUp, paddle: Paddle): boolean {
    const puBox = powerUp.getCollisionBox();
    const paddleBox = paddle.getCollisionBox();
    return this.checkAABBCollision(puBox, paddleBox);
  }

  private checkAABBCollision(a: CollisionBox, b: CollisionBox): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  public rebuildSpatialHash(bricks: Brick[]): void {
    this.spatialHash.clear();
    for (const brick of bricks) {
      this.spatialHash.insert(brick);
    }
  }
}
