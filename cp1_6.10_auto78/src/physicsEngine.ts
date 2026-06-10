import * as THREE from 'three';

export interface Ball {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radius: number;
}

export interface RectObstacle {
  id: number;
  position: THREE.Vector3;
  width: number;
  depth: number;
  height: number;
  restitution: number;
  color: string;
  temporary?: boolean;
  expireTime?: number;
}

export interface CircleObstacle {
  id: number;
  position: THREE.Vector3;
  radius: number;
  height: number;
  restitution: number;
  color: string;
}

export interface Paddle {
  position: THREE.Vector3;
  width: number;
  height: number;
  depth: number;
  restitution: number;
}

export interface Wall {
  min: THREE.Vector3;
  max: THREE.Vector3;
  restitution: number;
  normal: THREE.Vector3;
}

export interface CollisionEvent {
  type: 'wall' | 'obstacle' | 'paddle' | 'scoreZone';
  position: THREE.Vector3;
  color?: string;
  zoneType?: string;
  zoneValue?: number;
}

const GRAVITY = new THREE.Vector3(0, -9.8, 0);
const TABLE_WIDTH = 16;
const TABLE_HEIGHT = 9;
const WALL_THICKNESS = 0.3;
const BALL_RADIUS = 0.3;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function getWalls(): Wall[] {
  const halfW = TABLE_WIDTH / 2;
  const halfH = TABLE_HEIGHT / 2;
  const t = WALL_THICKNESS;
  const restitution = 0.85;

  return [
    {
      min: new THREE.Vector3(-halfW - t, 0, -halfH - t),
      max: new THREE.Vector3(halfW + t, 1, -halfH),
      restitution,
      normal: new THREE.Vector3(0, 0, 1),
    },
    {
      min: new THREE.Vector3(-halfW - t, 0, halfH),
      max: new THREE.Vector3(halfW + t, 1, halfH + t),
      restitution,
      normal: new THREE.Vector3(0, 0, -1),
    },
    {
      min: new THREE.Vector3(-halfW - t, 0, -halfH),
      max: new THREE.Vector3(-halfW, 1, halfH),
      restitution,
      normal: new THREE.Vector3(1, 0, 0),
    },
    {
      min: new THREE.Vector3(halfW, 0, -halfH),
      max: new THREE.Vector3(halfW + t, 1, halfH),
      restitution,
      normal: new THREE.Vector3(-1, 0, 0),
    },
  ];
}

export function isBallOutsideTable(ball: Ball): boolean {
  return ball.position.y < -1;
}

export function calculateCollisions(
  ball: Ball,
  paddle: Paddle,
  rectObstacles: RectObstacle[],
  circleObstacles: CircleObstacle[],
  walls: Wall[]
): CollisionEvent[] {
  const events: CollisionEvent[] = [];
  const halfW = TABLE_WIDTH / 2;
  const halfH = TABLE_HEIGHT / 2;

  for (const wall of walls) {
    if (checkBoxCollision(ball, wall.min, wall.max, wall.normal, wall.restitution)) {
      events.push({ type: 'wall', position: ball.position.clone(), color: '#1a237e' });
    }
  }

  const paddleMin = new THREE.Vector3(
    paddle.position.x - paddle.width / 2,
    paddle.position.y - paddle.height / 2,
    paddle.position.z - paddle.depth / 2
  );
  const paddleMax = new THREE.Vector3(
    paddle.position.x + paddle.width / 2,
    paddle.position.y + paddle.height / 2,
    paddle.position.z + paddle.depth / 2
  );
  const paddleNormal = new THREE.Vector3(0, 1, 0);
  if (checkBoxCollision(ball, paddleMin, paddleMax, paddleNormal, paddle.restitution)) {
    const hitPos = ball.position.x - paddle.position.x;
    ball.velocity.x += hitPos * 2;
    events.push({ type: 'paddle', position: ball.position.clone(), color: '#8ec5fc' });
  }

  for (const obs of rectObstacles) {
    const obsMin = new THREE.Vector3(
      obs.position.x - obs.width / 2,
      obs.position.y - obs.height / 2,
      obs.position.z - obs.depth / 2
    );
    const obsMax = new THREE.Vector3(
      obs.position.x + obs.width / 2,
      obs.position.y + obs.height / 2,
      obs.position.z + obs.depth / 2
    );
    const normal = new THREE.Vector3();
    if (checkRectObstacleCollision(ball, obsMin, obsMax, obs.restitution, normal)) {
      events.push({ type: 'obstacle', position: ball.position.clone(), color: obs.color });
    }
  }

  for (const obs of circleObstacles) {
    if (checkCircleCollision(ball, obs)) {
      events.push({ type: 'obstacle', position: ball.position.clone(), color: obs.color });
    }
  }

  return events;
}

