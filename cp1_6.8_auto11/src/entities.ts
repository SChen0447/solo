export type CrystalColor = 'red' | 'blue' | 'green';
export type EnemyType = 'patrol' | 'chase';
export type TerrainType = 'empty' | 'ore' | 'asteroid' | 'enemyPath' | 'base';

export interface Vector2 {
  x: number;
  y: number;
}

export interface Entity {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  active: boolean;
}

let nextId = 0;
export const generateId = (): number => ++nextId;

export class Ship implements Entity {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  active: boolean;

  angle: number;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  engineLevel: number;
  shieldLevel: number;
  fireRateLevel: number;
  fireCooldown: number;
  fireRate: number;
  maxSpeed: number;
  acceleration: number;
  friction: number;
  trailParticles: TrailParticle[];
  shieldHexPhase: number;
  isWarning: boolean;
  isDead: boolean;
  deathTime: number;

  constructor(x: number, y: number) {
    this.id = generateId();
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 20;
    this.active = true;
    this.angle = -Math.PI / 2;
    this.health = 3;
    this.maxHealth = 3;
    this.shield = 100;
    this.maxShield = 100;
    this.engineLevel = 0;
    this.shieldLevel = 0;
    this.fireRateLevel = 0;
    this.fireCooldown = 0;
    this.fireRate = 300;
    this.maxSpeed = 5;
    this.acceleration = 0.3;
    this.friction = 0.98;
    this.trailParticles = [];
    this.shieldHexPhase = 0;
    this.isWarning = false;
    this.isDead = false;
    this.deathTime = 0;
  }

  upgradeShield(): void {
    if (this.shieldLevel < 3) {
      this.shieldLevel++;
      this.maxShield += 50;
      this.shield = this.maxShield;
    }
  }

  upgradeEngine(): void {
    if (this.engineLevel < 3) {
      this.engineLevel++;
      this.maxSpeed += 1.5;
      this.acceleration += 0.1;
    }
  }

  upgradeFireRate(): void {
    if (this.fireRateLevel < 3) {
      this.fireRateLevel++;
      this.fireRate = Math.max(100, this.fireRate - 60);
    }
  }
}

export class Crystal implements Entity {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  active: boolean;

  color: CrystalColor;
  value: number;
  pulsePhase: number;
  beingAttracted: boolean;
  attractTarget: Ship | null;
  attractProgress: number;

  constructor(x: number, y: number, color: CrystalColor) {
    this.id = generateId();
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 10;
    this.active = true;
    this.color = color;
    this.value = 10;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.beingAttracted = false;
    this.attractTarget = null;
    this.attractProgress = 0;
  }
}

export class Enemy implements Entity {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  active: boolean;

  type: EnemyType;
  health: number;
  maxHealth: number;
  speed: number;
  fireCooldown: number;
  fireRate: number;
  patrolPoints: Vector2[];
  currentPatrolIndex: number;
  alertLevel: number;
  alertFlash: number;
  visionRange: number;
  rotation: number;

  constructor(x: number, y: number, type: EnemyType, patrolPoints?: Vector2[]) {
    this.id = generateId();
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.active = true;
    this.type = type;
    this.fireCooldown = 0;
    this.alertLevel = 0;
    this.alertFlash = 0;
    this.rotation = 0;

    if (type === 'patrol') {
      this.radius = 30;
      this.health = 80;
      this.maxHealth = 80;
      this.speed = 1.5;
      this.fireRate = 2000;
      this.visionRange = 300;
      this.patrolPoints = patrolPoints || [{ x, y }];
      this.currentPatrolIndex = 0;
    } else {
      this.radius = 18;
      this.health = 30;
      this.maxHealth = 30;
      this.speed = 3;
      this.fireRate = 1200;
      this.visionRange = 400;
      this.patrolPoints = [];
      this.currentPatrolIndex = 0;
    }
  }
}

export class Asteroid implements Entity {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  active: boolean;

  rotation: number;
  rotationSpeed: number;
  vertices: number[];
  health: number;

