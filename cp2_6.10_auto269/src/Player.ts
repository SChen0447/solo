import { GravityDirection, Rect, Vector2 } from './types';
import { Physics, PhysicsPlayer } from './Physics';

export class Player implements PhysicsPlayer {
  public x: number;
  public y: number;
  public readonly width: number = 16;
  public readonly height: number = 16;

  public vx: number = 0;
  public vy: number = 0;
  public targetVx: number = 0;
  public targetVy: number = 0;

  public gravityDir: GravityDirection = GravityDirection.DOWN;

  public onGround: boolean = false;
  public readonly jumpForce: number = 10;
  public readonly moveSpeed: number = 4;

  public spawnX: number;
  public spawnY: number;

  private animFrame: number = 0;
  private animTimer: number = 0;

  constructor(startX: number, startY: number) {
    this.x = startX;
    this.y = startY;
    this.spawnX = startX;
    this.spawnY = startY;
  }

  public getRect(): Rect {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  public getCenter(): Vector2 {
    return {
      x: this.x + this.width / 2,
      y: this.y + this.height / 2
    };
  }

  public update(
    horizontalInput: number,
    gravityDir: GravityDirection,
    wantJump: boolean,
    deltaTime: number = 1
  ): void {
    this.gravityDir = gravityDir;

    Physics.applyHorizontalMovement(
      this,
      horizontalInput,
      gravityDir,
      this.moveSpeed,
      this.onGround
    );

    if (wantJump && this.onGround) {
      Physics.applyJump(this, gravityDir, this.jumpForce);
      this.onGround = false;
    }

    Physics.applyGravity(this, gravityDir, deltaTime);

    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;

    this.animTimer += deltaTime;
    if (this.animTimer > 8) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 4;
    }
  }

  public setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  public resetVelocity(): void {
    this.vx = 0;
    this.vy = 0;
    this.targetVx = 0;
    this.targetVy = 0;
  }

  public respawn(): void {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.resetVelocity();
    this.gravityDir = GravityDirection.DOWN;
    this.onGround = false;
  }

  public setSpawn(x: number, y: number): void {
    this.spawnX = x;
    this.spawnY = y;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const px = Math.floor(this.x);
    const py = Math.floor(this.y);

    ctx.save();
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 8;

    this.drawPixelBody(ctx, px, py);
    this.drawPixelEyes(ctx, px, py);

    ctx.restore();
  }

  private drawPixelBody(ctx: CanvasRenderingContext2D, px: number, py: number): void {
    ctx.fillStyle = '#00ffff';

    ctx.fillRect(px + 2, py + 2, 12, 12);
    ctx.fillStyle = '#00cccc';
    ctx.fillRect(px + 2, py + 12, 12, 2);

    ctx.fillStyle = '#66ffff';
    ctx.fillRect(px + 2, py + 2, 12, 2);
    ctx.fillRect(px + 2, py + 2, 2, 12);
  }

  private drawPixelEyes(ctx: CanvasRenderingContext2D, px: number, py: number): void {
    ctx.fillStyle = '#ffffff';

    switch (this.gravityDir) {
      case GravityDirection.DOWN:
        ctx.fillRect(px + 5, py + 6, 2, 2);
        ctx.fillRect(px + 10, py + 6, 2, 2);
        break;
      case GravityDirection.UP:
        ctx.fillRect(px + 5, py + 9, 2, 2);
        ctx.fillRect(px + 10, py + 9, 2, 2);
        break;
      case GravityDirection.LEFT:
        ctx.fillRect(px + 9, py + 5, 2, 2);
        ctx.fillRect(px + 9, py + 10, 2, 2);
        break;
      case GravityDirection.RIGHT:
        ctx.fillRect(px + 5, py + 5, 2, 2);
        ctx.fillRect(px + 5, py + 10, 2, 2);
        break;
    }

    ctx.fillStyle = '#000033';
    switch (this.gravityDir) {
      case GravityDirection.DOWN:
        ctx.fillRect(px + 6, py + 7, 1, 1);
        ctx.fillRect(px + 11, py + 7, 1, 1);
        break;
      case GravityDirection.UP:
        ctx.fillRect(px + 6, py + 9, 1, 1);
        ctx.fillRect(px + 11, py + 9, 1, 1);
        break;
      case GravityDirection.LEFT:
        ctx.fillRect(px + 9, py + 6, 1, 1);
        ctx.fillRect(px + 9, py + 11, 1, 1);
        break;
      case GravityDirection.RIGHT:
        ctx.fillRect(px + 5, py + 6, 1, 1);
        ctx.fillRect(px + 5, py + 11, 1, 1);
        break;
    }
  }
}
