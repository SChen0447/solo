import type { BrickGrid, Brick } from './brick';
import { getBricksInArea, hitBrick } from './brick';
import type { Paddle } from './paddle';
import { triggerFlash } from './paddle';

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  speedMultiplier: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const BALL_RADIUS = 8;
const INITIAL_VY = -5;
const INITIAL_VX_RANGE = 3;

export function createBall(speedBoost: number = 0): Ball {
  const dir = Math.random() < 0.5 ? -1 : 1;
  const vx = dir * (2 + Math.random() * INITIAL_VX_RANGE);
  const vy = INITIAL_VY - speedBoost;
  const normalizedSpeed = Math.sqrt(vx * vx + vy * vy);
  const baseSpeed = 5 + speedBoost;
  const scale = baseSpeed / normalizedSpeed;

  return {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 80,
    vx: vx * scale,
    vy: vy * scale,
    radius: BALL_RADIUS,
    speedMultiplier: 1
  };
}

export function updateBall(ball: Ball): { lost: boolean } {
  ball.x += ball.vx;
  ball.y += ball.vy;

  let lost = false;

  if (ball.x - ball.radius <= 0) {
    ball.x = ball.radius;
    ball.vx = Math.abs(ball.vx);
  } else if (ball.x + ball.radius >= CANVAS_WIDTH) {
    ball.x = CANVAS_WIDTH - ball.radius;
    ball.vx = -Math.abs(ball.vx);
  }

  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius;
    ball.vy = Math.abs(ball.vy);
  } else if (ball.y - ball.radius >= CANVAS_HEIGHT) {
    lost = true;
  }

  return { lost };
}

function circleRectCollision(
  cx: number, cy: number, cr: number,
  rx: number, ry: number, rw: number, rh: number
): { hit: boolean; side: 'top' | 'bottom' | 'left' | 'right' | null } {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  const distanceSq = dx * dx + dy * dy;

  if (distanceSq <= cr * cr) {
    const dist = Math.sqrt(distanceSq) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    const centerX = rx + rw / 2;
    const centerY = ry + rh / 2;
    const toCenterX = cx - centerX;
    const toCenterY = cy - centerY;

    const rectHalfW = rw / 2;
    const rectHalfH = rh / 2;

    const overlapX = rectHalfW + cr - Math.abs(toCenterX);
    const overlapY = rectHalfH + cr - Math.abs(toCenterY);

    if (overlapX < overlapY) {
      return { hit: true, side: toCenterX > 0 ? 'right' : 'left' };
    } else {
      return { hit: true, side: toCenterY > 0 ? 'bottom' : 'top' };
    }
  }

  return { hit: false, side: null };
}

export function checkCollision(ball: Ball, paddle: Paddle, grid: BrickGrid): { brickHit: boolean } {
  let brickHit = false;

  const paddleCollision = circleRectCollision(
    ball.x, ball.y, ball.radius,
    paddle.x, paddle.y, paddle.width, paddle.height
  );

  if (paddleCollision.hit && ball.vy > 0) {
    const relX = (ball.x - paddle.x) / paddle.width;
    const angleRange = relX * 2 - 1;
    const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

    const maxHorizontalSpeed = 5;
    const minHorizontalSpeed = Math.abs(ball.vx) * 0.3;

    if (Math.abs(angleRange) > 0.3) {
      ball.vx = angleRange * maxHorizontalSpeed;
    } else {
      ball.vx = angleRange * minHorizontalSpeed;
    }

    const newVxSq = ball.vx * ball.vx;
    const targetVySq = Math.max(currentSpeed * currentSpeed - newVxSq, 1);
    ball.vy = -Math.sqrt(targetVySq);
    ball.y = paddle.y - ball.radius;
    triggerFlash(paddle);
  }

  const nearbyBricks = getBricksInArea(grid, ball.x, ball.y, ball.radius + 20);
  for (const brick of nearbyBricks) {
    if (!brick.alive) continue;

    const collision = circleRectCollision(
      ball.x, ball.y, ball.radius,
      brick.x, brick.y, brick.width, brick.height
    );

    if (collision.hit) {
      hitBrick(grid, brick);
      brickHit = true;

      if (collision.side === 'top' || collision.side === 'bottom') {
        ball.vy = -ball.vy;
        if (collision.side === 'top') {
          ball.y = brick.y - ball.radius;
        } else {
          ball.y = brick.y + brick.height + ball.radius;
        }
      } else {
        ball.vx = -ball.vx;
        if (collision.side === 'left') {
          ball.x = brick.x - ball.radius;
        } else {
          ball.x = brick.x + brick.width + ball.radius;
        }
      }
      break;
    }
  }

  return { brickHit };
}
