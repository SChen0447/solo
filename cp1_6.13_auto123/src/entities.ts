export interface Vector2 {
  x: number;
  y: number;
}

export enum AsteroidType {
  NORMAL = 'normal',
  RED = 'red',
  BLUE = 'blue',
  PURPLE = 'purple'
}

export enum UpgradeType {
  SHIELD = 'shield',
  ENGINE = 'engine'
}

export interface GameState {
  score: number;
  timeRemaining: number;
  lives: number;
  maxLives: number;
  speedLevel: number;
  pulseCooldown: number;
  pulseCooldownMax: number;
  nextUpgradeScore: number;
  upgradePanelActive: boolean;
  upgradePanelTimer: number;
  upgradeOptions: UpgradeType[];
  gameOver: boolean;
  crystalStats: {
    red: number;
    blue: number;
    purple: number;
  };
  damageFlashTimer: number;
  spaceQuote: string;
}

export interface ParticleConfig {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  lifetime: number;
}

export class Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  baseColor: string;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.size = 1 + Math.random() * 2;
    this.brightness = 0.3 + Math.random() * 0.7;
    this.twinkleSpeed = 1 + Math.random() * 2;
    this.twinkleOffset = Math.random() * Math.PI * 2;
    
    const colorVariation = Math.random();
    if (colorVariation < 0.7) {
      this.baseColor = '#ffffff';
    } else {
      this.baseColor = '#a0d8ef';
    }
  }

  update(time: number): void {
    this.brightness = 0.3 + Math.sin(time * this.twinkleSpeed + this.twinkleOffset) * 0.35 + 0.35;
  }
}

export class Entity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  active: boolean;

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = width;
    this.height = height;
    this.active = true;
  }

  update(deltaTime: number): void {
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
  }

  getBounds(): { left: number; right: number; top: number; bottom: number } {
    return {
      left: this.x - this.width / 2,
      right: this.x + this.width / 2,
      top: this.y - this.height / 2,
      bottom: this.y + this.height / 2
    };
  }

  containsPoint(px: number, py: number): boolean {
    const bounds = this.getBounds();
    return px >= bounds.left && px <= bounds.right && py >= bounds.top && py <= bounds.bottom;
  }

  distanceTo(other: Entity): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  distanceToPoint(px: number, py: number): number {
    const dx = this.x - px;
    const dy = this.y - py;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

export class Ship extends Entity {
  health: number;
  maxHealth: number;
  baseSpeed: number;
  speedMultiplier: number;
  beamAngle: number;
  beamTargetAngle: number;
  speedBoostTimer: number;
  engineParticleTimer: number;
  invulnerableTimer: number;

  constructor(x: number, y: number) {
    super(x, y, 60, 40);
    this.health = 3;
    this.maxHealth = 3;
    this.baseSpeed = 80;
    this.speedMultiplier = 1;
    this.beamAngle = 0;
    this.beamTargetAngle = 0;
    this.speedBoostTimer = 0;
    this.engineParticleTimer = 0;
    this.invulnerableTimer = 0;
  }

  update(deltaTime: number, mouseX: number, mouseY: number, canvasWidth: number, canvasHeight: number): void {
    const targetAngle = Math.atan2(mouseY - this.y, mouseX - this.x);
    this.beamTargetAngle = targetAngle;
    
    let angleDiff = this.beamTargetAngle - this.beamAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.beamAngle += angleDiff * deltaTime * 8;

    const currentSpeed = this.baseSpeed * this.speedMultiplier;
    this.vx = Math.cos(0) * currentSpeed;
    this.vy = Math.sin(0) * currentSpeed * 0.3;
    
    super.update(deltaTime);

    this.x = Math.max(30, Math.min(canvasWidth - 30, this.x));
    this.y = Math.max(30, Math.min(canvasHeight - 30, this.y));

    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer -= deltaTime;
      if (this.speedBoostTimer <= 0) {
        this.speedMultiplier = 1;
      }
    }

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= deltaTime;
    }

    this.engineParticleTimer += deltaTime;
  }

  takeDamage(amount: number): boolean {
    if (this.invulnerableTimer > 0) return false;
    this.health -= amount;
    this.invulnerableTimer = 1.5;
    return true;
  }

  applySpeedBoost(duration: number, multiplier: number): void {
    this.speedMultiplier = multiplier;
    this.speedBoostTimer = duration;
  }

  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  increaseMaxHealth(amount: number): void {
    this.maxHealth += amount;
    this.health = this.maxHealth;
  }

  getSpeedLevel(): number {
    return Math.floor((this.speedMultiplier - 1) / 0.2) + 1;
  }

  shouldSpawnEngineParticle(): boolean {
    if (this.engineParticleTimer >= 0.03) {
      this.engineParticleTimer = 0;
      return true;
    }
    return false;
  }

  isFlashing(): boolean {
    return this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer * 10) % 2 === 0;
  }
}

