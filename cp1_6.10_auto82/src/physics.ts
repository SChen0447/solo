export const TRACK_LENGTH = 1600;
export const TRACK_WIDTH = 400;
export const STONE_RADIUS = 20;
export const FRICTION = 0.02;
export const ELASTICITY = 0.8;
export const MAX_ANGULAR_VELOCITY = 0.5;
export const INNER_RING_RADIUS = 20;
export const MIDDLE_RING_RADIUS = 40;
export const OUTER_RING_RADIUS = 80;

export interface Stone {
  id: number;
  team: 'red' | 'yellow';
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angularVelocity: number;
  isMoving: boolean;
  stopped: boolean;
  scored: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  type: 'ice' | 'spark';
}

export function createStone(
  id: number,
  team: 'red' | 'yellow',
  x: number,
  y: number
): Stone {
  return {
    id,
    team,
    x,
    y,
    vx: 0,
    vy: 0,
    angle: 0,
    angularVelocity: 0,
    isMoving: false,
    stopped: false,
    scored: false,
  };
}

export function launchStone(
  stone: Stone,
  power: number,
  angle: number
): void {
  const speed = power * 0.8;
  stone.vx = Math.cos(angle) * speed;
  stone.vy = Math.sin(angle) * speed;
  stone.angularVelocity = -(power / 100) * MAX_ANGULAR_VELOCITY;
  stone.isMoving = true;
  stone.stopped = false;
}

function applyFriction(stone: Stone, sweepActive: boolean): void {
  const speed = Math.sqrt(stone.vx * stone.vx + stone.vy * stone.vy);
  if (speed < 0.01) {
    stone.vx = 0;
    stone.vy = 0;
    stone.isMoving = false;
    stone.stopped = true;
    return;
  }
  const effectiveFriction = sweepActive ? FRICTION * 0.8 : FRICTION;
  const deceleration = effectiveFriction;
  const newSpeed = Math.max(0, speed - deceleration);
  const ratio = newSpeed / speed;
  stone.vx *= ratio;
  stone.vy *= ratio;

  if (stone.angularVelocity > 0.001) {
    stone.angularVelocity *= 0.995;
  } else {
    stone.angularVelocity = 0;
  }
}

function applyCurvature(stone: Stone): void {
  if (Math.abs(stone.angularVelocity) < 0.001) return;
  const speed = Math.sqrt(stone.vx * stone.vx + stone.vy * stone.vy);
  if (speed < 0.1) return;
  const curvature = stone.angularVelocity * 0.02;
  const angle = Math.atan2(stone.vy, stone.vx) + curvature;
  stone.vx = Math.cos(angle) * speed;
  stone.vy = Math.sin(angle) * speed;
}

function resolveCollision(a: Stone, b: Stone): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = STONE_RADIUS * 2;

  if (dist < minDist && dist > 0) {
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minDist - dist;
    a.x -= (nx * overlap) / 2;
    a.y -= (ny * overlap) / 2;
    b.x += (nx * overlap) / 2;
    b.y += (ny * overlap) / 2;

    const dvx = a.vx - b.vx;
    const dvy = a.vy - b.vy;
    const dvn = dvx * nx + dvy * ny;

    if (dvn > 0) {
      const impulse = dvn * ELASTICITY;
      a.vx -= impulse * nx;
      a.vy -= impulse * ny;
      b.vx += impulse * nx;
      b.vy += impulse * ny;

      a.isMoving = true;
      a.stopped = false;
      b.isMoving = true;
      b.stopped = false;
    }
  }
}

function checkWallCollision(stone: Stone): void {
  const leftBound = 50;
  const rightBound = TRACK_WIDTH - 50;

  if (stone.x - STONE_RADIUS < leftBound) {
    stone.x = leftBound + STONE_RADIUS;
    stone.vx = Math.abs(stone.vx) * ELASTICITY;
  } else if (stone.x + STONE_RADIUS > rightBound) {
    stone.x = rightBound - STONE_RADIUS;
    stone.vx = -Math.abs(stone.vx) * ELASTICITY;
  }

  if (stone.y - STONE_RADIUS < 50) {
    stone.y = 50 + STONE_RADIUS;
    stone.vy = Math.abs(stone.vy) * ELASTICITY;
  } else if (stone.y + STONE_RADIUS > TRACK_LENGTH - 50) {
    stone.y = TRACK_LENGTH - 50 - STONE_RADIUS;
    stone.vy = -Math.abs(stone.vy) * ELASTICITY;
  }
}

