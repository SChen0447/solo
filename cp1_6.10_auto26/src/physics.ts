import type { PolarType } from './levels';

export interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface MagnetState {
  id: string;
  x: number;
  y: number;
  polarity: PolarType;
}

export interface ForceResult {
  netForceX: number;
  netForceY: number;
  activeMagnets: { id: string; distance: number; polarity: PolarType }[];
}

const FRICTION_COEFFICIENT = 0.98;
const MAGNETIC_STRENGTH = 8000;
const MAX_MAGNET_DISTANCE = 150;
const PLAYER_FORCE = 600;

export function calculateMagneticForce(
  ball: BallState,
  magnets: MagnetState[]
): ForceResult {
  let netForceX = 0;
  let netForceY = 0;
  const activeMagnets: { id: string; distance: number; polarity: PolarType }[] = [];

  for (const magnet of magnets) {
    const dx = ball.x - magnet.x;
    const dy = ball.y - magnet.y;
    const distSq = dx * dx + dy * dy;
    const distance = Math.sqrt(distSq);

    if (distance < MAX_MAGNET_DISTANCE && distance > 1) {
      const forceMag = MAGNETIC_STRENGTH / distSq;
      const dirX = dx / distance;
      const dirY = dy / distance;

      if (magnet.polarity === 'N') {
        netForceX += dirX * forceMag;
        netForceY += dirY * forceMag;
      } else {
        netForceX -= dirX * forceMag;
        netForceY -= dirY * forceMag;
      }

      activeMagnets.push({
        id: magnet.id,
        distance,
        polarity: magnet.polarity
      });
    }
  }

  return { netForceX, netForceY, activeMagnets };
}

export function updateBallPhysics(
  ball: BallState,
  magnets: MagnetState[],
  playerInput: { up: boolean; down: boolean; left: boolean; right: boolean },
  deltaTime: number
): ForceResult {
  let forceX = 0;
  let forceY = 0;

  if (playerInput.up) forceY -= PLAYER_FORCE;
  if (playerInput.down) forceY += PLAYER_FORCE;
  if (playerInput.left) forceX -= PLAYER_FORCE;
  if (playerInput.right) forceX += PLAYER_FORCE;

  const magnetic = calculateMagneticForce(ball, magnets);
  forceX += magnetic.netForceX;
  forceY += magnetic.netForceY;

  ball.vx += forceX * deltaTime;
  ball.vy += forceY * deltaTime;

  ball.vx *= FRICTION_COEFFICIENT;
  ball.vy *= FRICTION_COEFFICIENT;

  const maxSpeed = 500;
  const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (currentSpeed > maxSpeed) {
    ball.vx = (ball.vx / currentSpeed) * maxSpeed;
    ball.vy = (ball.vy / currentSpeed) * maxSpeed;
  }

  ball.x += ball.vx * deltaTime;
  ball.y += ball.vy * deltaTime;

  return magnetic;
}

export function resolveWallCollision(
  ball: BallState,
  walls: { x: number; y: number; width: number; height: number }[]
): { collided: boolean; hitX: number; hitY: number } {
  let collided = false;
  let hitX = 0;
  let hitY = 0;

  for (const wall of walls) {
    const closestX = Math.max(wall.x, Math.min(ball.x, wall.x + wall.width));
    const closestY = Math.max(wall.y, Math.min(ball.y, wall.y + wall.height));
    const dx = ball.x - closestX;
    const dy = ball.y - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq < ball.radius * ball.radius) {
      collided = true;
      const distance = Math.sqrt(distSq) || 0.001;
      const overlap = ball.radius - distance;
      const nx = dx / distance;
      const ny = dy / distance;

      ball.x += nx * overlap;
      ball.y += ny * overlap;

      const dot = ball.vx * nx + ball.vy * ny;
      if (dot < 0) {
        ball.vx -= 1.5 * dot * nx;
        ball.vy -= 1.5 * dot * ny;
        ball.vx *= 0.6;
        ball.vy *= 0.6;
      }

      hitX = closestX;
      hitY = closestY;
    }
  }

  return { collided, hitX, hitY };
}

export function checkSpikeCollision(
  ball: BallState,
  spikes: { x: number; y: number; width: number; height: number }[]
): boolean {
  for (const spike of spikes) {
    const closestX = Math.max(spike.x, Math.min(ball.x, spike.x + spike.width));
    const closestY = Math.max(spike.y, Math.min(ball.y, spike.y + spike.height));
    const dx = ball.x - closestX;
    const dy = ball.y - closestY;
    if (dx * dx + dy * dy < ball.radius * ball.radius) {
      return true;
    }
  }
  return false;
}

export function checkGoalReached(
  ball: BallState,
  goalX: number,
  goalY: number,
  goalRadius: number = 50
): boolean {
  const dx = ball.x - goalX;
  const dy = ball.y - goalY;
  return dx * dx + dy * dy < goalRadius * goalRadius;
}

export function checkPortalCollision(
  ball: BallState,
  portals: { id: string; x: number; y: number; targetId: string }[],
  lastPortalId: string | null
): { id: string; targetId: string } | null {
  const portalRadius = 35;
  for (const portal of portals) {
    if (portal.id === lastPortalId) continue;
    const dx = ball.x - portal.x;
    const dy = ball.y - portal.y;
    if (dx * dx + dy * dy < portalRadius * portalRadius) {
      return { id: portal.id, targetId: portal.targetId };
    }
  }
  return null;
}
