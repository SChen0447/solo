export interface ShipState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  influenceRadius: number;
  thrustStrength: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseHue: number;
  wakeTimer: number;
}

interface Stardust {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  size: number;
  baseAlpha: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private stardust: Stardust[] = [];
  private width: number;
  private height: number;
  private centerX: number;
  private centerY: number;
  private cellSize: number = 30;
  private grid: Map<string, number[]> = new Map();

  private readonly COLOR_CORE = { r: 139, g: 92, b: 246 };
  private readonly COLOR_OUTER = { r: 59, g: 130, b: 246 };
  private readonly COLOR_SHIP = { r: 244, g: 63, b: 94 };
  private readonly COLOR_WAKE = { r: 251, g: 146, b: 60 };

  constructor(width: number, height: number, count: number = 3200) {
    this.width = width;
    this.height = height;
    this.centerX = width / 2;
    this.centerY = height / 2;
    this.initParticles(count);
  }

  private initParticles(count: number): void {
    const maxDist = Math.sqrt(this.centerX * this.centerX + this.centerY * this.centerY);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radiusFactor = Math.pow(Math.random(), 0.6);
      const dist = radiusFactor * maxDist * 0.9;
      const x = this.centerX + Math.cos(angle) * dist;
      const y = this.centerY + Math.sin(angle) * dist;
      const speed = 0.2 + Math.random() * 0.4;
      const vAngle = angle + (Math.random() - 0.5) * 0.8;
      this.particles.push({
        x,
        y,
        vx: Math.cos(vAngle) * speed,
        vy: Math.sin(vAngle) * speed,
        size: 2 + Math.random() * 3,
        baseHue: 220 + Math.random() * 40,
        wakeTimer: 0,
      });
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.centerX = width / 2;
    this.centerY = height / 2;
  }

  addStardust(x: number, y: number): void {
    this.stardust.push({
      x,
      y,
      life: 1000,
      maxLife: 1000,
      size: 1.5 + Math.random() * 2,
      baseAlpha: 0.3 + Math.random() * 0.7,
    });
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  private buildGrid(): void {
    this.grid.clear();
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const cx = Math.floor(p.x / this.cellSize);
      const cy = Math.floor(p.y / this.cellSize);
      const key = `${cx},${cy}`;
      let bucket = this.grid.get(key);
      if (!bucket) {
        bucket = [];
        this.grid.set(key, bucket);
      }
      bucket.push(i);
    }
  }