function checkBoxCollision(
  ball: Ball,
  min: THREE.Vector3,
  max: THREE.Vector3,
  preferredNormal: THREE.Vector3,
  restitution: number
): boolean {
  const closest = new THREE.Vector3(
    clamp(ball.position.x, min.x, max.x),
    clamp(ball.position.y, min.y, max.y),
    clamp(ball.position.z, min.z, max.z)
  );
  const diff = new THREE.Vector3().subVectors(ball.position, closest);
  const dist = diff.length();

  if (dist < ball.radius && dist > 0) {
    const normal = preferredNormal.lengthSq() > 0
      ? preferredNormal.clone().normalize()
      : diff.normalize();
    ball.position.add(normal.multiplyScalar(ball.radius - dist + 0.001));
    const dot = ball.velocity.dot(normal);
    if (dot < 0) {
      ball.velocity.sub(normal.multiplyScalar(dot * (1 + restitution)));
    }
    return true;
  }
  return false;
}

function checkRectObstacleCollision(
  ball: Ball,
  min: THREE.Vector3,
  max: THREE.Vector3,
  restitution: number,
  outNormal: THREE.Vector3
): boolean {
  const closest = new THREE.Vector3(
    clamp(ball.position.x, min.x, max.x),
    clamp(ball.position.y, min.y, max.y),
    clamp(ball.position.z, min.z, max.z)
  );
  const diff = new THREE.Vector3().subVectors(ball.position, closest);
  const distSq = diff.lengthSq();

  if (distSq < ball.radius * ball.radius) {
    const dist = Math.sqrt(distSq);
    if (dist > 0.0001) {
      outNormal.copy(diff).divideScalar(dist);
    } else {
      const dx = (min.x + max.x) / 2 - ball.position.x;
      const dz = (min.z + max.z) / 2 - ball.position.z;
      if (Math.abs(dx) > Math.abs(dz)) {
        outNormal.set(dx > 0 ? -1 : 1, 0, 0);
      } else {
        outNormal.set(0, 0, dz > 0 ? -1 : 1);
      }
    }
    ball.position.add(outNormal.clone().multiplyScalar(ball.radius - dist + 0.001));
    const dot = ball.velocity.dot(outNormal);
    if (dot < 0) {
      ball.velocity.sub(outNormal.clone().multiplyScalar(dot * (1 + restitution)));
    }
    return true;
  }
  return false;
}

function checkCircleCollision(ball: Ball, obs: CircleObstacle): boolean {
  const dx = ball.position.x - obs.position.x;
  const dz = ball.position.z - obs.position.z;
  const dy = ball.position.y - obs.position.y;
  const distSqXZ = dx * dx + dz * dz;
  const minDist = ball.radius + obs.radius;
  const inYRange = Math.abs(dy) < (ball.radius + obs.height / 2);

  if (distSqXZ < minDist * minDist && inYRange) {
    const dist = Math.sqrt(distSqXZ);
    if (dist > 0.0001) {
      const nx = dx / dist;
      const nz = dz / dist;
      ball.position.x += nx * (minDist - dist + 0.001);
      ball.position.z += nz * (minDist - dist + 0.001);
      const dot = ball.velocity.x * nx + ball.velocity.z * nz;
      if (dot < 0) {
        ball.velocity.x -= nx * dot * (1 + obs.restitution);
        ball.velocity.z -= nz * dot * (1 + obs.restitution);
      }
    }
    return true;
  }
  return false;
}

export function updatePhysics(
  ball: Ball,
  deltaTime: number,
  friction: number = 0.998
): void {
  const dt = Math.min(deltaTime, 1 / 60);
  ball.velocity.add(GRAVITY.clone().multiplyScalar(dt));
  ball.position.add(ball.velocity.clone().multiplyScalar(dt));
  ball.velocity.multiplyScalar(friction);

  const maxSpeed = 25;
  const speed = ball.velocity.length();
  if (speed > maxSpeed) {
    ball.velocity.multiplyScalar(maxSpeed / speed);
  }
}
