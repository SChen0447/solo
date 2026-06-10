export interface Vec2 {
  x: number;
  y: number;
}

export interface ShipParticle {
  x: number;
  y: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface Ship {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  angle: number;
  trail: ShipParticle[];
}

export interface CometTrailParticle {
  x: number;
  y: number;
  alpha: number;
  radius: number;
}

export interface Comet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  angle: number;
  trail: CometTrailParticle[];
}

export interface ExplosionParticle {
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface Star {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

export interface NebulaParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
}

const COMET_COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'];

let cometIdCounter = 0;

export function createShip(canvasWidth: number, canvasHeight: number): Ship {
  return {
    x: canvasWidth / 2,
    y: canvasHeight / 2,
    targetX: canvasWidth / 2,
    targetY: canvasHeight / 2,
    angle: 0,
    trail: []
  };
}

export function createShipParticle(x: number, y: number): ShipParticle {
  return {
    x,
    y,
    alpha: 0.8,
    life: 0,
    maxLife: 10
  };
}

export function createComet(canvasWidth: number, canvasHeight: number, speedMultiplier: number = 1): Comet {
  const side = Math.floor(Math.random() * 4);
  let x: number, y: number, vx: number, vy: number;
  const baseSpeed = (1.5 + Math.random() * 1.5) * speedMultiplier;

  switch (side) {
    case 0:
      x = Math.random() * canvasWidth;
      y = -30;
      vx = (Math.random() - 0.5) * baseSpeed;
      vy = baseSpeed;
      break;
    case 1:
      x = canvasWidth + 30;
      y = Math.random() * canvasHeight;
      vx = -baseSpeed;
      vy = (Math.random() - 0.5) * baseSpeed;
      break;
    case 2:
      x = Math.random() * canvasWidth;
      y = canvasHeight + 30;
      vx = (Math.random() - 0.5) * baseSpeed;
      vy = -baseSpeed;
      break;
    default:
      x = -30;
      y = Math.random() * canvasHeight;
      vx = baseSpeed;
      vy = (Math.random() - 0.5) * baseSpeed;
  }

  return {
    id: cometIdCounter++,
    x,
    y,
    vx,
    vy,
    radius: 12 + Math.random() * 6,
    color: COMET_COLORS[Math.floor(Math.random() * COMET_COLORS.length)],
    angle: Math.atan2(vy, vx),
    trail: []
  };
}

export function createCometTrailParticle(x: number, y: number, _color: string): CometTrailParticle {
  return {
    x,
    y,
    alpha: 1,
    radius: 3 + Math.random() * 3
  };
}

export function createExplosionParticles(comet: Comet): ExplosionParticle[] {
  const particles: ExplosionParticle[] = [];
  for (let i = 0; i < 40; i++) {
    const angle = (Math.PI * 2 * i) / 40 + Math.random() * 0.2;
    const distance = 20 + Math.random() * 20;
    particles.push({
      x: comet.x,
      y: comet.y,
      startX: comet.x,
      startY: comet.y,
      targetX: comet.x + Math.cos(angle) * distance,
      targetY: comet.y + Math.sin(angle) * distance,
      radius: 2 + Math.random() * 3,
      color: comet.color,
      life: 0,
      maxLife: 0.4
    });
  }
  return particles;
}

export function createStars(canvasWidth: number, canvasHeight: number, count: number = 400): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const baseAlpha = 0.1 + Math.random() * 0.7;
    stars.push({
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight,
      radius: 1 + Math.random() * 2,
      alpha: baseAlpha,
      baseAlpha,
      twinkleSpeed: 0.5 + Math.random() * 1.5,
      twinkleOffset: Math.random() * Math.PI * 2
    });
  }
  return stars;
}

export function createNebulaParticles(canvasWidth: number, canvasHeight: number, count: number = 50): NebulaParticle[] {
  const particles: NebulaParticle[] = [];
  const colors = ['#4d96ff', '#9b59b6', '#e74c3c', '#f39c12', '#1abc9c'];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      radius: 30 + Math.random() * 60,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 0.03 + Math.random() * 0.05
    });
  }
  return particles;
}