export class Asteroid extends Entity {
  type: AsteroidType;
  size: number;
  health: number;
  points: number;
  vertices: Vector2[];
  rotation: number;
  rotationSpeed: number;
  hitCount: number;
  isBeingCut: boolean;
  cutLine: Vector2[];
  color: string;
  glowColor: string;

  constructor(x: number, y: number, type: AsteroidType) {
    const size = type === AsteroidType.PURPLE ? 70 + Math.random() * 20 : 30 + Math.random() * 40;
    super(x, y, size, size);
    
    this.type = type;
    this.size = size;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.5;
    this.hitCount = 0;
    this.isBeingCut = false;
    this.cutLine = [];
    this.vertices = this.generateVertices();

    switch (type) {
      case AsteroidType.NORMAL:
        this.health = 1;
        this.points = 0;
        this.color = '#6b6b6b';
        this.glowColor = '#4a4a4a';
        break;
      case AsteroidType.RED:
        this.health = 1;
        this.points = 5;
        this.color = '#ff4444';
        this.glowColor = '#ff6666';
        break;
      case AsteroidType.BLUE:
        this.health = 2;
        this.points = 10;
        this.color = '#4488ff';
        this.glowColor = '#66aaff';
        break;
      case AsteroidType.PURPLE:
        this.health = 1;
        this.points = 20;
        this.color = '#aa44ff';
        this.glowColor = '#cc66ff';
        break;
    }

    this.vx = -30 - Math.random() * 40;
    this.vy = (Math.random() - 0.5) * 20;
  }

  private generateVertices(): Vector2[] {
    const vertices: Vector2[] = [];
    const numVertices = 8 + Math.floor(Math.random() * 5);
    
    for (let i = 0; i < numVertices; i++) {
      const angle = (i / numVertices) * Math.PI * 2;
      const radiusVariation = 0.7 + Math.random() * 0.5;
      const r = this.size / 2 * radiusVariation;
      vertices.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r
      });
    }
    
    return vertices;
  }

  update(deltaTime: number, canvasWidth: number): void {
    super.update(deltaTime);
    this.rotation += this.rotationSpeed * deltaTime;

    if (this.x + this.size < -50 || this.x > canvasWidth + 100) {
      this.active = false;
    }
  }

  onClick(): boolean {
    if (this.type === AsteroidType.BLUE) {
      this.hitCount++;
      if (this.hitCount >= this.health) {
        return true;
      }
      return false;
    }
    return true;
  }

  startCut(): void {
    this.isBeingCut = true;
    this.cutLine = [];
  }

  addCutPoint(point: Vector2): void {
    if (this.isBeingCut) {
      this.cutLine.push({ ...point });
    }
  }

  completeCut(): CrystalFragment[] {
    if (!this.isBeingCut || this.cutLine.length < 3) {
      this.isBeingCut = false;
      this.cutLine = [];
      return [];
    }

    const fragments: CrystalFragment[] = [];
    const numFragments = 3 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < numFragments; i++) {
      const angle = (i / numFragments) * Math.PI * 2;
      const distance = this.size * 0.2;
      const fragmentX = this.x + Math.cos(angle) * distance;
      const fragmentY = this.y + Math.sin(angle) * distance;
      
      const fragment = new CrystalFragment(
        fragmentX,
        fragmentY,
        AsteroidType.PURPLE,
        Math.ceil(this.points / numFragments)
      );
      
      fragment.vx = Math.cos(angle) * 80 + this.vx * 0.5;
      fragment.vy = Math.sin(angle) * 80 + this.vy * 0.5;
      
      fragments.push(fragment);
    }

    this.active = false;
    return fragments;
  }

  containsPointWithRotation(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    const rotatedX = dx * Math.cos(-this.rotation) - dy * Math.sin(-this.rotation);
    const rotatedY = dx * Math.sin(-this.rotation) + dy * Math.cos(-this.rotation);
    
    const distance = Math.sqrt(rotatedX * rotatedX + rotatedY * rotatedY);
    return distance <= this.size / 2;
  }
}

