export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  radius: number;
  color: string;
  type: 'A' | 'B' | 'custom';
}

export const COLOR_A = '#00E5FF';
export const COLOR_B = '#B388FF';

export function createParticle(
  x: number,
  y: number,
  vx: number,
  vy: number,
  mass: number,
  radius: number,
  color: string,
  type: 'A' | 'B' | 'custom'
): Particle {
  return { x, y, vx, vy, mass, radius, color, type };
}

export function createParticleA(x: number, y: number, vx: number, vy: number): Particle {
  const radius = 8 + Math.random() * 10;
  return createParticle(x, y, vx, vy, 1, radius, COLOR_A, 'A');
}

export function createParticleB(x: number, y: number, vx: number, vy: number): Particle {
  const radius = 8 + Math.random() * 10;
  return createParticle(x, y, vx, vy, 2, radius, COLOR_B, 'B');
}

export function createCustomParticle(
  x: number,
  y: number,
  vx: number,
  vy: number,
  mass: number
): Particle {
  const radius = Math.max(6, Math.min(22, 6 + mass * 3));
  const t = (mass - 0.5) / 4.5;
  const color = interpolateColor(COLOR_A, COLOR_B, t);
  return createParticle(x, y, vx, vy, mass, radius, color, 'custom');
}

function interpolateColor(c1: string, c2: string, t: number): string {
  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

export function handleBoundaryCollision(
  p: Particle,
  width: number,
  height: number
): void {
  if (p.x - p.radius < 0) {
    p.x = p.radius;
    p.vx = Math.abs(p.vx);
  } else if (p.x + p.radius > width) {
    p.x = width - p.radius;
    p.vx = -Math.abs(p.vx);
  }
  if (p.y - p.radius < 0) {
    p.y = p.radius;
    p.vy = Math.abs(p.vy);
  } else if (p.y + p.radius > height) {
    p.y = height - p.radius;
    p.vy = -Math.abs(p.vy);
  }
}

export interface CollisionResult {
  collided: boolean;
  point: { x: number; y: number };
  color1: string;
  color2: string;
}

export function resolveParticleCollision(p1: Particle, p2: Particle): CollisionResult {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = p1.radius + p2.radius;

  if (dist >= minDist || dist === 0) {
    return { collided: false, point: { x: 0, y: 0 }, color1: p1.color, color2: p2.color };
  }

  const nx = dx / dist;
  const ny = dy / dist;

  const overlap = minDist - dist;
  const totalMass = p1.mass + p2.mass;
  p1.x -= nx * overlap * (p2.mass / totalMass);
  p1.y -= ny * overlap * (p2.mass / totalMass);
  p2.x += nx * overlap * (p1.mass / totalMass);
  p2.y += ny * overlap * (p1.mass / totalMass);

  const dvx = p1.vx - p2.vx;
  const dvy = p1.vy - p2.vy;
  const dvDotN = dvx * nx + dvy * ny;

  if (dvDotN <= 0) {
    return { collided: false, point: { x: 0, y: 0 }, color1: p1.color, color2: p2.color };
  }

  const restitution = 1;
  const impulse = (2 * dvDotN) / totalMass;

  p1.vx -= impulse * p2.mass * nx * restitution;
  p1.vy -= impulse * p2.mass * ny * restitution;
  p2.vx += impulse * p1.mass * nx * restitution;
  p2.vy += impulse * p1.mass * ny * restitution;

  const point = {
    x: p1.x + nx * p1.radius,
    y: p1.y + ny * p1.radius
  };

  return { collided: true, point, color1: p1.color, color2: p2.color };
}

export function updateParticle(p: Particle, width: number, height: number): void {
  p.x += p.vx;
  p.y += p.vy;
  handleBoundaryCollision(p, width, height);
}

export function calculateTotalMomentum(particles: Particle[]): { x: number; y: number } {
  let px = 0;
  let py = 0;
  for (const p of particles) {
    px += p.mass * p.vx;
    py += p.mass * p.vy;
  }
  return { x: px, y: py };
}

export function calculateTotalKineticEnergy(particles: Particle[]): number {
  let ke = 0;
  for (const p of particles) {
    ke += 0.5 * p.mass * (p.vx * p.vx + p.vy * p.vy);
  }
  return ke;
}

export function mixColors(c1: string, c2: string): string {
  let r1: number, g1: number, b1: number, r2: number, g2: number, b2: number;

  if (c1.startsWith('#')) {
    r1 = parseInt(c1.slice(1, 3), 16);
    g1 = parseInt(c1.slice(3, 5), 16);
    b1 = parseInt(c1.slice(5, 7), 16);
  } else {
    const match = c1.match(/\d+/g);
    r1 = match ? parseInt(match[0]) : 0;
    g1 = match ? parseInt(match[1]) : 0;
    b1 = match ? parseInt(match[2]) : 0;
  }

  if (c2.startsWith('#')) {
    r2 = parseInt(c2.slice(1, 3), 16);
    g2 = parseInt(c2.slice(3, 5), 16);
    b2 = parseInt(c2.slice(5, 7), 16);
  } else {
    const match = c2.match(/\d+/g);
    r2 = match ? parseInt(match[0]) : 0;
    g2 = match ? parseInt(match[1]) : 0;
    b2 = match ? parseInt(match[2]) : 0;
  }

  const r = Math.round((r1 + r2) / 2);
  const g = Math.round((g1 + g2) / 2);
  const b = Math.round((b1 + b2) / 2);
  return `rgb(${r},${g},${b})`;
}
