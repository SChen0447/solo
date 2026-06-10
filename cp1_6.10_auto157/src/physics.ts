export interface Vector2 {
  x: number;
  y: number;
}

export interface Ball {
  pos: Vector2;
  vel: Vector2;
  targetVel: Vector2;
  radius: number;
}

export interface Magnet {
  pos: Vector2;
  type: 'N' | 'S';
  size: number;
  isDragging: boolean;
}

export interface Blade {
  center: Vector2;
  angle: number;
  angularVel: number;
  length: number;
  width: number;
  count: number;
}

export interface Particle {
  pos: Vector2;
  vel: Vector2;
  life: number;
  maxLife: number;
  size: number;
}

export interface Level {
  walls: number[][];
  start: Vector2;
  endArea: { x: number; y: number; w: number; h: number };
  bladeConfigs: Array<{ center: Vector2; angularVel: number }>;
}

export const GRID_SIZE = 15;
export const CELL_SIZE = 30;
export const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
export const MAX_FORCE = 5;
export const LERP_ALPHA = 0.9;
export const FORCE_RADIUS = 80;
export const MAGNET_SIZE = 36;
export const BALL_RADIUS = 6;
export const BLADE_LENGTH = 20;
export const BLADE_WIDTH = 4;
export const BLADE_ANGULAR_VEL = 0.02;
export const BOUNCE_DAMPING = 0.8;

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function dist(a: Vector2, b: Vector2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function normalize(v: Vector2): Vector2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function createLevels(): Level[] {
  const W = 1, O = 0;

  const level1: Level = {
    walls: [
      [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
      [W,O,O,O,O,O,O,O,O,O,O,O,O,O,W],
      [W,O,O,O,O,O,O,O,O,O,O,O,O,O,W],
      [W,O,O,W,W,W,W,O,O,O,W,W,W,O,W],
      [W,O,O,O,O,O,W,O,O,O,O,O,W,O,W],
      [W,O,O,O,O,O,W,O,O,O,O,O,W,O,W],
      [W,O,O,W,O,O,W,O,W,W,O,O,W,O,W],
      [W,O,O,W,O,O,O,O,O,W,O,O,O,O,W],
      [W,O,O,W,W,W,W,O,O,W,O,O,O,O,W],
      [W,O,O,O,O,O,O,O,O,W,W,W,W,O,W],
      [W,O,O,O,W,W,W,W,O,O,O,O,O,O,W],
      [W,O,O,O,O,O,O,W,O,O,O,O,O,O,W],
      [W,O,W,W,W,O,O,W,O,O,W,W,W,O,W],
      [W,O,O,O,O,O,O,O,O,O,O,O,O,O,W],
      [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
    ],
    start: { x: 1, y: 1 },
    endArea: { x: 12, y: 12, w: 3, h: 3 },
    bladeConfigs: [
      { center: { x: 7 * CELL_SIZE + CELL_SIZE / 2, y: 7 * CELL_SIZE + CELL_SIZE / 2 }, angularVel: BLADE_ANGULAR_VEL },
      { center: { x: 4 * CELL_SIZE + CELL_SIZE / 2, y: 11 * CELL_SIZE + CELL_SIZE / 2 }, angularVel: -BLADE_ANGULAR_VEL },
    ],
  };

  const level2: Level = {
    walls: [
      [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
      [W,O,O,O,O,O,O,O,O,O,O,O,O,O,W],
      [W,O,W,W,W,O,W,W,W,W,W,O,W,O,W],
      [W,O,O,O,W,O,O,O,O,O,W,O,W,O,W],
      [W,W,W,O,W,W,W,W,W,O,W,O,W,O,W],
      [W,O,O,O,O,O,O,O,O,O,W,O,W,O,W],
      [W,O,W,W,W,W,W,W,W,O,W,O,W,O,W],
      [W,O,W,O,O,O,O,O,O,O,W,O,O,O,W],
      [W,O,W,O,W,W,W,W,W,W,W,W,W,O,W],
      [W,O,W,O,O,O,O,O,O,O,O,O,O,O,W],
      [W,O,W,W,W,W,W,W,W,W,W,W,W,O,W],
      [W,O,O,O,O,O,O,O,O,O,O,O,O,O,W],
      [W,O,W,W,W,W,W,W,W,W,W,W,W,O,W],
      [W,O,O,O,O,O,O,O,O,O,O,O,O,O,W],
      [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
    ],
    start: { x: 1, y: 1 },
    endArea: { x: 12, y: 12, w: 3, h: 3 },
    bladeConfigs: [
      { center: { x: 3 * CELL_SIZE + CELL_SIZE / 2, y: 5 * CELL_SIZE + CELL_SIZE / 2 }, angularVel: BLADE_ANGULAR_VEL },
      { center: { x: 11 * CELL_SIZE + CELL_SIZE / 2, y: 9 * CELL_SIZE + CELL_SIZE / 2 }, angularVel: -BLADE_ANGULAR_VEL },
    ],
  };

  const level3: Level = {
    walls: [
      [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
      [W,O,O,O,W,O,O,O,O,O,W,O,O,O,W],
      [W,O,W,O,W,O,W,W,W,O,W,O,W,O,W],
      [W,O,W,O,O,O,W,O,W,O,O,O,W,O,W],
      [W,O,W,W,W,W,W,O,W,W,W,W,W,O,W],
      [W,O,O,O,O,O,O,O,O,O,O,O,O,O,W],
      [W,W,W,O,W,W,W,O,W,W,W,O,W,W,W],
      [W,O,O,O,W,O,O,O,O,O,W,O,O,O,W],
      [W,O,W,W,W,O,W,W,W,O,W,W,W,O,W],
      [W,O,O,O,O,O,W,O,W,O,O,O,O,O,W],
      [W,W,W,W,W,O,W,O,W,O,W,W,W,W,W],
      [W,O,O,O,O,O,O,O,O,O,O,O,O,O,W],
      [W,O,W,W,W,W,W,W,W,W,W,W,W,O,W],
      [W,O,O,O,O,O,O,O,O,O,O,O,O,O,W],
      [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
    ],
    start: { x: 1, y: 1 },
    endArea: { x: 12, y: 12, w: 3, h: 3 },
    bladeConfigs: [
      { center: { x: 7 * CELL_SIZE + CELL_SIZE / 2, y: 5 * CELL_SIZE + CELL_SIZE / 2 }, angularVel: BLADE_ANGULAR_VEL },
      { center: { x: 7 * CELL_SIZE + CELL_SIZE / 2, y: 9 * CELL_SIZE + CELL_SIZE / 2 }, angularVel: -BLADE_ANGULAR_VEL },
    ],
  };

  return [level1, level2, level3];
}

export function computeMagneticForce(ball: Ball, magnets: Magnet[]): Vector2 {
  let fx = 0;
  let fy = 0;
  const k = 800;

  for (const magnet of magnets) {
    const dx = magnet.pos.x - ball.pos.x;
    const dy = magnet.pos.y - ball.pos.y;
    const dSq = dx * dx + dy * dy;
    const d = Math.sqrt(dSq);

    if (d < 1) continue;

    let force = k / Math.max(dSq, 100);
    force = Math.min(force, MAX_FORCE);

    const nx = dx / d;
    const ny = dy / d;

    if (magnet.type === 'N') {
      fx += nx * force;
      fy += ny * force;
    } else {
      fx -= nx * force;
      fy -= ny * force;
    }
  }

  const total = Math.sqrt(fx * fx + fy * fy);
  if (total > MAX_FORCE) {
    fx = (fx / total) * MAX_FORCE;
    fy = (fy / total) * MAX_FORCE;
  }

  return { x: fx, y: fy };
}

export function checkWallCollision(
  ball: Ball,
  walls: number[][]
): { collided: boolean; normal: Vector2 } {
  const gx = Math.floor(ball.pos.x / CELL_SIZE);
  const gy = Math.floor(ball.pos.y / CELL_SIZE);

  const neighbors = [
    { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
    { dx: -1, dy: 0 },  { dx: 0, dy: 0 },  { dx: 1, dy: 0 },
    { dx: -1, dy: 1 },  { dx: 0, dy: 1 },  { dx: 1, dy: 1 },
  ];

  let collided = false;
  let nxAcc = 0;
  let nyAcc = 0;

  for (const n of neighbors) {
    const cx = gx + n.dx;
    const cy = gy + n.dy;
    if (cx < 0 || cx >= GRID_SIZE || cy < 0 || cy >= GRID_SIZE) continue;
    if (walls[cy][cx] !== 1) continue;

    const cellLeft = cx * CELL_SIZE;
    const cellTop = cy * CELL_SIZE;
    const cellRight = cellLeft + CELL_SIZE;
    const cellBottom = cellTop + CELL_SIZE;

    const closestX = Math.max(cellLeft, Math.min(ball.pos.x, cellRight));
    const closestY = Math.max(cellTop, Math.min(ball.pos.y, cellBottom));

    const dx = ball.pos.x - closestX;
    const dy = ball.pos.y - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq < ball.radius * ball.radius) {
      collided = true;
      const d = Math.sqrt(distSq) || 0.01;
      const overlap = ball.radius - d;
      ball.pos.x += (dx / d) * overlap;
      ball.pos.y += (dy / d) * overlap;
      nxAcc += dx / d;
      nyAcc += dy / d;
    }
  }

  const len = Math.sqrt(nxAcc * nxAcc + nyAcc * nyAcc);
  if (len > 0) {
    nxAcc /= len;
    nyAcc /= len;
  }

  return { collided, normal: { x: nxAcc, y: nyAcc } };
}

export function checkBladeCollision(ball: Ball, blade: Blade): boolean {
  for (let i = 0; i < blade.count; i++) {
    const bladeAngle = blade.angle + (i * Math.PI * 2) / blade.count;
    const halfLen = blade.length / 2;

    const cosA = Math.cos(bladeAngle);
    const sinA = Math.sin(bladeAngle);

    const startX = blade.center.x - cosA * halfLen;
    const startY = blade.center.y - sinA * halfLen;
    const endX = blade.center.x + cosA * halfLen;
    const endY = blade.center.y + sinA * halfLen;

    const ex = endX - startX;
    const ey = endY - startY;
    const lenSq = ex * ex + ey * ey;

    const px = ball.pos.x - startX;
    const py = ball.pos.y - startY;

    let t = (px * ex + py * ey) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const closestX = startX + t * ex;
    const closestY = startY + t * ey;

    const dx = ball.pos.x - closestX;
    const dy = ball.pos.y - closestY;
    const distSq = dx * dx + dy * dy;
    const collisionDist = ball.radius + blade.width / 2;

    if (distSq < collisionDist * collisionDist) {
      const d = Math.sqrt(distSq) || 0.01;
      const overlap = collisionDist - d;
      ball.pos.x += (dx / d) * overlap;
      ball.pos.y += (dy / d) * overlap;

      const vDotN = ball.vel.x * (dx / d) + ball.vel.y * (dy / d);
      if (vDotN < 0) {
        ball.vel.x -= (1 + BOUNCE_DAMPING) * vDotN * (dx / d);
        ball.vel.y -= (1 + BOUNCE_DAMPING) * vDotN * (dy / d);
      }
      return true;
    }
  }
  return false;
}

export function checkEndArea(ball: Ball, endArea: Level['endArea']): boolean {
  const left = endArea.x * CELL_SIZE;
  const top = endArea.y * CELL_SIZE;
  const right = (endArea.x + endArea.w) * CELL_SIZE;
  const bottom = (endArea.y + endArea.h) * CELL_SIZE;
  return ball.pos.x >= left && ball.pos.x <= right &&
         ball.pos.y >= top && ball.pos.y <= bottom;
}

export function clampToBounds(ball: Ball): void {
  const minX = ball.radius;
  const minY = ball.radius;
  const maxX = CANVAS_SIZE - ball.radius;
  const maxY = CANVAS_SIZE - ball.radius;

  if (ball.pos.x < minX) { ball.pos.x = minX; ball.vel.x = Math.abs(ball.vel.x) * BOUNCE_DAMPING; }
  if (ball.pos.x > maxX) { ball.pos.x = maxX; ball.vel.x = -Math.abs(ball.vel.x) * BOUNCE_DAMPING; }
  if (ball.pos.y < minY) { ball.pos.y = minY; ball.vel.y = Math.abs(ball.vel.y) * BOUNCE_DAMPING; }
  if (ball.pos.y > maxY) { ball.pos.y = maxY; ball.vel.y = -Math.abs(ball.vel.y) * BOUNCE_DAMPING; }
}

export function createHeartParticles(center: Vector2, count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const speed = 1 + Math.random() * 2.5;
    particles.push({
      pos: { x: center.x, y: center.y },
      vel: {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed - 0.5,
      },
      life: 180,
      maxLife: 180,
      size: 8 + Math.random() * 6,
    });
  }
  return particles;
}

export function updateParticles(particles: Particle[]): Particle[] {
  return particles.filter(p => {
    p.pos.x += p.vel.x;
    p.pos.y += p.vel.y;
    p.vel.y += 0.02;
    p.life--;
    return p.life > 0;
  });
}
