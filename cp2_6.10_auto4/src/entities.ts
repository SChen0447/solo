export interface Vector2 {
  x: number;
  y: number;
}

export interface BaseEntity {
  id: number;
  position: Vector2;
  velocity: Vector2;
  width: number;
  height: number;
  active: boolean;
}

export class Player implements BaseEntity {
  id: number;
  position: Vector2;
  velocity: Vector2;
  width: number;
  height: number;
  active: boolean;
  lives: number;
  speed: number;
  baseSpeed: number;
  shootCooldown: number;
  lastShotTime: number;
  hasShield: boolean;
  speedBoostEndTime: number;

  constructor(x: number, y: number) {
    this.id = 0;
    this.position = { x, y };
    this.velocity = { x: 0, y: 0 };
    this.width = 40;
    this.height = 40;
    this.active = true;
    this.lives = 3;
    this.baseSpeed = 280;
    this.speed = this.baseSpeed;
    this.shootCooldown = 200;
    this.lastShotTime = 0;
    this.hasShield = false;
    this.speedBoostEndTime = 0;
  }

  update(deltaTime: number, canvasWidth: number, canvasHeight: number): void {
    this.position.x += this.velocity.x * this.speed * deltaTime;
    this.position.y += this.velocity.y * this.speed * deltaTime;

    this.position.x = Math.max(this.width / 2, Math.min(canvasWidth - this.width / 2, this.position.x));
    this.position.y = Math.max(this.height / 2, Math.min(canvasHeight - this.height / 2, this.position.y));
  }
}

export type EnemyType = 'small' | 'large';

export class Enemy implements BaseEntity {
  id: number;
  position: Vector2;
  velocity: Vector2;
  width: number;
  height: number;
  active: boolean;
  type: EnemyType;
  health: number;
  maxHealth: number;

  private static nextId = 1;

  constructor(type: EnemyType, x: number, y: number) {
    this.id = Enemy.nextId++;
    this.position = { x, y };
    this.type = type;
    this.active = true;

    if (type === 'small') {
      this.width = 28;
      this.height = 28;
      this.health = 1;
      this.maxHealth = 1;
      this.velocity = { x: 0, y: 140 + Math.random() * 80 };
    } else {
      this.width = 56;
      this.height = 56;
      this.health = 3;
      this.maxHealth = 3;
      this.velocity = { x: 0, y: 70 + Math.random() * 40 };
    }
  }

  update(deltaTime: number, canvasHeight: number): void {
    this.position.y += this.velocity.y * deltaTime;
    if (this.position.y > canvasHeight + this.height) {
      this.active = false;
    }
  }

  takeDamage(damage: number): boolean {
    this.health -= damage;
    return this.health <= 0;
  }
}

export class Bullet implements BaseEntity {
  id: number;
  position: Vector2;
  velocity: Vector2;
  width: number;
  height: number;
  active: boolean;
  isPlayerBullet: boolean;
  damage: number;

  private static nextId = 1;

  constructor(x: number, y: number, isPlayerBullet: boolean) {
    this.id = Bullet.nextId++;
    this.position = { x, y };
    this.active = true;
    this.isPlayerBullet = isPlayerBullet;
    this.damage = 1;
    this.width = 4;
    this.height = 16;

    if (isPlayerBullet) {
      this.velocity = { x: 0, y: -600 };
    } else {
      this.velocity = { x: 0, y: 300 };
    }
  }

  update(deltaTime: number, canvasHeight: number): void {
    this.position.y += this.velocity.y * deltaTime;
    if (this.position.y < -this.height || this.position.y > canvasHeight + this.height) {
      this.active = false;
    }
  }
}

export class PowerUp implements BaseEntity {
  id: number;
  position: Vector2;
  velocity: Vector2;
  width: number;
  height: number;
  active: boolean;
  type: 'energy';
  pulsePhase: number;

  private static nextId = 1;

  constructor(x: number, y: number) {
    this.id = PowerUp.nextId++;
    this.position = { x, y };
    this.velocity = { x: 0, y: 100 };
    this.width = 24;
    this.height = 24;
    this.active = true;
    this.type = 'energy';
    this.pulsePhase = 0;
  }

  update(deltaTime: number, canvasHeight: number): void {
    this.position.y += this.velocity.y * deltaTime;
    this.pulsePhase += deltaTime * 5;
    if (this.position.y > canvasHeight + this.height) {
      this.active = false;
    }
  }
}

export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

export function createStars(count: number, canvasWidth: number, canvasHeight: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 40 + 10,
      brightness: Math.random() * 0.5 + 0.5,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: Math.random() * 2 + 1
    });
  }
  return stars;
}

export function updateStars(stars: Star[], deltaTime: number, canvasWidth: number, canvasHeight: number): void {
  for (const star of stars) {
    star.y += star.speed * deltaTime;
    star.twinklePhase += star.twinkleSpeed * deltaTime;
    if (star.y > canvasHeight) {
      star.y = -2;
      star.x = Math.random() * canvasWidth;
    }
  }
}

export function checkCollision(a: BaseEntity, b: BaseEntity): boolean {
  const aLeft = a.position.x - a.width / 2;
  const aRight = a.position.x + a.width / 2;
  const aTop = a.position.y - a.height / 2;
  const aBottom = a.position.y + a.height / 2;

  const bLeft = b.position.x - b.width / 2;
  const bRight = b.position.x + b.width / 2;
  const bTop = b.position.y - b.height / 2;
  const bBottom = b.position.y + b.height / 2;

  return aLeft < bRight && aRight > bLeft && aTop < bBottom && aBottom > bTop;
}

export class SpatialHash {
  private cellSize: number;
  private grid: Map<string, BaseEntity[]>;

  constructor(cellSize: number = 64) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  clear(): void {
    this.grid.clear();
  }

  insert(entity: BaseEntity): void {
    const minX = Math.floor((entity.position.x - entity.width / 2) / this.cellSize);
    const maxX = Math.floor((entity.position.x + entity.width / 2) / this.cellSize);
    const minY = Math.floor((entity.position.y - entity.height / 2) / this.cellSize);
    const maxY = Math.floor((entity.position.y + entity.height / 2) / this.cellSize);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const key = `${x},${y}`;
        let cell = this.grid.get(key);
        if (!cell) {
          cell = [];
          this.grid.set(key, cell);
        }
        cell.push(entity);
      }
    }
  }

  query(entity: BaseEntity): BaseEntity[] {
    const result: BaseEntity[] = [];
    const seen = new Set<number>();

    const minX = Math.floor((entity.position.x - entity.width / 2) / this.cellSize);
    const maxX = Math.floor((entity.position.x + entity.width / 2) / this.cellSize);
    const minY = Math.floor((entity.position.y - entity.height / 2) / this.cellSize);
    const maxY = Math.floor((entity.position.y + entity.height / 2) / this.cellSize);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const key = `${x},${y}`;
        const cell = this.grid.get(key);
        if (cell) {
          for (const e of cell) {
            if (e.id !== entity.id && !seen.has(e.id)) {
              seen.add(e.id);
              result.push(e);
            }
          }
        }
      }
    }

    return result;
  }
}
