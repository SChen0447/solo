import { GravityDirection, Vector2 } from './types';
import { lerp, clamp } from './utils';

export interface PhysicsPlayer {
  vx: number;
  vy: number;
  targetVx: number;
  targetVy: number;
}

export class Physics {
  private static readonly GRAVITY_STRENGTH = 0.5;
  private static readonly MAX_FALL_SPEED = 8;
  private static readonly LERP_SPEED = 0.15;
  private static readonly MAX_LERP_STEP = 0.02;

  public static getGravityVector(dir: GravityDirection): Vector2 {
    switch (dir) {
      case GravityDirection.DOWN:
        return { x: 0, y: this.GRAVITY_STRENGTH };
      case GravityDirection.UP:
        return { x: 0, y: -this.GRAVITY_STRENGTH };
      case GravityDirection.LEFT:
        return { x: -this.GRAVITY_STRENGTH, y: 0 };
      case GravityDirection.RIGHT:
        return { x: this.GRAVITY_STRENGTH, y: 0 };
    }
  }

  public static applyGravity(
    player: PhysicsPlayer,
    gravityDir: GravityDirection,
    deltaTime: number = 1
  ): void {
    const gravity = this.getGravityVector(gravityDir);
    const lerpFactor = Math.min(this.LERP_SPEED * deltaTime, this.MAX_LERP_STEP * 60);

    const rawTargetVx = player.targetVx + gravity.x * deltaTime;
    const rawTargetVy = player.targetVy + gravity.y * deltaTime;

    player.targetVx = this.clampVelocityAxis(rawTargetVx, gravityDir, 'x');
    player.targetVy = this.clampVelocityAxis(rawTargetVy, gravityDir, 'y');

    player.vx = lerp(player.vx, player.targetVx, lerpFactor);
    player.vy = lerp(player.vy, player.targetVy, lerpFactor);

    player.vx = clamp(player.vx, -this.MAX_FALL_SPEED, this.MAX_FALL_SPEED);
    player.vy = clamp(player.vy, -this.MAX_FALL_SPEED, this.MAX_FALL_SPEED);
  }

  private static clampVelocityAxis(
    velocity: number,
    gravityDir: GravityDirection,
    axis: 'x' | 'y'
  ): number {
    const isGravityAxis =
      (axis === 'y' && (gravityDir === GravityDirection.DOWN || gravityDir === GravityDirection.UP)) ||
      (axis === 'x' && (gravityDir === GravityDirection.LEFT || gravityDir === GravityDirection.RIGHT));

    if (isGravityAxis) {
      return clamp(velocity, -this.MAX_FALL_SPEED, this.MAX_FALL_SPEED);
    }
    return velocity;
  }

  public static stopAxis(player: PhysicsPlayer, axis: 'x' | 'y'): void {
    if (axis === 'x') {
      player.vx = 0;
      player.targetVx = 0;
    } else {
      player.vy = 0;
      player.targetVy = 0;
    }
  }

  public static applyJump(
    player: PhysicsPlayer,
    gravityDir: GravityDirection,
    jumpForce: number
  ): void {
    const gravity = this.getGravityVector(gravityDir);
    player.targetVx -= gravity.x * jumpForce;
    player.targetVy -= gravity.y * jumpForce;
    player.vx = player.targetVx;
    player.vy = player.targetVy;
  }

  public static applyHorizontalMovement(
    player: PhysicsPlayer,
    input: number,
    gravityDir: GravityDirection,
    moveSpeed: number,
    onGround: boolean
  ): void {
    const isVerticalGravity =
      gravityDir === GravityDirection.DOWN || gravityDir === GravityDirection.UP;

    const accel = onGround ? 0.5 : 0.25;
    const friction = onGround ? 0.85 : 0.95;

    if (isVerticalGravity) {
      if (input !== 0) {
        player.targetVx += input * accel;
        player.targetVx = clamp(player.targetVx, -moveSpeed, moveSpeed);
      } else {
        player.targetVx *= friction;
        if (Math.abs(player.targetVx) < 0.1) player.targetVx = 0;
      }
    } else {
      if (input !== 0) {
        player.targetVy += input * accel;
        player.targetVy = clamp(player.targetVy, -moveSpeed, moveSpeed);
      } else {
        player.targetVy *= friction;
        if (Math.abs(player.targetVy) < 0.1) player.targetVy = 0;
      }
    }
  }

  public static getMaxFallSpeed(): number {
    return this.MAX_FALL_SPEED;
  }
}