export function updateStones(
  stones: Stone[],
  sweepActive: boolean,
  sweepStoneId: number | null
): Particle[] {
  const newParticles: Particle[] = [];

  for (let i = 0; i < stones.length; i++) {
    const stone = stones[i];
    if (!stone.isMoving) continue;

    const stoneSweepActive = sweepActive && sweepStoneId === stone.id;
    applyCurvature(stone);
    stone.x += stone.vx;
    stone.y += stone.vy;
    stone.angle += stone.angularVelocity;
    applyFriction(stone, stoneSweepActive);
    checkWallCollision(stone);

    const speed = Math.sqrt(stone.vx * stone.vx + stone.vy * stone.vy);
    if (speed > 0.5) {
      const particleCount = Math.min(2, Math.floor(speed / 2));
      for (let p = 0; p < particleCount; p++) {
        newParticles.push({
          x: stone.x + (Math.random() - 0.5) * STONE_RADIUS,
          y: stone.y + (Math.random() - 0.5) * STONE_RADIUS,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          life: 120,
          maxLife: 120,
          size: 2 + Math.random() * 2,
          type: 'ice',
        });
      }
    }
  }

  for (let i = 0; i < stones.length; i++) {
    for (let j = i + 1; j < stones.length; j++) {
      const beforeIAngle = stones[i].angle;
      resolveCollision(stones[i], stones[j]);
      if (beforeIAngle !== stones[i].angle || (stones[i].isMoving && stones[j].isMoving)) {
        for (let p = 0; p < 5; p++) {
          const midX = (stones[i].x + stones[j].x) / 2;
          const midY = (stones[i].y + stones[j].y) / 2;
          const angle = Math.random() * Math.PI * 2;
          newParticles.push({
            x: midX,
            y: midY,
            vx: Math.cos(angle) * (1 + Math.random() * 2),
            vy: Math.sin(angle) * (1 + Math.random() * 2),
            life: 30,
            maxLife: 30,
            size: 1.5 + Math.random() * 1.5,
            type: 'spark',
          });
        }
      }
    }
  }

  return newParticles;
}

export function updateParticles(particles: Particle[]): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.type === 'ice') {
      p.vx *= 0.98;
      p.vy *= 0.98;
    } else {
      p.vx *= 0.95;
      p.vy *= 0.95;
    }
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
  if (particles.length > 500) {
    particles.splice(0, particles.length - 500);
  }
}

export function allStonesStopped(stones: Stone[]): boolean {
  return stones.every((s) => s.stopped || !s.isMoving);
}

export function getHouseCenter(which: 'far' | 'near'): { x: number; y: number } {
  const centerX = TRACK_WIDTH / 2;
  const centerY = which === 'far' ? 250 : TRACK_LENGTH - 250;
  return { x: centerX, y: centerY };
}

export function calculateScore(
  stones: Stone[]
): { red: number; yellow: number; mvpStoneId: number | null } {
  const house = getHouseCenter('far');
  let redCount = 0;
  let yellowCount = 0;
  let closestTeam: 'red' | 'yellow' | null = null;
  let closestDist = Infinity;
  let mvpStoneId: number | null = null;

  const stonesInHouse = stones.filter((s) => {
    const dist = Math.sqrt(
      Math.pow(s.x - house.x, 2) + Math.pow(s.y - house.y, 2)
    );
    return dist <= OUTER_RING_RADIUS;
  });

  stonesInHouse.forEach((s) => {
    const dist = Math.sqrt(
      Math.pow(s.x - house.x, 2) + Math.pow(s.y - house.y, 2)
    );
    if (dist < closestDist) {
      closestDist = dist;
      closestTeam = s.team;
      mvpStoneId = s.id;
    }
  });

  if (!closestTeam) {
    return { red: 0, yellow: 0, mvpStoneId: null };
  }

  stonesInHouse.forEach((s) => {
    if (s.team !== closestTeam) return;
    const dist = Math.sqrt(
      Math.pow(s.x - house.x, 2) + Math.pow(s.y - house.y, 2)
    );
    if (dist <= INNER_RING_RADIUS) {
      if (s.team === 'red') redCount += 1;
      else yellowCount += 1;
    } else if (dist <= MIDDLE_RING_RADIUS) {
      if (s.team === 'red') redCount += 0.5;
      else yellowCount += 0.5;
    }
  });

  return { red: redCount, yellow: yellowCount, mvpStoneId };
}
