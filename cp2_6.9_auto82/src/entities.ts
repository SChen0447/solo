import { FoodSource, World } from './world';

export interface Vec2 {
  x: number;
  y: number;
}

export type RabbitState = 'wandering' | 'foraging' | 'fleeing' | 'eating' | 'dead';
export type FoxState = 'patrolling' | 'chasing';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const FPS = 30;

export class Rabbit {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public hunger: number;
  public state: RabbitState;
  public targetFood: FoodSource | null;
  public fleeTimer: number;
  public breathePhase: number;
  public alive: boolean;

  private readonly minSpeed: number = 2;
  private readonly maxSpeed: number = 4;
  private readonly fleeSpeed: number = 5;
  private readonly forageAccel: number = 1.5;
  private readonly senseRadius: number = 200;
  private readonly eatRadius: number = 20;
  private readonly eatRate: number = 3;
  private readonly fleeDuration: number = 1.5;

  constructor(x?: number, y?: number) {
    this.x = x ?? Math.random() * CANVAS_WIDTH;
    this.y = y ?? Math.random() * CANVAS_HEIGHT;
    const angle = Math.random() * Math.PI * 2;
    const speed = this.minSpeed + Math.random() * (this.maxSpeed - this.minSpeed);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.hunger = 50 + Math.random() * 30;
    this.state = 'wandering';
    this.targetFood = null;
    this.fleeTimer = 0;
    this.breathePhase = Math.random() * Math.PI * 2;
    this.alive = true;
  }

  public respawn(): void {
    this.x = -30;
    this.y = Math.random() * CANVAS_HEIGHT;
    const angle = Math.random() * Math.PI * 2;
    const speed = this.minSpeed + Math.random() * (this.maxSpeed - this.minSpeed);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.hunger = 50;
    this.state = 'wandering';
    this.targetFood = null;
    this.fleeTimer = 0;
    this.alive = true;
  }