export class CrystalFragment extends Entity {
  color: AsteroidType;
  points: number;
  lifetime: number;
  maxLifetime: number;
  rotation: number;
  rotationSpeed: number;
  glowIntensity: number;

  constructor(x: number, y: number, color: AsteroidType, points: number) {
    const size = 15 + Math.random() * 10;
    super(x, y, size, size);
    this.color = color;
    this.points = points;
    this.lifetime = 8;
    this.maxLifetime = 8;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 3;
    this.glowIntensity = 1;
  }

  update(deltaTime: number, canvasWidth: number, canvasHeight: number): void {
    super.update(deltaTime);
    this.rotation += this.rotationSpeed * deltaTime;
    this.lifetime -= deltaTime;
    this.glowIntensity = 0.5 + Math.sin(Date.now() * 0.01) * 0.5;

    this.vx *= 0.98;
    this.vy *= 0.98;

    if (this.lifetime <= 0 || this.x < -50 || this.x > canvasWidth + 50 || 
        this.y < -50 || this.y > canvasHeight + 50) {
      this.active = false;
    }
  }

  getColor(): string {
    switch (this.color) {
      case AsteroidType.RED: return '#ff4444';
      case AsteroidType.BLUE: return '#4488ff';
      case AsteroidType.PURPLE: return '#aa44ff';
      default: return '#ffffff';
    }
  }

  getGlowColor(): string {
    switch (this.color) {
      case AsteroidType.RED: return '#ff6666';
      case AsteroidType.BLUE: return '#66aaff';
      case AsteroidType.PURPLE: return '#cc66ff';
      default: return '#ffffff';
    }
  }
}

export class BlackHole extends Entity {
  baseRadius: number;
  gravityRadius: number;
  rotationAngle: number;
  pulseTimer: number;
  shrinkTimer: number;
  gravityStrength: number;
  lifetime: number;

  constructor(x: number, y: number) {
    super(x, y, 80, 80);
    this.baseRadius = 40;
    this.gravityRadius = 150;
    this.rotationAngle = 0;
    this.pulseTimer = 0;
    this.shrinkTimer = 0;
    this.gravityStrength = 200;
    this.lifetime = 25;
  }

  update(deltaTime: number): void {
    this.rotationAngle += deltaTime * (Math.PI * 2 / 10);
    this.lifetime -= deltaTime;

    if (this.shrinkTimer > 0) {
      this.shrinkTimer -= deltaTime;
    }

    if (this.pulseTimer > 0) {
      this.pulseTimer -= deltaTime;
    }

    if (this.lifetime <= 0) {
      this.active = false;
    }
  }

  getCurrentRadius(): number {
    if (this.shrinkTimer > 0) {
      return 20;
    }
    return this.baseRadius;
  }

