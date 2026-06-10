import { DungeonMap, TILE_SIZE } from './map';

export interface SoundPulse {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  opacity: number;
  active: boolean;
  collidedPoints: { x: number; y: number }[];
}

export interface Ripple {
  x: number;
  y: number;
  startTime: number;
  duration: number;
  maxRadius: number;
}

export class Player {
  x: number;
  y: number;
  radius: number;
  speed: number;
  vx: number;
  vy: number;
  pulses: SoundPulse[];
  ripples: Ripple[];
  keys: Set<string>;
  canShoot: boolean;
  shootCooldown: number;
  lastShootTime: number;
  glowPhase: number;

  constructor(startX: number, startY: number) {
    this.x = startX;
    this.y = startY;
    this.radius = 10;
    this.speed = 2.5;
    this.vx = 0;
    this.vy = 0;
    this.pulses = [];
    this.ripples = [];
    this.keys = new Set<string>();
    this.canShoot = true;
    this.shootCooldown = 400;
    this.lastShootTime = 0;
    this.glowPhase = 0;
    this.setupInputListeners();
  }

  private setupInputListeners(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      this.keys.add(e.code);
      if (e.code === 'Space') {
        e.preventDefault();
        this.tryShoot();
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.keys.delete(e.code);
    });
  }

  tryShoot(): void {
    const now = performance.now();
    if (now - this.lastShootTime >= this.shootCooldown) {
      this.shoot();
      this.lastShootTime = now;
    }
  }

  shoot(): void {
    const pulse: SoundPulse = {
      x: this.x,
      y: this.y,
      radius: 5,
      maxRadius: TILE_SIZE * 12,
      speed: 5,
      opacity: 1,
      active: true,
      collidedPoints: []
    };
    this.pulses.push(pulse);
  }

  update(map: DungeonMap, deltaTime: number): { collided: boolean } {
    this.glowPhase += deltaTime * 0.005;

    this.vx = 0;
    this.vy = 0;

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) this.vy = -1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) this.vy = 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) this.vx = -1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) this.vx = 1;

    if (this.vx !== 0 && this.vy !== 0) {
      const len = Math.sqrt(2);
      this.vx /= len;
      this.vy /= len;
    }

    const moveX = this.vx * this.speed;
    const moveY = this.vy * this.speed;

    if (!map.checkCollision(this.x + moveX, this.y, this.radius)) {
      this.x += moveX;
    }
    if (!map.checkCollision(this.x, this.y + moveY, this.radius)) {
      this.y += moveY;
    }

    const g = map.worldToGrid(this.x, this.y);
    map.markExplored(g.x, g.y);

    let hasCollision = false;
    for (const pulse of this.pulses) {
      if (!pulse.active) continue;

      const prevRadius = pulse.radius;
      pulse.radius += pulse.speed;

      const collision = this.checkPulseCollision(pulse, prevRadius, map);
      if (collision.collided) {
        hasCollision = true;
        for (const pt of collision.points) {
          this.ripples.push({
            x: pt.x,
            y: pt.y,
            startTime: performance.now(),
            duration: 300,
            maxRadius: TILE_SIZE * 1.5
          });
          pulse.collidedPoints.push(pt);
        }
      }

      const distFromCenter = pulse.radius;
      pulse.opacity = Math.max(0, 1 - (distFromCenter / pulse.maxRadius) * map.echoDecay);

      if (pulse.radius >= pulse.maxRadius) {
        pulse.active = false;
      }
    }

    this.pulses = this.pulses.filter(p => p.active || p.opacity > 0.01);

    const now = performance.now();
    this.ripples = this.ripples.filter(r => now - r.startTime < r.duration);

    return { collided: hasCollision };
  }

  private checkPulseCollision(
    pulse: SoundPulse,
    prevRadius: number,
    map: DungeonMap
  ): { collided: boolean; points: { x: number; y: number }[] } {
    const points: { x: number; y: number }[] = [];
    let collided = false;

    const gridPrev = map.worldToGrid(pulse.x - prevRadius, pulse.y - prevRadius);
    const gridCurr = map.worldToGrid(pulse.x + pulse.radius, pulse.y + pulse.radius);

    for (let gy = gridPrev.y; gy <= gridCurr.y; gy++) {
      for (let gx = gridPrev.x; gx <= gridCurr.x; gx++) {
        if (!map.isWall(gx, gy)) continue;

        const wx = gx * TILE_SIZE + TILE_SIZE / 2;
        const wy = gy * TILE_SIZE + TILE_SIZE / 2;
        const dx = wx - pulse.x;
        const dy = wy - pulse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= pulse.radius + TILE_SIZE * 0.5 && dist >= prevRadius - TILE_SIZE * 0.5) {
          if (dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;
            const hitX = pulse.x + nx * (dist - TILE_SIZE * 0.3);
            const hitY = pulse.y + ny * (dist - TILE_SIZE * 0.3);

            let alreadyAdded = false;
            for (const existing of pulse.collidedPoints) {
              const ddx = existing.x - hitX;
              const ddy = existing.y - hitY;
              if (ddx * ddx + ddy * ddy < TILE_SIZE * TILE_SIZE) {
                alreadyAdded = true;
                break;
              }
            }

            if (!alreadyAdded) {
              points.push({ x: hitX, y: hitY });
              collided = true;
            }
          }
        }
      }
    }

    if (pulse.x - pulse.radius <= 0 || pulse.x + pulse.radius >= TILE_SIZE * 20 ||
        pulse.y - pulse.radius <= 0 || pulse.y + pulse.radius >= TILE_SIZE * 20) {
      collided = true;
    }

    return { collided, points };
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }
}