  constructor(x: number, y: number, radius: number, vx: number = 0, vy: number = 0) {
    this.id = generateId();
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.active = true;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.02;
    this.health = Math.floor(radius / 10);

    const vertexCount = 8 + Math.floor(Math.random() * 5);
    this.vertices = [];
    for (let i = 0; i < vertexCount; i++) {
      const angle = (i / vertexCount) * Math.PI * 2;
      const r = radius * (0.7 + Math.random() * 0.3);
      this.vertices.push(angle, r);
    }
  }
}

export class Laser implements Entity {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  active: boolean;

  damage: number;
  lifetime: number;
  maxLifetime: number;
  muzzleFlashTime: number;

  constructor(x: number, y: number, angle: number, speed: number = 12, damage: number = 10) {
    this.id = generateId();
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = 4;
    this.active = true;
    this.damage = damage;
    this.maxLifetime = 2000;
    this.lifetime = this.maxLifetime;
    this.muzzleFlashTime = 100;
  }
}

export class EnemyBullet implements Entity {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  active: boolean;

  damage: number;
  lifetime: number;
  maxLifetime: number;
  target: Ship | null;
  turnRate: number;
  speed: number;
  trailPositions: Vector2[];

  constructor(x: number, y: number, target: Ship) {
    this.id = generateId();
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 6;
    this.active = true;
    this.damage = 15;
    this.maxLifetime = 4000;
    this.lifetime = this.maxLifetime;
    this.target = target;
    this.turnRate = 0.03;
    this.speed = 4;
    this.trailPositions = [];

    const angle = Math.atan2(target.y - y, target.x - x);
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
  }
}

export class Particle implements Entity {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  active: boolean;

  color: string;
  lifetime: number;
  maxLifetime: number;
  size: number;
  rotation: number;
  rotationSpeed: number;

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    color: string,
    lifetime: number,
    size: number = 3
  ) {
    this.id = generateId();
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = size;
    this.active = true;
    this.color = color;
    this.maxLifetime = lifetime;
    this.lifetime = lifetime;
    this.size = size;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.2;
  }
}

export class TrailParticle implements Entity {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  active: boolean;

  lifetime: number;
  maxLifetime: number;
  size: number;

  constructor(x: number, y: number, vx: number, vy: number, lifetime: number = 500, size: number = 4) {
    this.id = generateId();
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = size;
    this.active = true;
    this.maxLifetime = lifetime;
    this.lifetime = lifetime;
    this.size = size;
  }
}

export class Shockwave implements Entity {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  active: boolean;

  maxRadius: number;
  lifetime: number;
  maxLifetime: number;
  color: string;

  constructor(x: number, y: number, maxRadius: number, lifetime: number, color: string = '#ff6600') {
    this.id = generateId();
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 5;
    this.active = true;
    this.maxRadius = maxRadius;
    this.maxLifetime = lifetime;
    this.lifetime = lifetime;
    this.color = color;
  }
}

export class Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  twinklePhase: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.size = 0.5 + Math.random() * 2;
    this.brightness = 0.3 + Math.random() * 0.7;
    this.twinkleSpeed = 0.005 + Math.random() * 0.02;
    this.twinklePhase = Math.random() * Math.PI * 2;
  }
}

export class GridCell {
  x: number;
  y: number;
  type: TerrainType;
  size: number;

  constructor(x: number, y: number, size: number, type: TerrainType = 'empty') {
    this.x = x;
    this.y = y;
    this.size = size;
    this.type = type;
  }
}

export interface GameState {
  ship: Ship;
  crystals: Crystal[];
  enemies: Enemy[];
  asteroids: Asteroid[];
  lasers: Laser[];
  enemyBullets: EnemyBullet[];
  particles: Particle[];
  shockwaves: Shockwave[];
  stars: Star[];
  grid: GridCell[][];
  gridSize: number;
  cellSize: number;
  worldWidth: number;
  worldHeight: number;
  baseX: number;
  baseY: number;
  baseRadius: number;
  energyRed: number;
  energyBlue: number;
  energyGreen: number;
  maxEnergy: number;
  score: number;
  crystalsCollected: number;
  enemiesDestroyed: number;
  screenShake: number;
  screenShakeX: number;
  screenShakeY: number;
  hitFlash: number;
  warningLevel: number;
  gameOver: boolean;
  gameOverTime: number;
  isPaused: boolean;
  cameraX: number;
  cameraY: number;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  space: boolean;
}