  private getNearbyParticles(x: number, y: number): number[] {
    const result: number[] = [];
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cx + dx},${cy + dy}`;
        const bucket = this.grid.get(key);
        if (bucket) {
          for (let i = 0; i < bucket.length; i++) {
            result.push(bucket[i]);
          }
        }
      }
    }
    return result;
  }

  update(dt: number, ship: ShipState): void {
    this.buildGrid();

    const dtFactor = Math.min(dt / 16.67, 2);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      if (p.wakeTimer > 0) {
        p.wakeTimer -= dt;
      }

      const nearby = this.getNearbyParticles(p.x, p.y);
      let repelX = 0;
      let repelY = 0;
      const minDist = 8;
      const minDistSq = minDist * minDist;

      for (let j = 0; j < nearby.length; j++) {
        const idx = nearby[j];
        if (idx === i) continue;
        const other = this.particles[idx];
        const dx = p.x - other.x;
        const dy = p.y - other.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < minDistSq && distSq > 0.01) {
          const dist = Math.sqrt(distSq);
          const force = (minDist - dist) / minDist * 0.15;
          repelX += (dx / dist) * force;
          repelY += (dy / dist) * force;
        }
      }

      p.vx += repelX * dtFactor;
      p.vy += repelY * dtFactor;

      const dx = ship.x - p.x;
      const dy = ship.y - p.y;
      const distToShip = Math.sqrt(dx * dx + dy * dy);

      if (distToShip < ship.influenceRadius && distToShip > 0.1) {
        const normDist = distToShip / ship.influenceRadius;
        const falloff = Math.exp(-normDist * 3);

        const shipSpeed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
        if (shipSpeed > 0.1) {
          const perpX = -ship.vy / shipSpeed;
          const perpY = ship.vx / shipSpeed;
          const side = (dx * perpX + dy * perpY) > 0 ? 1 : -1;

          const pushStrength = ship.thrustStrength * falloff;
          const tangential = pushStrength * 0.8;

          const flowX = ship.vx / shipSpeed;
          const flowY = ship.vy / shipSpeed;

          const perpFalloff = Math.max(0, 1 - Math.abs(normDist - 0.5) * 2);
          p.vx += (flowX * pushStrength * 0.5 + perpX * side * tangential * perpFalloff) * dtFactor;
          p.vy += (flowY * pushStrength * 0.5 + perpY * side * tangential * perpFalloff) * dtFactor;

          if (normDist > 0.4 && normDist < 0.9) {
            p.wakeTimer = Math.max(p.wakeTimer, 500);
          }
        }
      }

      const toCenterX = this.centerX - p.x;
      const toCenterY = this.centerY - p.y;
      const centerDist = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY);
      const maxRadius = Math.min(this.width, this.height) * 0.48;
      if (centerDist > maxRadius) {
        const pullStrength = (centerDist - maxRadius) / maxRadius * 0.02;
        p.vx += (toCenterX / centerDist) * pullStrength * dtFactor;
        p.vy += (toCenterY / centerDist) * pullStrength * dtFactor;
      }

      p.vx *= 0.985;
      p.vy *= 0.985;

      p.x += p.vx * dtFactor;
      p.y += p.vy * dtFactor;

      const margin = 20;
      if (p.x < margin) {
        p.x = margin;
        p.vx = Math.abs(p.vx) * 0.5;
      }
      if (p.x > this.width - margin) {
        p.x = this.width - margin;
        p.vx = -Math.abs(p.vx) * 0.5;
      }
      if (p.y < margin) {
        p.y = margin;
        p.vy = Math.abs(p.vy) * 0.5;
      }
      if (p.y > this.height - margin) {
        p.y = this.height - margin;
        p.vy = -Math.abs(p.vy) * 0.5;
      }
    }

    for (let i = this.stardust.length - 1; i >= 0; i--) {
      const s = this.stardust[i];
      s.life -= dt;
      s.x *= 1;
      s.y *= 1;
      if (s.life <= 0) {
        this.stardust.splice(i, 1);
      }
    }
  }

  private lerpColor(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }, t: number): { r: number; g: number; b: number } {
    return {
      r: Math.round(a.r + (b.r - a.r) * t),
      g: Math.round(a.g + (b.g - a.g) * t),
      b: Math.round(a.b + (b.b - a.b) * t),
    };
  }

  render(ctx: CanvasRenderingContext2D, shipX: number, shipY: number): void {
    const maxDist = Math.sqrt(this.centerX * this.centerX + this.centerY * this.centerY);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      const distFromCenter = Math.sqrt((p.x - this.centerX) ** 2 + (p.y - this.centerY) ** 2);
      const centerT = Math.min(distFromCenter / maxDist, 1);

      let color = this.lerpColor(this.COLOR_CORE, this.COLOR_OUTER, centerT);

      const distToShip = Math.sqrt((p.x - shipX) ** 2 + (p.y - shipY) ** 2);
      const shipInfluenceRadius = 180;
      if (distToShip < shipInfluenceRadius) {
        const shipT = 1 - distToShip / shipInfluenceRadius;
        const smoothT = shipT * shipT * (3 - 2 * shipT);
        color = this.lerpColor(color, this.COLOR_SHIP, smoothT * 0.8);
      }

      if (p.wakeTimer > 0) {
        const wakeT = Math.min(p.wakeTimer / 500, 1);
        color = this.lerpColor(color, this.COLOR_WAKE, wakeT * 0.9);
      }

      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const brightnessBoost = Math.min(speed * 15, 30);

      const r = Math.min(255, color.r + brightnessBoost);
      const g = Math.min(255, color.g + brightnessBoost);
      const b = Math.min(255, color.b + brightnessBoost);

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < this.stardust.length; i++) {
      const s = this.stardust[i];
      const lifeRatio = s.life / s.maxLife;
      const flicker = 0.5 + 0.5 * Math.sin(performance.now() * 0.01 + i);
      const alpha = s.baseAlpha * lifeRatio * flicker;

      ctx.fillStyle = `rgba(255, 240, 200, ${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
