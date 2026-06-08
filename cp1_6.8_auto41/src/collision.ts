export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Circle {
  x: number;
  y: number;
  radius: number;
}

export interface Wall {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function checkBallWallCollision(
  ball: Circle & { vx: number; vy: number },
  wall: Wall
): { collided: boolean; newVx: number; newVy: number } {
  let newVx = ball.vx;
  let newVy = ball.vy;
  let collided = false;

  if (ball.x - ball.radius <= wall.left) {
    newVx = Math.abs(newVx);
    collided = true;
  }
  if (ball.x + ball.radius >= wall.right) {
    newVx = -Math.abs(newVx);
    collided = true;
  }
  if (ball.y - ball.radius <= wall.top) {
    newVy = Math.abs(newVy);
    collided = true;
  }
  if (ball.y + ball.radius >= wall.bottom) {
    newVy = -Math.abs(newVy);
    collided = true;
  }

  return { collided, newVx, newVy };
}

export function checkBallRectCollision(
  ball: Circle,
  rect: Rect
): boolean {
  const closestX = Math.max(rect.x, Math.min(ball.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(ball.y, rect.y + rect.height));

  const distanceX = ball.x - closestX;
  const distanceY = ball.y - closestY;

  return (distanceX * distanceX + distanceY * distanceY) < (ball.radius * ball.radius);
}

export function checkRectRectCollision(
  rect1: Rect,
  rect2: Rect
): boolean {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

export function clampRectToWall(
  rect: Rect,
  wall: Wall
): { x: number; y: number } {
  let x = rect.x;
  let y = rect.y;

  if (x < wall.left) x = wall.left;
  if (x + rect.width > wall.right) x = wall.right - rect.width;
  if (y < wall.top) y = wall.top;
  if (y + rect.height > wall.bottom) y = wall.bottom - rect.height;

  return { x, y };
}
