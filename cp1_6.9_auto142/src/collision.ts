import { Particle } from './particle';

export interface CollisionInfo {
  p1: Particle;
  p2: Particle;
  x: number;
  y: number;
}

export function checkCollision(p1: Particle, p2: Particle): boolean {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < p1.radius + p2.radius;
}

export function getCollisionPoint(p1: Particle, p2: Particle): { x: number; y: number } {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2
  };
}

export function mixColors(color1: string, color2: string): string {
  const hex = (c: string) => parseInt(c.slice(1), 16);
  const r1 = (hex(color1) >> 16) & 255;
  const g1 = (hex(color1) >> 8) & 255;
  const b1 = hex(color1) & 255;
  const r2 = (hex(color2) >> 16) & 255;
  const g2 = (hex(color2) >> 8) & 255;
  const b2 = hex(color2) & 255;
  const r = Math.round((r1 + r2) / 2);
  const g = Math.round((g1 + g2) / 2);
  const b = Math.round((b1 + b2) / 2);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function checkAllCollisions(particles: Particle[], maxChecks: number = 200): CollisionInfo[] {
  const collisions: CollisionInfo[] = [];
  let checks = 0;

  for (let i = 0; i < particles.length && checks < maxChecks; i++) {
    for (let j = i + 1; j < particles.length && checks < maxChecks; j++) {
      checks++;
      const p1 = particles[i];
      const p2 = particles[j];
      if (!p1.isAlive() || !p2.isAlive()) continue;
      if (p1.exploding || p2.exploding) continue;
      const pairKey = i * 1000 + j;
      if (p1.hasCollided.has(pairKey)) continue;

      if (checkCollision(p1, p2)) {
        collisions.push({
          p1,
          p2,
          ...getCollisionPoint(p1, p2)
        });
        p1.hasCollided.add(pairKey);
        p2.hasCollided.add(pairKey);
        setTimeout(() => {
          p1.hasCollided.delete(pairKey);
          p2.hasCollided.delete(pairKey);
        }, 300);
      }
    }
  }

  return collisions;
}

export function checkOverlap(x: number, y: number, radius: number, particles: Particle[]): boolean {
  for (const p of particles) {
    if (!p.isAlive()) continue;
    const dx = x - p.x;
    const dy = y - p.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < radius + p.radius) {
      return true;
    }
  }
  return false;
}
