export interface Vector2D {
  x: number;
  y: number;
}

export interface Ball {
  position: Vector2D;
  velocity: Vector2D;
  radius: number;
}

export type ObstacleType = 'rect' | 'circle' | 'slope';

export interface RectObstacle {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleObstacle {
  type: 'circle';
  x: number;
  y: number;
  radius: number;
}

export interface SlopeObstacle {
  type: 'slope';
  x: number;
  y: number;
  width: number;
  height: number;
  direction: 'left' | 'right';
}

export type Obstacle = RectObstacle | CircleObstacle | SlopeObstacle;

export interface Particle {
  position: Vector2D;
  velocity: Vector2D;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export interface PhysicsResult {
  ball: Ball;
  particles: Particle[];
  collisionOccurred: boolean;
}

const GRAVITY = 2.0;
const RESTITUTION = 0.85;
const BALL_RADIUS = 11;

export function createBall(x: number, y: number): Ball {
  return {
    position: { x, y },
    velocity: { x: 0, y: 0 },
    radius: BALL_RADIUS
  };
}

export function launchBall(ball: Ball, angle: number, power: number): Ball {
  return {
    ...ball,
    velocity: {
      x: Math.cos(angle) * power,
      y: Math.sin(angle) * power
    }
  };
}

export function updatePhysics(
  ball: Ball,
  obstacles: Obstacle[],
  deltaTime: number,
  canvasWidth: number,
  canvasHeight: number
): PhysicsResult {
  const newBall = {
    position: { ...ball.position },
    velocity: { ...ball.velocity },
    radius: ball.radius
  };

  const particles: Particle[] = [];
  let collisionOccurred = false;

  newBall.velocity.y += GRAVITY * deltaTime * 60;

  newBall.position.x += newBall.velocity.x * deltaTime * 60;
  newBall.position.y += newBall.velocity.y * deltaTime * 60;

  for (const obstacle of obstacles) {
    let collided = false;
    let collisionNormal: Vector2D = { x: 0, y: 0 };

    if (obstacle.type === 'rect') {
      const result = checkRectCollision(newBall, obstacle);
      if (result.collided) {
        collided = true;
        collisionNormal = result.normal;
        newBall.position = result.newPosition;
      }
    } else if (obstacle.type === 'circle') {
      const result = checkCircleCollision(newBall, obstacle);
      if (result.collided) {
        collided = true;
        collisionNormal = result.normal;
        newBall.position = result.newPosition;
      }
    } else if (obstacle.type === 'slope') {
      const result = checkSlopeCollision(newBall, obstacle);
      if (result.collided) {
        collided = true;
        collisionNormal = result.normal;
        newBall.position = result.newPosition;
      }
    }

    if (collided) {
      collisionOccurred = true;
      const dot = newBall.velocity.x * collisionNormal.x + newBall.velocity.y * collisionNormal.y;
      newBall.velocity.x = (newBall.velocity.x - 2 * dot * collisionNormal.x) * RESTITUTION;
      newBall.velocity.y = (newBall.velocity.y - 2 * dot * collisionNormal.y) * RESTITUTION;

      const collisionPoint = {
        x: newBall.position.x - collisionNormal.x * newBall.radius,
        y: newBall.position.y - collisionNormal.y * newBall.radius
      };
      const newParticles = createCollisionParticles(collisionPoint, collisionNormal);
      particles.push(...newParticles);
    }
  }

  if (newBall.position.x - newBall.radius < 0) {
    newBall.position.x = newBall.radius;
    newBall.velocity.x = -newBall.velocity.x * RESTITUTION;
    collisionOccurred = true;
    particles.push(...createCollisionParticles(
      { x: 0, y: newBall.position.y },
      { x: 1, y: 0 }
    ));
  }
  if (newBall.position.x + newBall.radius > canvasWidth) {
    newBall.position.x = canvasWidth - newBall.radius;
    newBall.velocity.x = -newBall.velocity.x * RESTITUTION;
    collisionOccurred = true;
    particles.push(...createCollisionParticles(
      { x: canvasWidth, y: newBall.position.y },
      { x: -1, y: 0 }
    ));
  }
  if (newBall.position.y - newBall.radius < 0) {
    newBall.position.y = newBall.radius;
    newBall.velocity.y = -newBall.velocity.y * RESTITUTION;
    collisionOccurred = true;
    particles.push(...createCollisionParticles(
      { x: newBall.position.x, y: 0 },
      { x: 0, y: 1 }
    ));
  }

  return { ball: newBall, particles, collisionOccurred };
}

function checkRectCollision(
  ball: Ball,
  rect: RectObstacle
): { collided: boolean; normal: Vector2D; newPosition: Vector2D } {
  const closestX = Math.max(rect.x, Math.min(ball.position.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(ball.position.y, rect.y + rect.height));

  const distX = ball.position.x - closestX;
  const distY = ball.position.y - closestY;
  const distance = Math.sqrt(distX * distX + distY * distY);

  if (distance < ball.radius && distance > 0) {
    const normal = { x: distX / distance, y: distY / distance };
    const overlap = ball.radius - distance;
    const newPosition = {
      x: ball.position.x + normal.x * overlap,
      y: ball.position.y + normal.y * overlap
    };
    return { collided: true, normal, newPosition };
  }

  return { collided: false, normal: { x: 0, y: 0 }, newPosition: ball.position };
}

function checkCircleCollision(
  ball: Ball,
  circle: CircleObstacle
): { collided: boolean; normal: Vector2D; newPosition: Vector2D } {
  const distX = ball.position.x - circle.x;
  const distY = ball.position.y - circle.y;
  const distance = Math.sqrt(distX * distX + distY * distY);
  const minDistance = ball.radius + circle.radius;

  if (distance < minDistance && distance > 0) {
    const normal = { x: distX / distance, y: distY / distance };
    const overlap = minDistance - distance;
    const newPosition = {
      x: ball.position.x + normal.x * overlap,
      y: ball.position.y + normal.y * overlap
    };
    return { collided: true, normal, newPosition };
  }

  return { collided: false, normal: { x: 0, y: 0 }, newPosition: ball.position };
}

function checkSlopeCollision(
  ball: Ball,
  slope: SlopeObstacle
): { collided: boolean; normal: Vector2D; newPosition: Vector2D } {
  let slopeNormal: Vector2D;
  
  if (slope.direction === 'right') {
    slopeNormal = { x: -Math.SQRT1_2, y: Math.SQRT1_2 };
  } else {
    slopeNormal = { x: Math.SQRT1_2, y: Math.SQRT1_2 };
  }

  const relX = ball.position.x - slope.x;
  const relY = ball.position.y - slope.y;

  if (relX < 0 || relX > slope.width || relY < -slope.height || relY > slope.height) {
    return { collided: false, normal: { x: 0, y: 0 }, newPosition: ball.position };
  }

  let slopeYAtX: number;
  if (slope.direction === 'right') {
    slopeYAtX = slope.height - (relX / slope.width) * slope.height;
  } else {
    slopeYAtX = (relX / slope.width) * slope.height;
  }

  const dist = (relY - slopeYAtX) * slopeNormal.y;

  if (dist < ball.radius && dist > -ball.radius) {
    const overlap = ball.radius - dist;
    const newPosition = {
      x: ball.position.x + slopeNormal.x * overlap,
      y: ball.position.y + slopeNormal.y * overlap
    };

    const bottomY = slope.y + slope.height;
    if (ball.position.y + ball.radius > bottomY && relX >= 0 && relX <= slope.width) {
      const bottomDist = ball.position.y + ball.radius - bottomY;
      if (bottomDist > 0 && dist > 0) {
        return {
          collided: true,
          normal: { x: 0, y: 1 },
          newPosition: { x: ball.position.x, y: bottomY - ball.radius }
        };
      }
    }

    return { collided: true, normal: slopeNormal, newPosition };
  }

  return { collided: false, normal: { x: 0, y: 0 }, newPosition: ball.position };
}

function createCollisionParticles(position: Vector2D, normal: Vector2D): Particle[] {
  const particles: Particle[] = [];
  const particleCount = Math.floor(Math.random() * 3) + 3;
  const colors = ['#ff8c00', '#ffa500', '#ffffff', '#ffd700'];

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.atan2(normal.y, normal.x) + (Math.random() - 0.5) * Math.PI * 0.8;
    const speed = Math.random() * 3 + 2;

    particles.push({
      position: { ...position },
      velocity: {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed
      },
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 0.5,
      maxLife: 0.5,
      size: Math.random() * 3 + 2
    });
  }

  return particles;
}

export function updateParticles(particles: Particle[], deltaTime: number): Particle[] {
  return particles
    .map(p => ({
      ...p,
      position: {
        x: p.position.x + p.velocity.x * deltaTime * 60,
        y: p.position.y + p.velocity.y * deltaTime * 60
      },
      life: p.life - deltaTime
    }))
    .filter(p => p.life > 0);
}

export function isBallOutOfBounds(ball: Ball, canvasHeight: number): boolean {
  return ball.position.y > canvasHeight + 50;
}
