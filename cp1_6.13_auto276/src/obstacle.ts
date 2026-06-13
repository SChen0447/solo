export interface ExplosionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  life: number;
  maxLife: number;
}

interface Obstacle {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  alive: boolean;
}

const MIN_SPAWN_INTERVAL = 1500;
const MAX_SPAWN_INTERVAL = 3000;
const MIN_RADIUS = 20;
const MAX_RADIUS = 40;
const MIN_DRIFT = 20;
const MAX_DRIFT = 40;
const EXPLOSION_LIFE = 500;

export class ObstacleManager {
  obstacles: Obstacle[] = [];
  explosionParticles: ExplosionParticle[] = [];
  private lastSpawnTime: number = 0;
  private nextSpawnInterval: number = MIN_SPAWN_INTERVAL;
  private canvasW: number = 0;
  private canvasH: number = 0;

  setCanvasSize(w: number, h: number): void {
    this.canvasW = w;
    this.canvasH = h;
  }

  update(now: number, dt: number, shipX: number, shipY: number, shipInvincible: boolean): boolean {
    if (now - this.lastSpawnTime >= this.nextSpawnInterval) {
      this.spawn();
      this.lastSpawnTime = now;
      this.nextSpawnInterval = MIN_SPAWN_INTERVAL + Math.random() * (MAX_SPAWN_INTERVAL - MIN_SPAWN_INTERVAL);
    }

    for (const obs of this.obstacles) {
      obs.x += obs.vx * dt;
      obs.y += obs.vy * dt;

      if (obs.x < -obs.radius || obs.x > this.canvasW + obs.radius ||
          obs.y < -obs.radius || obs.y > this.canvasH + obs.radius) {
        obs.alive = false;
      }
    }

    let hit = false;
    if (!shipInvincible) {
      for (const obs of this.obstacles) {
        if (!obs.alive) continue;
        const dx = shipX - obs.x;
        const dy = shipY - obs.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < obs.radius + 10) {
          obs.alive = false;
          hit = true;
          this.spawnExplosion(obs.x, obs.y, obs.radius);
        }
      }
    }

    this.obstacles = this.obstacles.filter(o => o.alive);

    for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
      const p = this.explosionParticles[i];
      p.life += dt * 1000;
      const t = p.life / p.maxLife;
      p.opacity = 1 - t;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life >= p.maxLife) {
        this.explosionParticles.splice(i, 1);
      }
    }

    return hit;
  }

  private spawn(): void {
    const radius = MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS);
    const side = Math.floor(Math.random() * 4);
    let x: number, y: number;

    switch (side) {
      case 0:
        x = Math.random() * this.canvasW;
        y = -radius;
        break;
      case 1:
        x = this.canvasW + radius;
        y = Math.random() * this.canvasH;
        break;
      case 2:
        x = Math.random() * this.canvasW;
        y = this.canvasH + radius;
        break;
      default:
        x = -radius;
        y = Math.random() * this.canvasH;
        break;
    }

    const speed = MIN_DRIFT + Math.random() * (MAX_DRIFT - MIN_DRIFT);
    const angle = Math.atan2(this.canvasH / 2 - y, this.canvasW / 2 - x) + (Math.random() - 0.5) * 1.5;

    this.obstacles.push({
      x, y, radius,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alive: true,
    });
  }

  private spawnExplosion(x: number, y: number, _radius: number): void {
    const count = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const t = Math.random();
      const r = Math.round(255 * (1 - t) + 255 * t);
      const g = Math.round(71 * (1 - t) + 165 * t);
      const b = Math.round(87 * (1 - t) + 2 * t);
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;

      this.explosionParticles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 2,
        opacity: 1,
        color: `rgb(${r},${g},${b})`,
        life: 0,
        maxLife: EXPLOSION_LIFE,
      });
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    for (const obs of this.obstacles) {
      const gradient = ctx.createRadialGradient(obs.x, obs.y, 0, obs.x, obs.y, obs.radius);
      gradient.addColorStop(0, '#2ed573');
      gradient.addColorStop(1, 'rgba(255,71,87,0.3)');

      ctx.beginPath();
      ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,71,87,0.6)';
      ctx.lineWidth = 1;
      ctx.shadowColor = '#ff4757';
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    for (const p of this.explosionParticles) {
      ctx.globalAlpha = p.opacity;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }

    ctx.restore();
  }

  reset(): void {
    this.obstacles = [];
    this.explosionParticles = [];
    this.lastSpawnTime = 0;
  }
}
