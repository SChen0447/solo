import type { Ship } from './fleet';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  active: boolean;
}

export interface LaserEffect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  life: number;
  maxLife: number;
  active: boolean;
}

export interface ScreenShake {
  intensity: number;
  duration: number;
  startTime: number;
}

const GRID_SIZE = 4;
const CELL_W = 800 / GRID_SIZE;
const CELL_H = 550 / GRID_SIZE;

export class BattleSystem {
  particles: Particle[];
  lasers: LaserEffect[];
  screenShake: ScreenShake | null;
  private maxParticles = 50;
  private particlePool: Particle[] = [];
  private laserPool: LaserEffect[] = [];

  constructor() {
    this.particles = [];
    this.lasers = [];
    this.screenShake = null;
  }

  handleAttack(attacker: Ship, target: Ship): void {
    const dx = target.x - attacker.x;
    const dy = target.y - attacker.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= attacker.attackRange) {
      const isDead = target.takeDamage(attacker.damage);
      this.addLaser(attacker.x, attacker.y, target.x, target.y, attacker.color);
      if (isDead) {
        this.createExplosion(target.x, target.y, target.color);
      }
    }
  }

  detectCollisions(ships: Ship[]): void {
    const grid: Ship[][] = [];
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      grid[i] = [];
    }

    for (const ship of ships) {
      if (!ship.isAlive) continue;
      const gx = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(ship.x / CELL_W)));
      const gy = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(ship.y / CELL_H)));
      grid[gy * GRID_SIZE + gx].push(ship);
    }

    for (let gy = 0; gy < GRID_SIZE; gy++) {
      for (let gx = 0; gx < GRID_SIZE; gx++) {
        const cell = grid[gy * GRID_SIZE + gx];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = gx + dx;
            const ny = gy + dy;
            if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
            const neighbor = grid[ny * GRID_SIZE + nx];
            for (const s1 of cell) {
              for (const s2 of neighbor) {
                if (s1.id >= s2.id) continue;
                if (s1.side === s2.side) continue;
                this.checkShipCollision(s1, s2);
              }
            }
          }
        }
      }
    }
  }

  private checkShipCollision(s1: Ship, s2: Ship): void {
    const dx = s2.x - s1.x;
    const dy = s2.y - s1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = s1.radius + s2.radius;

    if (dist < minDist && dist > 0) {
      const overlap = (minDist - dist) / 2;
      const nx = dx / dist;
      const ny = dy / dist;
      s1.x -= nx * overlap;
      s1.y -= ny * overlap;
      s2.x += nx * overlap;
      s2.y += ny * overlap;
    }
  }

  createExplosion(x: number, y: number, baseColor: string): void {
    const count = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 2 + Math.random() * 2;
      const particle = this.getParticle();
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.size = 3 + Math.floor(Math.random() * 3);
      particle.color = Math.random() > 0.5 ? baseColor : '#FFFFFF';
      particle.life = 500;
      particle.maxLife = 500;
      particle.active = true;
      this.particles.push(particle);
    }

    this.screenShake = {
      intensity: 3,
      duration: 150,
      startTime: performance.now()
    };
  }

  addLaser(x1: number, y1: number, x2: number, y2: number, color: string): void {
    const laser = this.getLaser();
    laser.x1 = x1;
    laser.y1 = y1;
    laser.x2 = x2;
    laser.y2 = y2;
    laser.color = color;
    laser.life = 150;
    laser.maxLife = 150;
    laser.active = true;
    this.lasers.push(laser);
  }

  update(currentTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 16;
      if (p.life <= 0) {
        p.active = false;
        this.particlePool.push(p);
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      l.life -= 16;
      if (l.life <= 0) {
        l.active = false;
        this.laserPool.push(l);
        this.lasers.splice(i, 1);
      }
    }

    if (this.screenShake) {
      const elapsed = currentTime - this.screenShake.startTime;
      if (elapsed >= this.screenShake.duration) {
        this.screenShake = null;
      }
    }
  }

  getShakeOffset(): { x: number; y: number } {
    if (!this.screenShake) return { x: 0, y: 0 };
    const progress = 1 - (performance.now() - this.screenShake.startTime) / this.screenShake.duration;
    const intensity = this.screenShake.intensity * progress;
    return {
      x: (Math.random() - 0.5) * 2 * intensity,
      y: (Math.random() - 0.5) * 2 * intensity
    };
  }

  private getParticle(): Particle {
    if (this.particlePool.length > 0) {
      return this.particlePool.pop()!;
    }
    return { x: 0, y: 0, vx: 0, vy: 0, size: 0, color: '', life: 0, maxLife: 0, active: false };
  }

  private getLaser(): LaserEffect {
    if (this.laserPool.length > 0) {
      return this.laserPool.pop()!;
    }
    return { x1: 0, y1: 0, x2: 0, y2: 0, color: '', life: 0, maxLife: 0, active: false };
  }

  reset(): void {
    this.particles = [];
    this.lasers = [];
    this.particlePool = [];
    this.laserPool = [];
    this.screenShake = null;
  }
}

export function getHpColor(hpRatio: number): string {
  if (hpRatio > 0.6) return '#4CAF50';
  if (hpRatio > 0.3) return '#FFC107';
  return '#F44336';
}
