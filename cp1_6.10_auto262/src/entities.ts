import { ENEMY_NEON_COLORS } from './levels';

export const CROSSHAIR_SIZE = 24;
export const CROSSHAIR_DAMPING = 0.85;
export const CROSSHAIR_ANIM_DURATION = 0.15;
export const FIRE_RAY_DURATION = 0.08;
export const FIRE_RAY_LENGTH = 10;
export const ENEMY_SPEED_MIN = 80;
export const ENEMY_SPEED_MAX = 150;
export const ENEMY_ROTATION_SPEED = 30;
export const SUPPLY_FALL_SPEED = 60;
export const BOSS_WEAKPOINT_RADIUS = 12;
export const HOMING_BULLET_SPEED = 120;
export const BOSS_OUTER_RADIUS = 60;

export class Player {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  scale: number;
  scaleTimer: number;
  firing: boolean;
  fireTimer: number;
  fireCooldown: number;
  rapidFire: boolean;

  constructor(canvasW: number, canvasH: number) {
    this.x = canvasW / 2;
    this.y = canvasH / 2;
    this.targetX = this.x;
    this.targetY = this.y;
    this.scale = 1.0;
    this.scaleTimer = 0;
    this.firing = false;
    this.fireTimer = 0;
    this.fireCooldown = 0;
    this.rapidFire = false;
  }

  setTarget(mx: number, my: number): void {
    this.targetX = mx;
    this.targetY = my;
  }

  triggerShoot(): boolean {
    const cooldown = this.rapidFire ? 0.08 : 0.15;
    if (this.fireCooldown <= 0) {
      this.fireCooldown = cooldown;
      this.scaleTimer = CROSSHAIR_ANIM_DURATION;
      this.firing = true;
      this.fireTimer = FIRE_RAY_DURATION;
      return true;
    }
    return false;
  }

  update(dt: number): void {
    this.x += (this.targetX - this.x) * (1 - CROSSHAIR_DAMPING);
    this.y += (this.targetY - this.y) * (1 - CROSSHAIR_DAMPING);

    if (this.scaleTimer > 0) {
      this.scaleTimer -= dt;
      const t = 1 - this.scaleTimer / CROSSHAIR_ANIM_DURATION;
      this.scale = t < 0.5 ? 1 - t * 1.2 : 1 - (1 - t) * 1.2;
      if (this.scaleTimer <= 0) {
        this.scale = 1.0;
      }
    }

    if (this.fireTimer > 0) {
      this.fireTimer -= dt;
      if (this.fireTimer <= 0) this.firing = false;
    }

    if (this.fireCooldown > 0) {
      this.fireCooldown -= dt;
    }
  }

  getBounds(): { x: number; y: number; r: number } {
    return { x: this.x, y: this.y, r: CROSSHAIR_SIZE / 2 };
  }
}

export class Enemy {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  rotation: number;
  active: boolean;
  readonly radius: number = 12;

  constructor(canvasW: number, canvasH: number, speedMult: number) {
    const edge = Math.floor(Math.random() * 4);
    const speed = (ENEMY_SPEED_MIN + Math.random() * (ENEMY_SPEED_MAX - ENEMY_SPEED_MIN)) * speedMult;
    let dirX = 0, dirY = 0;

    if (edge === 0) {
      this.x = Math.random() * canvasW;
      this.y = -20;
      dirX = (Math.random() - 0.5);
      dirY = 0.5 + Math.random() * 0.5;
    } else if (edge === 1) {
      this.x = canvasW + 20;
      this.y = Math.random() * canvasH;
      dirX = -(0.5 + Math.random() * 0.5);
      dirY = (Math.random() - 0.5);
    } else if (edge === 2) {
      this.x = Math.random() * canvasW;
      this.y = canvasH + 20;
      dirX = (Math.random() - 0.5);
      dirY = -(0.5 + Math.random() * 0.5);
    } else {
      this.x = -20;
      this.y = Math.random() * canvasH;
      dirX = 0.5 + Math.random() * 0.5;
      dirY = (Math.random() - 0.5);
    }

    const mag = Math.sqrt(dirX * dirX + dirY * dirY);
    this.vx = (dirX / mag) * speed;
    this.vy = (dirY / mag) * speed;
    this.color = ENEMY_NEON_COLORS[Math.floor(Math.random() * ENEMY_NEON_COLORS.length)];
    this.rotation = Math.random() * 360;
    this.active = true;
  }

  update(dt: number, canvasW: number, canvasH: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += ENEMY_ROTATION_SPEED * dt;
    if (this.x < -60 || this.x > canvasW + 60 || this.y < -60 || this.y > canvasH + 60) {
      this.active = false;
    }
  }

