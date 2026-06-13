export interface Obstacle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  color: string;
  active: boolean;
  pulsePhase: number;
}

const OBSTACLE_COLORS = ['#54a0ff', '#a29bfe', '#ff9ff3', '#feca57'];
const POOL_SIZE = 100;

export class ObstacleManager {
  private obstacles: Obstacle[] = [];
  private pool: Obstacle[] = [];
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;
  private spawnInterval: number = 2000;
  private lastSpawnTime: number = 0;
  private baseSpeed: number = 100;
  private speedMultiplier: number = 1;

  constructor() {
    this.initPool();
  }

  private initPool(): void {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 0,
        baseRadius: 0,
        color: '',
        active: false,
        pulsePhase: 0
      });
    }
  }

  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  setDifficulty(interval: number, speedMultiplier: number): void {
    this.spawnInterval = Math.max(800, interval);
    this.speedMultiplier = Math.min(1.5, speedMultiplier);
  }

  private acquire(): Obstacle | null {
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) {
        return this.pool[i];
      }
    }
    return null;
  }

  private release(obstacle: Obstacle): void {
    obstacle.active = false;
  }

  spawn(): void {
    const obstacle = this.acquire();
    if (!obstacle) return;

    const edge = Math.floor(Math.random() * 4);
    const radius = 12 + Math.random() * 8;
    const speed = (80 + Math.random() * 40) * this.speedMultiplier;

    let x: number, y: number, vx: number, vy: number;

    switch (edge) {
      case 0:
        x = Math.random() * this.canvasWidth;
        y = -radius;
        vx = (Math.random() - 0.5) * speed * 0.5;
        vy = speed;
        break;
      case 1:
        x = Math.random() * this.canvasWidth;
        y = this.canvasHeight + radius;
        vx = (Math.random() - 0.5) * speed * 0.5;
        vy = -speed;
        break;
      case 2:
        x = -radius;
        y = Math.random() * this.canvasHeight;
        vx = speed;
        vy = (Math.random() - 0.5) * speed * 0.5;
        break;
      default:
        x = this.canvasWidth + radius;
        y = Math.random() * this.canvasHeight;
        vx = -speed;
        vy = (Math.random() - 0.5) * speed * 0.5;
    }

    obstacle.x = x;
    obstacle.y = y;
    obstacle.vx = vx;
    obstacle.vy = vy;
    obstacle.radius = radius;
    obstacle.baseRadius = radius;
    obstacle.color = OBSTACLE_COLORS[Math.floor(Math.random() * OBSTACLE_COLORS.length)];
    obstacle.active = true;
    obstacle.pulsePhase = Math.random() * Math.PI * 2;
  }

  update(deltaTime: number, currentTime: number): void {
    if (currentTime - this.lastSpawnTime > this.spawnInterval) {
      this.spawn();
      this.lastSpawnTime = currentTime;
    }

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      if (!obs.active) {
        this.obstacles.splice(i, 1);
        continue;
      }

      obs.x += obs.vx * deltaTime;
      obs.y += obs.vy * deltaTime;
      obs.pulsePhase += deltaTime * 3;
      obs.radius = obs.baseRadius + Math.sin(obs.pulsePhase) * 2;

      const margin = obs.baseRadius + 50;
      if (
        obs.x < -margin ||
        obs.x > this.canvasWidth + margin ||
        obs.y < -margin ||
        obs.y > this.canvasHeight + margin
      ) {
        this.release(obs);
        this.obstacles.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const obs of this.obstacles) {
      if (!obs.active) continue;

      ctx.save();
      ctx.beginPath();
      ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
      ctx.fillStyle = obs.color;
      ctx.shadowColor = obs.color;
      ctx.shadowBlur = 20;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(obs.x, obs.y, obs.radius * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.shadowBlur = 10;
      ctx.fill();

      ctx.restore();
    }
  }

  getActiveObstacles(): Obstacle[] {
    return this.obstacles.filter(o => o.active);
  }

  addToActive(obstacle: Obstacle): void {
    if (!this.obstacles.includes(obstacle)) {
      this.obstacles.push(obstacle);
    }
  }

  checkCollision(px: number, py: number, pr: number): Obstacle | null {
    for (const obs of this.obstacles) {
      if (!obs.active) continue;
      const dx = px - obs.x;
      const dy = py - obs.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < pr + obs.radius * 0.7) {
        return obs;
      }
    }
    return null;
  }

  reset(): void {
    for (const obs of this.obstacles) {
      this.release(obs);
    }
    this.obstacles.length = 0;
    this.lastSpawnTime = 0;
    this.baseSpeed = 100;
    this.speedMultiplier = 1;
    this.spawnInterval = 2000;
  }
}
