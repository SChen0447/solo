import { AsteroidData, AsteroidType, Vector2 } from './types';
import { ObjectPool } from './utils/ObjectPool';
import { ParticleSystem } from './utils/ParticleSystem';

export interface CollisionResult {
  hit: boolean;
  dodged: AsteroidData[];
}

export class AsteroidManager {
  private pool: ObjectPool<AsteroidData>;
  private width: number;
  private height: number;
  private spawnTimer: number;
  private spawnInterval: number;
  private difficulty: number;
  private maxAsteroids: number;
  private particleSystem: ParticleSystem;

  constructor(
    width: number,
    height: number,
    particleSystem: ParticleSystem,
    maxAsteroids: number = 30
  ) {
    this.width = width;
    this.height = height;
    this.particleSystem = particleSystem;
    this.maxAsteroids = maxAsteroids;
    this.pool = new ObjectPool<AsteroidData>(this.createAsteroid, maxAsteroids + 10);
    this.spawnTimer = 0;
    this.spawnInterval = 1.2;
    this.difficulty = 1;
  }

  private createAsteroid = (): AsteroidData => {
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 20,
      rotation: 0,
      rotationSpeed: 0,
      type: AsteroidType.MEDIUM,
      color: '#8b7355',
      vertices: [],
      active: false,
      scored: false
    };
  };

  private generateVertices(radius: number): Vector2[] {
    const vertices: Vector2[] = [];
    const numVertices = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < numVertices; i++) {
      const angle = (i / numVertices) * Math.PI * 2;
      const r = radius * (0.7 + Math.random() * 0.5);
      vertices.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r
      });
    }
    return vertices;
  }

  private getAsteroidConfig(type: AsteroidType): {
    radius: number;
    speed: number;
    color: string;
  } {
    switch (type) {
      case AsteroidType.LARGE:
        return { radius: 45, speed: 0.8, color: '#6b5344' };
      case AsteroidType.MEDIUM:
        return { radius: 28, speed: 1.3, color: '#8b7355' };
      case AsteroidType.SMALL:
        return { radius: 15, speed: 2.2, color: '#a89070' };
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  setDifficulty(difficulty: number): void {
    this.difficulty = difficulty;
    this.spawnInterval = Math.max(0.4, 1.2 - difficulty * 0.08);
  }

  spawn(): void {
    const active = this.pool.getActive();
    if (active.length >= this.maxAsteroids) return;

    const a = this.pool.acquire();
    const rand = Math.random();
    if (rand < 0.25) {
      a.type = AsteroidType.LARGE;
    } else if (rand < 0.65) {
      a.type = AsteroidType.MEDIUM;
    } else {
      a.type = AsteroidType.SMALL;
    }

    const config = this.getAsteroidConfig(a.type);
    a.radius = config.radius;
    a.color = config.color;
    a.vertices = this.generateVertices(a.radius);

    const side = Math.floor(Math.random() * 4);
    switch (side) {
      case 0:
        a.x = Math.random() * this.width;
        a.y = -a.radius - 20;
        break;
      case 1:
        a.x = this.width + a.radius + 20;
        a.y = Math.random() * this.height;
        break;
      case 2:
        a.x = Math.random() * this.width;
        a.y = this.height + a.radius + 20;
        break;
      case 3:
        a.x = -a.radius - 20;
        a.y = Math.random() * this.height;
        break;
    }

    const targetX = this.width * 0.3 + Math.random() * this.width * 0.4;
    const targetY = this.height * 0.3 + Math.random() * this.height * 0.4;
    const dx = targetX - a.x;
    const dy = targetY - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = config.speed * (0.8 + Math.random() * 0.6) * this.difficulty;

    a.vx = (dx / dist) * speed;
    a.vy = (dy / dist) * speed;
    a.rotation = Math.random() * Math.PI * 2;
    a.rotationSpeed = (Math.random() - 0.5) * 2;
    a.scored = false;
  }

  update(dt: number, shipPos: Vector2, shipRadius: number): CollisionResult {
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawn();
    }

    let hit = false;
    const dodged: AsteroidData[] = [];
    const active = this.pool.getActive();

    for (const a of active) {
      a.x += a.vx * dt * 60;
      a.y += a.vy * dt * 60;
      a.rotation += a.rotationSpeed * dt;

      const dx = a.x - shipPos.x;
      const dy = a.y - shipPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < shipRadius + a.radius * 0.8) {
        hit = true;
        this.explodeAsteroid(a);
        this.pool.release(a);
        continue;
      }

      if (
        a.x < -a.radius * 2 - 50 ||
        a.x > this.width + a.radius * 2 + 50 ||
        a.y < -a.radius * 2 - 50 ||
        a.y > this.height + a.radius * 2 + 50
      ) {
        if (!a.scored && dist > Math.max(this.width, this.height) * 0.3) {
          dodged.push(a);
          a.scored = true;
        }
        this.pool.release(a);
      }
    }

    return { hit, dodged };
  }

  private explodeAsteroid(a: AsteroidData): void {
    const colors = ['#8b7355', '#a89070', '#c4a880', '#6b5344'];
    for (let i = 0; i < 12; i++) {
      this.particleSystem.emit(a.x, a.y, 1, {
        speed: 2 + Math.random() * 3,
        spread: Math.PI * 2,
        life: 0.4 + Math.random() * 0.3,
        size: 2 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const active = this.pool.getActive();
    for (const a of active) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rotation);

      ctx.fillStyle = a.color;
      ctx.strokeStyle = this.darkenColor(a.color, 0.4);
      ctx.lineWidth = 2;

      ctx.beginPath();
      if (a.vertices.length > 0) {
        ctx.moveTo(a.vertices[0].x, a.vertices[0].y);
        for (let i = 1; i < a.vertices.length; i++) {
          ctx.lineTo(a.vertices[i].x, a.vertices[i].y);
        }
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = this.darkenColor(a.color, 0.65);
      const craterCount = a.type === AsteroidType.LARGE ? 4 : a.type === AsteroidType.MEDIUM ? 2 : 1;
      for (let i = 0; i < craterCount; i++) {
        const angle = (i / craterCount) * Math.PI * 2 + a.rotation * 0.3;
        const r = a.radius * 0.35;
        const cx = Math.cos(angle) * r;
        const cy = Math.sin(angle) * r;
        const craterR = a.radius * 0.12 * (0.7 + Math.sin(i * 2.3) * 0.3);
        ctx.beginPath();
        ctx.arc(cx, cy, craterR, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = this.lightenColor(a.color, 0.3);
      ctx.beginPath();
      ctx.arc(-a.radius * 0.25, -a.radius * 0.25, a.radius * 0.08, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private darkenColor(hex: string, factor: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.floor(r * factor)}, ${Math.floor(g * factor)}, ${Math.floor(b * factor)})`;
  }

  private lightenColor(hex: string, factor: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.min(255, Math.floor(r + (255 - r) * factor))}, ${Math.min(255, Math.floor(g + (255 - g) * factor))}, ${Math.min(255, Math.floor(b + (255 - b) * factor))})`;
  }

  clear(): void {
    this.pool.clear();
    this.spawnTimer = 0;
    this.difficulty = 1;
    this.spawnInterval = 1.2;
  }

  getActiveCount(): number {
    return this.pool.getActive().length;
  }
}