  private findNearestFood(world: World): FoodSource | null {
    let nearest: FoodSource | null = null;
    let minDist = Infinity;
    for (const food of world.foodSources) {
      if (!food.active) continue;
      const dx = food.x - this.x;
      const dy = food.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        nearest = food;
      }
    }
    return nearest;
  }

  private findNearestFox(foxes: Fox[]): Fox | null {
    let nearest: Fox | null = null;
    let minDist = Infinity;
    for (const fox of foxes) {
      const dx = fox.x - this.x;
      const dy = fox.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.senseRadius && dist < minDist) {
        minDist = dist;
        nearest = fox;
      }
    }
    return nearest;
  }

  public update(dt: number, world: World, foxes: Fox[]): void {
    if (!this.alive) return;

    this.breathePhase += dt * Math.PI * 2;

    this.hunger = Math.max(0, this.hunger - dt * 2);

    const nearestFox = this.findNearestFox(foxes);
    if (nearestFox) {
      this.state = 'fleeing';
      this.fleeTimer = this.fleeDuration;
    } else if (this.fleeTimer > 0) {
      this.fleeTimer -= dt;
      if (this.fleeTimer <= 0) {
        this.state = this.hunger < 30 ? 'foraging' : 'wandering';
      }
    }

    if (this.state === 'fleeing') {
      if (nearestFox) {
        const dx = this.x - nearestFox.x;
        const dy = this.y - nearestFox.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        this.vx = (dx / dist) * this.fleeSpeed;
        this.vy = (dy / dist) * this.fleeSpeed;
      }
    } else if (this.hunger < 30) {
      this.state = 'foraging';
      if (!this.targetFood || !this.targetFood.active) {
        this.targetFood = this.findNearestFood(world);
      }
      if (this.targetFood) {
        const dx = this.targetFood.x - this.x;
        const dy = this.targetFood.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this.eatRadius) {
          this.state = 'eating';
          this.targetFood.amount -= this.eatRate;
          this.hunger = Math.min(100, this.hunger + this.eatRate * 0.8);
          if (this.targetFood.amount <= 0) {
            this.targetFood.active = false;
            this.targetFood.respawnTimer = 5;
            this.targetFood = null;
            this.state = 'wandering';
          }
          if (this.hunger > 70) {
            this.state = 'wandering';
            this.targetFood = null;
          }
        } else {
          const targetVx = (dx / dist) * this.maxSpeed;
          const targetVy = (dy / dist) * this.maxSpeed;
          this.vx += (targetVx - this.vx) * this.forageAccel * dt;
          this.vy += (targetVy - this.vy) * this.forageAccel * dt;
        }
      }
    } else if (this.hunger > 70 && this.state === 'eating') {
      this.state = 'wandering';
      this.targetFood = null;
    } else if (this.state === 'wandering' || this.state === 'foraging') {
      this.state = 'wandering';
      this.vx += (Math.random() - 0.5) * 0.5;
      this.vy += (Math.random() - 0.5) * 0.5;
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      if (speed > this.maxSpeed) {
        this.vx = (this.vx / speed) * this.maxSpeed;
        this.vy = (this.vy / speed) * this.maxSpeed;
      } else if (speed < this.minSpeed) {
        this.vx = (this.vx / speed) * this.minSpeed;
        this.vy = (this.vy / speed) * this.minSpeed;
      }
    }

    if (this.state !== 'eating') {
      this.x += this.vx * dt * FPS;
      this.y += this.vy * dt * FPS;
    }

    if (this.x < 6) { this.x = 6; this.vx = Math.abs(this.vx); }
    if (this.x > CANVAS_WIDTH - 6) { this.x = CANVAS_WIDTH - 6; this.vx = -Math.abs(this.vx); }
    if (this.y < 4) { this.y = 4; this.vy = Math.abs(this.vy); }
    if (this.y > CANVAS_HEIGHT - 4) { this.y = CANVAS_HEIGHT - 4; this.vy = -Math.abs(this.vy); }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;
    const breathe = Math.sin(this.breathePhase) * 0.2;
    const angle = Math.atan2(this.vy, this.vx);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(0, breathe, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1A1A1A';
    ctx.beginPath();
    ctx.arc(9, breathe, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class Fox {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public state: FoxState;
  public targetRabbit: Rabbit | null;
  public wigglePhase: number;
  public speedMultiplier: number = 1.0;

  private readonly minSpeed: number = 3;
  private readonly maxSpeed: number = 5;
  private readonly senseRadius: number = 150;
  private readonly catchRadius: number = 10;
  private readonly chaseAccel: number = 0.8;
  private readonly patrolChangeInterval: number = 2;
  private patrolTimer: number;

  constructor(x?: number, y?: number) {
    this.x = x ?? Math.random() * CANVAS_WIDTH;
    this.y = y ?? Math.random() * CANVAS_HEIGHT;
    const angle = Math.random() * Math.PI * 2;
    const speed = this.minSpeed + Math.random() * (this.maxSpeed - this.minSpeed);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.state = 'patrolling';
    this.targetRabbit = null;
    this.wigglePhase = Math.random() * Math.PI * 2;
    this.patrolTimer = Math.random() * this.patrolChangeInterval;
  }

  private findNearestRabbit(rabbits: Rabbit[]): Rabbit | null {
    let nearest: Rabbit | null = null;
    let minDist = Infinity;
    for (const rabbit of rabbits) {
      if (!rabbit.alive) continue;
      const dx = rabbit.x - this.x;
      const dy = rabbit.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.senseRadius && dist < minDist) {
        minDist = dist;
        nearest = rabbit;
      }
    }
    return nearest;
  }

  public update(dt: number, rabbits: Rabbit[]): void {
    this.wigglePhase += dt * Math.PI * 2;

    const nearest = this.findNearestRabbit(rabbits);
    if (nearest) {
      this.state = 'chasing';
      this.targetRabbit = nearest;
    } else {
      this.state = 'patrolling';
      this.targetRabbit = null;
    }

    if (this.state === 'chasing' && this.targetRabbit) {
      const dx = this.targetRabbit.x - this.x;
      const dy = this.targetRabbit.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.catchRadius) {
        this.targetRabbit.alive = false;
        this.targetRabbit = null;
        this.state = 'patrolling';
      } else {
        const targetVx = (dx / dist) * this.maxSpeed * this.speedMultiplier;
        const targetVy = (dy / dist) * this.maxSpeed * this.speedMultiplier;
        this.vx += (targetVx - this.vx) * this.chaseAccel * dt;
        this.vy += (targetVy - this.vy) * this.chaseAccel * dt;
      }
    } else {
      this.patrolTimer -= dt;
      if (this.patrolTimer <= 0) {
        this.patrolTimer = this.patrolChangeInterval;
        const angle = Math.atan2(this.vy, this.vx) + (Math.random() - 0.5) * Math.PI;
        const speed = (this.minSpeed + Math.random() * (this.maxSpeed - this.minSpeed)) * this.speedMultiplier;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
      }
    }

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const effectiveMaxSpeed = this.maxSpeed * this.speedMultiplier;
    if (speed > effectiveMaxSpeed) {
      this.vx = (this.vx / speed) * effectiveMaxSpeed;
      this.vy = (this.vy / speed) * effectiveMaxSpeed;
    }

    this.x += this.vx * dt * FPS;
    this.y += this.vy * dt * FPS;

    if (this.x < 8) { this.x = 8; this.vx = Math.abs(this.vx); }
    if (this.x > CANVAS_WIDTH - 8) { this.x = CANVAS_WIDTH - 8; this.vx = -Math.abs(this.vx); }
    if (this.y < 8) { this.y = 8; this.vy = Math.abs(this.vy); }
    if (this.y > CANVAS_HEIGHT - 8) { this.y = CANVAS_HEIGHT - 8; this.vy = -Math.abs(this.vy); }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const angle = Math.atan2(this.vy, this.vx);
    const wiggle = Math.sin(this.wigglePhase) * (2 * Math.PI / 180);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle + wiggle);

    ctx.fillStyle = '#FF8C00';
    ctx.beginPath();
    const size = 16;
    ctx.moveTo(size * 0.6, 0);
    ctx.lineTo(-size * 0.4, size * 0.5);
    ctx.lineTo(-size * 0.4, -size * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