  getBounds(): { x: number; y: number; r: number } {
    return { x: this.x, y: this.y, r: this.radius };
  }
}

export type SupplyType = 'rapid' | 'shield' | 'double';

export class SupplyBox {
  x: number;
  y: number;
  swayPhase: number;
  active: boolean;
  type: SupplyType;
  readonly radius: number = 14;

  constructor(canvasW: number) {
    this.x = 60 + Math.random() * (canvasW - 120);
    this.y = -20;
    this.swayPhase = Math.random() * Math.PI * 2;
    this.active = true;
    const types: SupplyType[] = ['rapid', 'shield', 'double'];
    this.type = types[Math.floor(Math.random() * types.length)];
  }

  update(dt: number, canvasH: number): void {
    this.y += SUPPLY_FALL_SPEED * dt;
    this.swayPhase += dt * 2;
    this.x += Math.sin(this.swayPhase) * 30 * dt;
    if (this.y > canvasH + 30) this.active = false;
  }

  getBounds(): { x: number; y: number; r: number } {
    return { x: this.x, y: this.y, r: this.radius };
  }
}

export class Boss {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  entering: boolean;
  hp: number;
  maxHp: number;
  weakpointFlashTimer: number;
  weakpointVisible: boolean;
  fireTimer: number;
  active: boolean;
  swayPhase: number;
  enterT: number;

  constructor(canvasW: number, canvasH: number, bossHp: number) {
    this.x = canvasW + 100;
    this.y = canvasH / 2;
    this.targetX = canvasW / 2;
    this.targetY = canvasH / 2;
    this.entering = true;
    this.hp = bossHp;
    this.maxHp = bossHp;
    this.weakpointFlashTimer = 0;
    this.weakpointVisible = true;
    this.fireTimer = 2;
    this.active = true;
    this.swayPhase = 0;
    this.enterT = 0;
  }

  update(dt: number, canvasW: number, canvasH: number): void {
    if (this.entering) {
      this.enterT += dt * 0.8;
      const t = Math.min(1, this.enterT);
      const ease = 1 - Math.pow(1 - t, 3);
      this.x = (canvasW + 100) + (this.targetX - (canvasW + 100)) * ease;
      if (t >= 1) this.entering = false;
    } else {
      this.swayPhase += dt;
      this.x = this.targetX + Math.sin(this.swayPhase) * 60;
      this.y = this.targetY + Math.cos(this.swayPhase * 0.7) * 30;
    }

    this.weakpointFlashTimer += dt;
    if (this.weakpointFlashTimer >= 0.5) {
      this.weakpointFlashTimer = 0;
      this.weakpointVisible = !this.weakpointVisible;
    }

    if (!this.entering) {
      this.fireTimer -= dt;
    }
  }

  canFire(): boolean {
    if (this.fireTimer <= 0 && !this.entering) {
      this.fireTimer = 1.5 + Math.random() * 1.5;
      return true;
    }
    return false;
  }

  takeDamage(): boolean {
    this.hp--;
    if (this.hp <= 0) {
      this.active = false;
      return true;
    }
    return false;
  }

  getBounds(): { x: number; y: number; r: number } {
    return { x: this.x, y: this.y, r: BOSS_OUTER_RADIUS };
  }

  getWeakpointBounds(): { x: number; y: number; r: number } {
    return { x: this.x, y: this.y, r: BOSS_WEAKPOINT_RADIUS };
  }
}

export class HomingBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  readonly radius: number = 5;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.active = true;
  }

  update(dt: number, targetX: number, targetY: number, canvasW: number, canvasH: number): void {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      const desiredVx = (dx / dist) * HOMING_BULLET_SPEED;
      const desiredVy = (dy / dist) * HOMING_BULLET_SPEED;
      this.vx += (desiredVx - this.vx) * Math.min(1, dt * 3);
      this.vy += (desiredVy - this.vy) * Math.min(1, dt * 3);
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < -30 || this.x > canvasW + 30 || this.y < -30 || this.y > canvasH + 30) {
      this.active = false;
    }
  }

  getBounds(): { x: number; y: number; r: number } {
    return { x: this.x, y: this.y, r: this.radius };
  }
}

export type ParticleShape = 'triangle' | 'star' | 'spark';

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  shape: ParticleShape;
  active: boolean;

  constructor(
    x: number, y: number,
    vx: number, vy: number,
    life: number, color: string,
    size: number, shape: ParticleShape,
    rotationSpeed: number = 0
  ) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.color = color;
    this.size = size;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = rotationSpeed;
    this.shape = shape;
    this.active = true;
  }

  update(dt: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.98;
    this.vy *= 0.98;
    this.rotation += this.rotationSpeed * dt;
    this.life -= dt;
    if (this.life <= 0) this.active = false;
  }
}
