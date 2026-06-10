export type EnemyType = 'triangle' | 'diamond' | 'circle';

export interface EnemyConfig {
  baseHp: number;
  baseSpeed: number;
  size: number;
  baseColor: string;
  particleColor: string;
  energyReward: number;
}

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  triangle: {
    baseHp: 30,
    baseSpeed: 70,
    size: 14,
    baseColor: '#ff6b6b',
    particleColor: '#ff4757',
    energyReward: 8
  },
  diamond: {
    baseHp: 60,
    baseSpeed: 45,
    size: 16,
    baseColor: '#ffa502',
    particleColor: '#ff7f50',
    energyReward: 15
  },
  circle: {
    baseHp: 120,
    baseSpeed: 28,
    size: 20,
    baseColor: '#a55eea',
    particleColor: '#8854d0',
    energyReward: 25
  }
};

export const ENEMY_NAMES: Record<EnemyType, string> = {
  triangle: '三角敌人',
  diamond: '菱形敌人',
  circle: '圆形敌人'
};

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

let particleIdCounter = 1;

export function createParticle(
  x: number,
  y: number,
  color: string,
  size: number,
  speed: number,
  angle: number,
  life: number
): Particle {
  return {
    id: particleIdCounter++,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    color,
    size,
    life,
    maxLife: life
  };
}

export class Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  path: { x: number; y: number }[];
  pathIndex: number;
  pathProgress: number;
  damageFlash: number;
  size: number;
  rotation: number;
  dead: boolean;

  private static nextId = 1;

  constructor(type: EnemyType, x: number, y: number, path: { x: number; y: number }[], waveMultiplier: number) {
    this.id = Enemy.nextId++;
    this.type = type;
    this.x = x;
    this.y = y;
    this.path = path;
    this.pathIndex = 0;
    this.pathProgress = 0;
    this.damageFlash = 0;
    this.rotation = 0;
    this.dead = false;

    const cfg = ENEMY_CONFIGS[type];
    this.maxHp = Math.floor(cfg.baseHp * waveMultiplier);
    this.hp = this.maxHp;
    this.speed = cfg.baseSpeed;
    this.size = cfg.size;
  }

  get config(): EnemyConfig {
    return ENEMY_CONFIGS[this.type];
  }

  get name(): string {
    return ENEMY_NAMES[this.type];
  }

  getHpRatio(): number {
    return Math.max(0, this.hp / this.maxHp);
  }

  takeDamage(damage: number): boolean {
    this.hp -= damage;
    this.damageFlash = 1;
    if (this.hp <= 0) {
      this.dead = true;
      return true;
    }
    return false;
  }

  update(dt: number): boolean {
    if (this.damageFlash > 0) {
      this.damageFlash = Math.max(0, this.damageFlash - dt * 3);
    }
    this.rotation += dt * 2;

    if (this.pathIndex >= this.path.length - 1) {
      return true;
    }

    const current = this.path[this.pathIndex];
    const next = this.path[this.pathIndex + 1];
    const dx = next.x - current.x;
    const dy = next.y - current.y;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);

    if (segmentLength === 0) {
      this.pathIndex++;
      return false;
    }

    const moveDistance = this.speed * dt;
    this.pathProgress += moveDistance / segmentLength;

    while (this.pathProgress >= 1 && this.pathIndex < this.path.length - 1) {
      this.pathProgress -= 1;
      this.pathIndex++;
    }

    if (this.pathIndex < this.path.length - 1) {
      const curr = this.path[this.pathIndex];
      const nxt = this.path[this.pathIndex + 1];
      this.x = curr.x + (nxt.x - curr.x) * this.pathProgress;
      this.y = curr.y + (nxt.y - curr.y) * this.pathProgress;
    } else {
      const last = this.path[this.path.length - 1];
      this.x = last.x;
      this.y = last.y;
    }

    return false;
  }

  createDeathParticles(): Particle[] {
    const particles: Particle[] = [];
    const cfg = this.config;
    const count = 10 + Math.floor(Math.random() * 11);

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 40 + Math.random() * 80;
      const size = 6 + Math.random() * 6;
      const life = 0.5 + Math.random() * 0.3;
      particles.push(createParticle(this.x, this.y, cfg.particleColor, size, speed, angle, life));
    }

    return particles;
  }

  createHitParticles(): Particle[] {
    const particles: Particle[] = [];
    const cfg = this.config;
    const count = 4 + Math.floor(Math.random() * 4);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 40;
      const size = 3 + Math.random() * 3;
      const life = 0.2 + Math.random() * 0.2;
      particles.push(createParticle(this.x, this.y, cfg.particleColor, size, speed, angle, life));
    }

    return particles;
  }
}

export interface FlashEffect {
  id: number;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  radius: number;
}

let flashIdCounter = 1;

export function createFlash(x: number, y: number, radius: number = 20): FlashEffect {
  return {
    id: flashIdCounter++,
    x,
    y,
    life: 0.2,
    maxLife: 0.2,
    radius
  };
}
