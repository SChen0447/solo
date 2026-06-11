import { Firefly, Vec2, BoidsWeights } from './firefly';

export interface BoidsConfig {
  separationDistance: number;
  alignmentNeighbors: number;
  cohesionNeighbors: number;
  maxTurnRate: number;
  randomTurnChance: number;
}

export const DEFAULT_BOIDS_CONFIG: BoidsConfig = {
  separationDistance: 30,
  alignmentNeighbors: 5,
  cohesionNeighbors: 5,
  maxTurnRate: 0.15,
  randomTurnChance: 0.001,
};

interface NeighborInfo {
  firefly: Firefly;
  distance: number;
}

function getNeighbors(
  firefly: Firefly,
  allFireflies: Firefly[],
  maxNeighbors: number,
  maxDistance: number
): NeighborInfo[] {
  const neighbors: NeighborInfo[] = [];
  const maxDistSq = maxDistance * maxDistance;

  for (const other of allFireflies) {
    if (other === firefly || other.isDead) continue;

    const dx = other.x - firefly.x;
    const dy = other.y - firefly.y;
    const distSq = dx * dx + dy * dy;

    if (distSq < maxDistSq && distSq > 0.01) {
      const distance = Math.sqrt(distSq);
      neighbors.push({ firefly: other, distance });
    }
  }

  neighbors.sort((a, b) => a.distance - b.distance);
  return neighbors.slice(0, maxNeighbors);
}

function separation(
  firefly: Firefly,
  neighbors: NeighborInfo[],
  separationDistance: number
): Vec2 {
  let steerX = 0;
  let steerY = 0;
  let count = 0;

  for (const neighbor of neighbors) {
    if (neighbor.distance < separationDistance && neighbor.distance > 0) {
      const dx = firefly.x - neighbor.firefly.x;
      const dy = firefly.y - neighbor.firefly.y;
      const dist = neighbor.distance;

      steerX += (dx / dist) / dist;
      steerY += (dy / dist) / dist;
      count++;
    }
  }

  if (count > 0) {
    steerX /= count;
    steerY /= count;

    const magnitude = Math.sqrt(steerX * steerX + steerY * steerY);
    if (magnitude > 0) {
      steerX = (steerX / magnitude) * firefly.speed * 2;
      steerY = (steerY / magnitude) * firefly.speed * 2;

      steerX -= firefly.vx;
      steerY -= firefly.vy;
    }
  }

  return { x: steerX, y: steerY };
}

function alignment(
  firefly: Firefly,
  neighbors: NeighborInfo[]
): Vec2 {
  if (neighbors.length === 0) {
    return { x: 0, y: 0 };
  }

  let avgVx = 0;
  let avgVy = 0;

  for (const neighbor of neighbors) {
    avgVx += neighbor.firefly.vx;
    avgVy += neighbor.firefly.vy;
  }

  avgVx /= neighbors.length;
  avgVy /= neighbors.length;

  const currentDirX = firefly.vx;
  const currentDirY = firefly.vy;

  const dot = currentDirX * avgVx + currentDirY * avgVy;
  const mag1 = Math.sqrt(currentDirX * currentDirX + currentDirY * currentDirY);
  const mag2 = Math.sqrt(avgVx * avgVx + avgVy * avgVy);

  if (mag1 > 0 && mag2 > 0) {
    const angle = Math.acos(Math.min(1, Math.max(-1, dot / (mag1 * mag2))));
    if (angle < 0.26) {
      return { x: 0, y: 0 };
    }
  }

  const magnitude = Math.sqrt(avgVx * avgVx + avgVy * avgVy);
  if (magnitude > 0) {
    avgVx = (avgVx / magnitude) * firefly.speed;
    avgVy = (avgVy / magnitude) * firefly.speed;
  }

  const steerX = avgVx - firefly.vx;
  const steerY = avgVy - firefly.vy;

  return { x: steerX * 0.5, y: steerY * 0.5 };
}

function cohesion(
  firefly: Firefly,
  neighbors: NeighborInfo[]
): Vec2 {
  if (neighbors.length === 0) {
    return { x: 0, y: 0 };
  }

  let centerX = 0;
  let centerY = 0;

  for (const neighbor of neighbors) {
    centerX += neighbor.firefly.x;
    centerY += neighbor.firefly.y;
  }

  centerX /= neighbors.length;
  centerY /= neighbors.length;

  const dx = centerX - firefly.x;
  const dy = centerY - firefly.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 10) {
    return { x: 0, y: 0 };
  }

  const desiredX = (dx / dist) * firefly.speed;
  const desiredY = (dy / dist) * firefly.speed;

  const steerX = desiredX - firefly.vx;
  const steerY = desiredY - firefly.vy;

  return { x: steerX, y: steerY };
}

function randomTurn(firefly: Firefly): Vec2 {
  if (Math.random() > 0.001) {
    return { x: 0, y: 0 };
  }

  const angle = (Math.random() - 0.5) * Math.PI * 0.5;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const newVx = firefly.vx * cos - firefly.vy * sin;
  const newVy = firefly.vx * sin + firefly.vy * cos;

  return {
    x: (newVx - firefly.vx) * 0.3,
    y: (newVy - firefly.vy) * 0.3,
  };
}

export class BoidsEngine {
  private config: BoidsConfig;
  private weights: BoidsWeights;

  constructor(
    config: Partial<BoidsConfig> = {},
    weights: Partial<BoidsWeights> = {}
  ) {
    this.config = { ...DEFAULT_BOIDS_CONFIG, ...config };
    this.weights = {
      separation: 1.5,
      alignment: 1.0,
      cohesion: 0.5,
      ...weights,
    };
  }

  public setCohesionStrength(strength: number): void {
    this.weights.cohesion = strength;
  }

  public getConfig(): BoidsConfig {
    return { ...this.config };
  }

  public computeAcceleration(
    firefly: Firefly,
    allFireflies: Firefly[]
  ): Vec2 {
    const neighborRadius = 80;
    const maxNeighbors = Math.max(
      this.config.alignmentNeighbors,
      this.config.cohesionNeighbors,
      5
    );

    const neighbors = getNeighbors(firefly, allFireflies, maxNeighbors + 5, neighborRadius);

    const separationForce = separation(firefly, neighbors.slice(0, 3), this.config.separationDistance);
    const alignmentForce = alignment(firefly, neighbors.slice(0, this.config.alignmentNeighbors));
    const cohesionForce = cohesion(firefly, neighbors.slice(0, this.config.cohesionNeighbors));
    const randomForce = randomTurn(firefly);

    const acceleration: Vec2 = {
      x:
        separationForce.x * this.weights.separation +
        alignmentForce.x * this.weights.alignment +
        cohesionForce.x * this.weights.cohesion +
        randomForce.x,
      y:
        separationForce.y * this.weights.separation +
        alignmentForce.y * this.weights.alignment +
        cohesionForce.y * this.weights.cohesion +
        randomForce.y,
    };

    const mag = Math.sqrt(acceleration.x * acceleration.x + acceleration.y * acceleration.y);
    if (mag > this.config.maxTurnRate) {
      acceleration.x = (acceleration.x / mag) * this.config.maxTurnRate;
      acceleration.y = (acceleration.y / mag) * this.config.maxTurnRate;
    }

    return acceleration;
  }
}