  getGravityRadius(): number {
    if (this.pulseTimer > 0) {
      return 0;
    }
    return this.gravityRadius;
  }

  applyGravity(entity: { x: number; y: number; vx: number; vy: number }, deltaTime: number): void {
    if (this.pulseTimer > 0) return;

    const dx = this.x - entity.x;
    const dy = this.y - entity.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < this.getGravityRadius() && distance > this.getCurrentRadius()) {
      const force = this.gravityStrength * (1 - distance / this.getGravityRadius());
      const nx = dx / distance;
      const ny = dy / distance;
      
      entity.vx += nx * force * deltaTime;
      entity.vy += ny * force * deltaTime;
    }
  }

  isInside(entity: { x: number; y: number }): boolean {
    const dx = this.x - entity.x;
    const dy = this.y - entity.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < this.getCurrentRadius();
  }

  activatePulse(): void {
    this.pulseTimer = 3;
    this.shrinkTimer = 3;
  }
}

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  lifetime: number;
  maxLifetime: number;
  active: boolean;

  constructor(config: ParticleConfig) {
    this.x = config.x;
    this.y = config.y;
    this.vx = config.vx;
    this.vy = config.vy;
    this.color = config.color;
    this.size = config.size;
    this.lifetime = config.lifetime;
    this.maxLifetime = config.lifetime;
    this.active = true;
  }

  update(deltaTime: number): void {
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    this.lifetime -= deltaTime;
    this.vx *= 0.98;
    this.vy *= 0.98;

    if (this.lifetime <= 0) {
      this.active = false;
    }
  }

  getAlpha(): number {
    return Math.max(0, this.lifetime / this.maxLifetime);
  }

  getCurrentSize(): number {
    return this.size * (this.lifetime / this.maxLifetime);
  }
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 150;

  addParticle(config: ParticleConfig): void {
    if (this.particles.length >= this.maxParticles) {
      const oldestIndex = this.particles.findIndex(p => p.active);
      if (oldestIndex !== -1) {
        this.particles.splice(oldestIndex, 1);
      }
    }
    
    this.particles.push(new Particle(config));
  }

  addExplosion(x: number, y: number, color: string, count: number = 30): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 150;
      const isPurple = color === '#aa44ff' || color === '#cc66ff';
      
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: isPurple ? (Math.random() > 0.5 ? '#aa44ff' : '#ff66cc') : color,
        size: 2 + Math.random() * 4,
        lifetime: 0.3 + Math.random() * 0.3
      });
    }
  }

  addEngineParticle(x: number, y: number, isBoosted: boolean): void {
    const angle = Math.PI + (Math.random() - 0.5) * 0.5;
    const speed = 100 + Math.random() * 100;
    
    this.addParticle({
      x: x - 30,
      y: y + (Math.random() - 0.5) * 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: isBoosted ? '#00aaff' : '#ff8800',
      size: isBoosted ? 4 + Math.random() * 3 : 2 + Math.random() * 2,
      lifetime: 0.2 + Math.random() * 0.2
    });
  }

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(deltaTime);
      if (!this.particles[i].active) {
        this.particles.splice(i, 1);
      }
    }
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  clear(): void {
    this.particles = [];
  }
}

export const SPACE_QUOTES = [
  '星辰只眷顾无畏的掘金者',
  '宇宙的宝藏属于勇敢的探索者',
  '每一颗晶体都承载着远古星辰的记忆',
  '在无尽的虚空中，唯有勇气指引方向',
  '黑洞吞噬一切，却吞不下探索的意志',
  '钻石恒久远，晶体永流传',
  '当你凝视深渊时，深渊也在凝视你的晶体',
  '在小行星带中，每一次点击都是命运的选择',
  '引擎的轰鸣是宇宙中最美的乐章',
  '即使是最暗的黑洞，也挡不住探照灯的光芒'
];
