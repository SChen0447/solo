import type { Stone } from './board';

const REPULSION_THRESHOLD = 60;
const ATTRACTION_THRESHOLD = 120;
const REPULSION_K = 80;
const ATTRACTION_K = 0.008;

export interface PhysicsConfig {
  gravityStrength: number;
  repulsionStrength: number;
  damping: number;
}

export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  gravityStrength: 1.0,
  repulsionStrength: 1.5,
  damping: 0.98
};

export function updatePhysics(
  stones: Stone[],
  config: PhysicsConfig
): { positions: Array<{ x: number; y: number }> } {
  const n = stones.length;
  if (n < 2) {
    const positions = stones.map((s) => {
      s.vx *= config.damping;
      s.vy *= config.damping;
      s.x += s.vx;
      s.y += s.vy;
      return { x: s.x, y: s.y };
    });
    return { positions };
  }

  const forcesX = new Float64Array(n);
  const forcesY = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = stones[i];
      const b = stones[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);

      if (dist < 0.001 || dist > ATTRACTION_THRESHOLD) continue;

      const nx = dx / dist;
      const ny = dy / dist;
      let magnitude = 0;

      if (dist < REPULSION_THRESHOLD) {
        magnitude = -(config.repulsionStrength * REPULSION_K) / dist;
      } else {
        magnitude = config.gravityStrength * ATTRACTION_K * dist;
      }

      const fx = nx * magnitude;
      const fy = ny * magnitude;
      forcesX[i] += fx;
      forcesY[i] += fy;
      forcesX[j] -= fx;
      forcesY[j] -= fy;
    }
  }

  const positions: Array<{ x: number; y: number }> = new Array(n);
  for (let i = 0; i < n; i++) {
    const s = stones[i];
    s.vx = (s.vx + forcesX[i]) * config.damping;
    s.vy = (s.vy + forcesY[i]) * config.damping;

    const speedSq = s.vx * s.vx + s.vy * s.vy;
    if (speedSq > 400) {
      const speed = Math.sqrt(speedSq);
      s.vx = (s.vx / speed) * 20;
      s.vy = (s.vy / speed) * 20;
    }

    s.x += s.vx;
    s.y += s.vy;
    positions[i] = { x: s.x, y: s.y };
  }

  return { positions };
}
