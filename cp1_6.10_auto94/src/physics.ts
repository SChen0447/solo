export interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

export interface CollisionEffect {
  x: number;
  y: number;
  age: number;
  duration: number;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export class Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  color: string;
  trail: TrailPoint[];
  id: number;
  createdAt: number;

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    radius: number,
    mass: number,
    color: string,
    id: number
  ) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.mass = mass;
    this.color = color;
    this.trail = [];
    this.id = id;
    this.createdAt = performance.now();
  }
}

export const GRAVITY = 9.8 * 60;
export const RESTITUTION = 0.85;
export const MAX_TRAIL_LENGTH = 20;
export const MAX_BALLS = 15;
export const CANVAS_WIDTH = 900;
export const CANVAS_HEIGHT = 600;

export const PLATFORM_COLORS = [
  '#0d47a1',
  '#1565c0',
  '#1976d2',
  '#1e88e5',
  '#42a5f5'
];

export function createPlatforms(): Platform[] {
  const platforms: Platform[] = [];
  const platformHeight = 50;
  const baseWidth = 900;
  const decrement = 80;
  const startY = CANVAS_HEIGHT - platformHeight * 5;

  for (let i = 0; i < 5; i++) {
    const width = baseWidth - decrement * i * 2;
    const x = (CANVAS_WIDTH - width) / 2;
    const y = startY + i * platformHeight;
    platforms.push({
      x,
      y,
      width,
      height: platformHeight,
      color: PLATFORM_COLORS[i]
    });
  }
  return platforms;
}

export const BALL_PALETTE = [
  '#e91e63',
  '#9c27b0',
  '#00bcd4',
  '#ff9800',
  '#4caf50'
];

export function createInitialBalls(): Ball[] {
  const balls: Ball[] = [];
  for (let i = 0; i < 3; i++) {
    const x = 100 + i * 60 + Math.random() * 20 - 10;
    const y = 100 + i * 30 + Math.random() * 20 - 10;
    balls.push(new Ball(x, y, 0, 0, 15, 1, '#ff5722', i));
  }
  return balls;
}

export function createRandomBall(
  x: number,
  y: number,
  id: number
): Ball {
  const radius = 12 + Math.random() * 8;
  const mass = 0.8 + Math.random() * 0.7;
  const color = BALL_PALETTE[Math.floor(Math.random() * BALL_PALETTE.length)];
  const vx = (Math.random() - 0.5) * 6;
  const vy = -5 + Math.random() * 4;
  return new Ball(x, y, vx, vy, radius, mass, color, id);
}

export function updateBallTrail(ball: Ball): void {
  ball.trail.push({ x: ball.x, y: ball.y, age: 0 });
  if (ball.trail.length > MAX_TRAIL_LENGTH) {
    ball.trail.shift();
  }
  for (const point of ball.trail) {
    point.age++;
  }
}

export function applyGravity(ball: Ball, dt: number): void {
  ball.vy += GRAVITY * dt;
}

export function updatePosition(ball: Ball, dt: number): void {
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
}

export function resolveWallCollision(ball: Ball): void {
  if (ball.x - ball.radius < 0) {
    ball.x = ball.radius;
    ball.vx = -ball.vx * RESTITUTION;
  } else if (ball.x + ball.radius > CANVAS_WIDTH) {
    ball.x = CANVAS_WIDTH - ball.radius;
    ball.vx = -ball.vx * RESTITUTION;
  }

  if (ball.y - ball.radius < 0) {
    ball.y = ball.radius;
    ball.vy = -ball.vy * RESTITUTION;
  }
}

export function resolvePlatformCollision(
  ball: Ball,
  platforms: Platform[]
): boolean {
  for (const platform of platforms) {
    const closestX = Math.max(platform.x, Math.min(ball.x, platform.x + platform.width));
    const closestY = Math.max(platform.y, Math.min(ball.y, platform.y + platform.height));
    const dx = ball.x - closestX;
    const dy = ball.y - closestY;
    const distanceSq = dx * dx + dy * dy;

    if (distanceSq < ball.radius * ball.radius) {
      const distance = Math.sqrt(distanceSq) || 0.001;
      const nx = dx / distance;
      const ny = dy / distance;

      const overlap = ball.radius - distance;
      ball.x += nx * overlap;
      ball.y += ny * overlap;

      const dotProduct = ball.vx * nx + ball.vy * ny;
      if (dotProduct < 0) {
        ball.vx = (ball.vx - 2 * dotProduct * nx) * RESTITUTION;
        ball.vy = (ball.vy - 2 * dotProduct * ny) * RESTITUTION;
      }
      return true;
    }
  }
  return false;
}

export function resolveBallCollision(
  ball1: Ball,
  ball2: Ball
): boolean {
  const dx = ball2.x - ball1.x;
  const dy = ball2.y - ball1.y;
  const minDist = ball1.radius + ball2.radius;
  const distanceSq = dx * dx + dy * dy;

  if (distanceSq < minDist * minDist) {
    const distance = Math.sqrt(distanceSq) || 0.001;
    const nx = dx / distance;
    const ny = dy / distance;

    const overlap = (minDist - distance) / 2;
    ball1.x -= nx * overlap;
    ball1.y -= ny * overlap;
    ball2.x += nx * overlap;
    ball2.y += ny * overlap;

    const dvx = ball2.vx - ball1.vx;
    const dvy = ball2.vy - ball1.vy;
    const dvDotN = dvx * nx + dvy * ny;

    if (dvDotN > 0) {
      return false;
    }

    const m1 = ball1.mass;
    const m2 = ball2.mass;
    const impulse = (-2 * dvDotN) / (m1 + m2);

    ball1.vx -= impulse * m2 * nx;
    ball1.vy -= impulse * m2 * ny;
    ball2.vx += impulse * m1 * nx;
    ball2.vy += impulse * m1 * ny;

    return true;
  }
  return false;
}

export function getCollisionPoint(ball1: Ball, ball2: Ball): { x: number; y: number } {
  const t = ball1.radius / (ball1.radius + ball2.radius);
  return {
    x: ball1.x + (ball2.x - ball1.x) * t,
    y: ball1.y + (ball2.y - ball1.y) * t
  };
}

export function getWallCollisionPoint(ball: Ball): { x: number; y: number } | null {
  if (ball.x - ball.radius <= 1) return { x: 0, y: ball.y };
  if (ball.x + ball.radius >= CANVAS_WIDTH - 1) return { x: CANVAS_WIDTH, y: ball.y };
  if (ball.y - ball.radius <= 1) return { x: ball.x, y: 0 };
  return null;
}

export function calculateTotalKineticEnergy(balls: Ball[]): number {
  let ke = 0;
  for (const ball of balls) {
    const speedSq = ball.vx * ball.vx + ball.vy * ball.vy;
    ke += 0.5 * ball.mass * speedSq;
  }
  return ke;
}

export function calculateTotalMomentum(balls: Ball[]): { px: number; py: number } {
  let px = 0;
  let py = 0;
  for (const ball of balls) {
    px += ball.mass * ball.vx;
    py += ball.mass * ball.vy;
  }
  return { px, py };
}
