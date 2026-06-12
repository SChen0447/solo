export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ShardData {
  id: number;
  x: number;
  y: number;
}

export interface SawTrap {
  type: 'saw';
  centerX: number;
  centerY: number;
  radius: number;
  angle: number;
  speed: number;
}

export interface SpikeTrap {
  type: 'spike';
  x: number;
  y: number;
  baseY: number;
  width: number;
  height: number;
  phase: number;
  speed: number;
  range: number;
}

export interface LaserTrap {
  type: 'laser';
  x: number;
  y: number;
  width: number;
  height: number;
  direction: number;
  speed: number;
  minX: number;
  maxX: number;
}

export type Trap = SawTrap | SpikeTrap | LaserTrap;

export interface AABB {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LevelData {
  platforms: Platform[];
  shards: ShardData[];
  traps: Trap[];
  goalX: number;
  goalY: number;
  goalWidth: number;
  goalHeight: number;
  playerStartX: number;
  playerStartY: number;
  worldWidth: number;
  worldHeight: number;
}

export function createLevel(): LevelData {
  return {
    worldWidth: 1600,
    worldHeight: 600,
    playerStartX: 60,
    playerStartY: 440,
    goalX: 1480,
    goalY: 340,
    goalWidth: 60,
    goalHeight: 160,
    platforms: [
      { x: 0, y: 540, width: 1600, height: 60 },
      { x: 180, y: 460, width: 120, height: 20 },
      { x: 360, y: 400, width: 100, height: 20 },
      { x: 520, y: 460, width: 140, height: 20 },
      { x: 720, y: 380, width: 120, height: 20 },
      { x: 900, y: 320, width: 100, height: 20 },
      { x: 1060, y: 400, width: 120, height: 20 },
      { x: 1240, y: 340, width: 100, height: 20 },
      { x: 1400, y: 500, width: 200, height: 20 },
      { x: 440, y: 260, width: 80, height: 20 },
      { x: 620, y: 220, width: 80, height: 20 },
    ],
    shards: [
      { id: 0, x: 240, y: 420 },
      { id: 1, x: 410, y: 360 },
      { id: 2, x: 780, y: 340 },
      { id: 3, x: 950, y: 280 },
      { id: 4, x: 1290, y: 300 },
      { id: 5, x: 480, y: 220 },
      { id: 6, x: 660, y: 180 },
    ],
    traps: [
      {
        type: 'saw',
        centerX: 450,
        centerY: 500,
        radius: 50,
        angle: 0,
        speed: 0.05,
      },
      {
        type: 'saw',
        centerX: 980,
        centerY: 450,
        radius: 60,
        angle: Math.PI,
        speed: -0.04,
      },
      {
        type: 'spike',
        x: 680,
        y: 540,
        baseY: 540,
        width: 60,
        height: 20,
        phase: 0,
        speed: 0.03,
        range: 50,
      },
      {
        type: 'spike',
        x: 1160,
        y: 540,
        baseY: 540,
        width: 60,
        height: 20,
        phase: Math.PI,
        speed: 0.035,
        range: 50,
      },
      {
        type: 'laser',
        x: 300,
        y: 340,
        width: 100,
        height: 8,
        direction: 1,
        speed: 1.5,
        minX: 180,
        maxX: 480,
      },
      {
        type: 'laser',
        x: 1000,
        y: 260,
        width: 120,
        height: 8,
        direction: -1,
        speed: 1.8,
        minX: 900,
        maxX: 1180,
      },
    ],
  };
}

export function cloneTrap(trap: Trap): Trap {
  return { ...trap };
}

export function cloneTraps(traps: Trap[]): Trap[] {
  return traps.map(cloneTrap);
}

export function updateTraps(traps: Trap[]): void {
  for (const trap of traps) {
    switch (trap.type) {
      case 'saw':
        trap.angle += trap.speed;
        break;
      case 'spike':
        trap.phase += trap.speed;
        trap.y = trap.baseY - Math.abs(Math.sin(trap.phase)) * trap.range;
        break;
      case 'laser':
        trap.x += trap.speed * trap.direction;
        if (trap.x <= trap.minX) {
          trap.x = trap.minX;
          trap.direction = 1;
        } else if (trap.x + trap.width >= trap.maxX) {
          trap.x = trap.maxX - trap.width;
          trap.direction = -1;
        }
        break;
    }
  }
}

export function aabbOverlap(a: AABB, b: AABB): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function circleRectOverlap(
  cx: number,
  cy: number,
  cr: number,
  rect: AABB
): boolean {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.height));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < cr * cr;
}

export function getSawPosition(saw: SawTrap): { x: number; y: number } {
  return {
    x: saw.centerX + Math.cos(saw.angle) * saw.radius,
    y: saw.centerY + Math.sin(saw.angle) * saw.radius,
  };
}

export function getTrapAABB(trap: Trap): AABB | null {
  switch (trap.type) {
    case 'spike':
      return { x: trap.x, y: trap.y, width: trap.width, height: trap.height };
    case 'laser':
      return { x: trap.x, y: trap.y, width: trap.width, height: trap.height };
    default:
      return null;
  }
}

export function checkPlayerTrapCollision(
  playerBox: AABB,
  traps: Trap[]
): boolean {
  for (const trap of traps) {
    switch (trap.type) {
      case 'saw': {
        const pos = getSawPosition(trap);
        if (circleRectOverlap(pos.x, pos.y, 18, playerBox)) {
          return true;
        }
        break;
      }
      case 'spike':
      case 'laser': {
        const box = getTrapAABB(trap);
        if (box && aabbOverlap(playerBox, box)) {
          return true;
        }
        break;
      }
    }
  }
  return false;
}

export function resolvePlatformCollisionX(
  box: AABB,
  vx: number,
  platforms: Platform[]
): number {
  const testBox: AABB = { ...box, x: box.x + vx };
  for (const p of platforms) {
    if (aabbOverlap(testBox, p)) {
      if (vx > 0) {
        return p.x - box.width - box.x;
      } else if (vx < 0) {
        return p.x + p.width - box.x;
      }
    }
  }
  return vx;
}

export function resolvePlatformCollisionY(
  box: AABB,
  vy: number,
  platforms: Platform[]
): { vy: number; onGround: boolean } {
  const testBox: AABB = { ...box, y: box.y + vy };
  let onGround = false;
  for (const p of platforms) {
    if (aabbOverlap(testBox, p)) {
      if (vy > 0) {
        onGround = true;
        return { vy: p.y - box.height - box.y, onGround: true };
      } else if (vy < 0) {
        return { vy: p.y + p.height - box.y, onGround: false };
      }
    }
  }
  return { vy, onGround };
}
