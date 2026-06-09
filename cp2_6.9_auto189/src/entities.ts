import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  ATTR_RANGES,
  HERBIVORE_ATTR,
  CARNIVORE_ATTR,
  PLANT_ATTR,
  COLORS
} from './config';
import type { Ecosystem } from './ecosystem';

function randRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function mutate(value: number, min: number, max: number): number {
  return clamp(value * randRange(0.8, 1.2), min, max);
}

export class Plant {
  x: number;
  y: number;
  size: number;
  growTimer: number;
  alive: boolean = true;

  constructor(x?: number, y?: number) {
    this.x = x !== undefined ? x : randRange(PLANT_ATTR.width, CANVAS_WIDTH - PLANT_ATTR.width);
    this.y = y !== undefined ? y : randRange(PLANT_ATTR.height, CANVAS_HEIGHT - PLANT_ATTR.height);
    this.size = randRange(ATTR_RANGES.size.min, ATTR_RANGES.size.max);
    this.growTimer = Math.floor(randRange(0, PLANT_ATTR.growInterval));
  }

  grow(ecosystem: Ecosystem): void {
    this.growTimer++;
    const interval = Math.max(10, Math.floor(PLANT_ATTR.growInterval / ecosystem.resourceRichness));
    if (this.growTimer >= interval) {
      this.growTimer = 0;
      if (ecosystem.plants.length < ecosystem.maxPopulation && !ecosystem.isDroughtActive()) {
        const angle = Math.random() * Math.PI * 2;
        const dist = randRange(20, 60);
        const nx = clamp(this.x + Math.cos(angle) * dist, PLANT_ATTR.width, CANVAS_WIDTH - PLANT_ATTR.width);
        const ny = clamp(this.y + Math.sin(angle) * dist, PLANT_ATTR.height, CANVAS_HEIGHT - PLANT_ATTR.height);
        if (ecosystem.isValidPlantPosition(nx, ny)) {
          ecosystem.plants.push(new Plant(nx, ny));
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = COLORS.plant;
    ctx.fillRect(
      this.x - PLANT_ATTR.width / 2,
      this.y - PLANT_ATTR.height / 2,
      PLANT_ATTR.width,
      PLANT_ATTR.height
    );
  }
}

export abstract class Animal {
  x: number;
  y: number;
  speed: number;
  baseSpeed: number;
  size: number;
  hunger: number;
  maxHunger: number;
  reproductionCycle: number;
  baseReproductionCycle: number;
  reproductionTimer: number;
  alive: boolean = true;
  dirX: number;
  dirY: number;
  wanderTimer: number;
  fleeing: boolean = false;
  fleeTimer: number = 0;

  constructor(x?: number, y?: number) {
    this.x = x !== undefined ? x : randRange(30, CANVAS_WIDTH - 30);
    this.y = y !== undefined ? y : randRange(30, CANVAS_HEIGHT - 30);
    this.baseSpeed = randRange(ATTR_RANGES.speed.min, ATTR_RANGES.speed.max);
    this.speed = this.baseSpeed;
    this.size = randRange(ATTR_RANGES.size.min, ATTR_RANGES.size.max);
    this.maxHunger = 100;
    this.hunger = this.maxHunger * 0.6;
    this.baseReproductionCycle = Math.floor(randRange(ATTR_RANGES.reproductionCycle.min, ATTR_RANGES.reproductionCycle.max));
    this.reproductionCycle = this.baseReproductionCycle;
    this.reproductionTimer = 0;
    const a = Math.random() * Math.PI * 2;
    this.dirX = Math.cos(a);
    this.dirY = Math.sin(a);
    this.wanderTimer = 0;
  }

  abstract update(ecosystem: Ecosystem): void;
  abstract render(ctx: CanvasRenderingContext2D): void;

  protected applyEnvEffects(ecosystem: Ecosystem): void {
    const tempFactor = 1 + ((ecosystem.temperature - 20) / 70) * 0.5;
    this.speed = this.baseSpeed * clamp(tempFactor, 0.5, 1.5);
    if (ecosystem.isDroughtActive()) {
      this.speed *= 0.7;
    }
    const humidFactor = 1 - ((ecosystem.humidity - 50) / 100) * 0.3;
    this.reproductionCycle = Math.max(3, Math.floor(this.baseReproductionCycle * clamp(humidFactor, 0.7, 1.3)));
  }

  move(targetX?: number, targetY?: number): void {
    if (this.fleeing) {
      this.fleeTimer--;
      if (this.fleeTimer <= 0) this.fleeing = false;
    }
    this.wanderTimer--;
    let dx: number, dy: number;
    if (targetX !== undefined && targetY !== undefined && !this.fleeing) {
      dx = targetX - this.x;
      dy = targetY - this.y;
    } else {
      if (this.wanderTimer <= 0) {
        const a = Math.random() * Math.PI * 2;
        this.dirX = Math.cos(a);
        this.dirY = Math.sin(a);
        this.wanderTimer = Math.floor(randRange(30, 90));
      }
      if (this.fleeing) {
        dx = -this.dirX;
        dy = -this.dirY;
      } else {
        dx = this.dirX;
        dy = this.dirY;
      }
    }
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    this.x += (dx / len) * this.speed;
    this.y += (dy / len) * this.speed;
    this.x = clamp(this.x, 10, CANVAS_WIDTH - 10);
    this.y = clamp(this.y, 10, CANVAS_HEIGHT - 10);
  }

  fleeFrom(px: number, py: number): void {
    const dx = this.x - px;
    const dy = this.y - py;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    this.dirX = dx / len;
    this.dirY = dy / len;
    this.fleeing = true;
    this.fleeTimer = 60;
  }

  decayHunger(amount: number): void {
    this.hunger -= amount;
    if (this.hunger <= 0) {
      this.alive = false;
    }
  }

  distanceTo(ox: number, oy: number): number {
    const dx = this.x - ox;
    const dy = this.y - oy;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

export class Herbivore extends Animal {
  constructor(x?: number, y?: number, parent?: Herbivore) {
    super(x, y);
    if (parent) {
      this.baseSpeed = mutate(parent.baseSpeed, ATTR_RANGES.speed.min, ATTR_RANGES.speed.max);
      this.size = mutate(parent.size, ATTR_RANGES.size.min, ATTR_RANGES.size.max);
      this.baseReproductionCycle = Math.floor(mutate(parent.baseReproductionCycle, ATTR_RANGES.reproductionCycle.min, ATTR_RANGES.reproductionCycle.max));
    }
    this.speed = this.baseSpeed;
    this.reproductionCycle = this.baseReproductionCycle;
    this.maxHunger = HERBIVORE_ATTR.maxHunger;
    this.hunger = this.maxHunger * 0.6;
  }

  private findNearestPlant(plants: Plant[]): Plant | null {
    let nearest: Plant | null = null;
    let nearestDist = HERBIVORE_ATTR.senseRange;
    for (const p of plants) {
      if (!p.alive) continue;
      const d = this.distanceTo(p.x, p.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = p;
      }
    }
    return nearest;
  }

  update(ecosystem: Ecosystem): void {
    this.applyEnvEffects(ecosystem);
    const plant = this.findNearestPlant(ecosystem.plants);
    if (plant) {
      this.move(plant.x, plant.y);
      if (this.distanceTo(plant.x, plant.y) < this.size * 4 + PLANT_ATTR.width) {
        plant.alive = false;
        this.hunger = Math.min(this.maxHunger, this.hunger + HERBIVORE_ATTR.eatGain);
      }
    } else {
      this.move();
    }
    this.decayHunger(HERBIVORE_ATTR.hungerDecay);
    this.reproductionTimer++;
    if (this.reproductionTimer >= this.reproductionCycle && this.hunger >= this.maxHunger * 0.8) {
      this.reproductionTimer = 0;
      if (ecosystem.totalPopulation() < ecosystem.maxPopulation) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 30;
        const nx = clamp(this.x + Math.cos(angle) * dist, 10, CANVAS_WIDTH - 10);
        const ny = clamp(this.y + Math.sin(angle) * dist, 10, CANVAS_HEIGHT - 10);
        ecosystem.herbivores.push(new Herbivore(nx, ny, this));
        this.hunger -= 30;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = COLORS.herbivore;
    const s = HERBIVORE_ATTR.triangleSize + this.size * 2;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - s);
    ctx.lineTo(this.x - s * 0.866, this.y + s * 0.5);
    ctx.lineTo(this.x + s * 0.866, this.y + s * 0.5);
    ctx.closePath();
    ctx.fill();
  }
}

export class Carnivore extends Animal {
  attackPower: number;
  baseAttackPower: number;

  constructor(x?: number, y?: number, parent?: Carnivore) {
    super(x, y);
    this.baseAttackPower = randRange(ATTR_RANGES.attackPower.min, ATTR_RANGES.attackPower.max);
    if (parent) {
      this.baseSpeed = mutate(parent.baseSpeed, ATTR_RANGES.speed.min, ATTR_RANGES.speed.max);
      this.size = mutate(parent.size, ATTR_RANGES.size.min, ATTR_RANGES.size.max);
      this.baseReproductionCycle = Math.floor(mutate(parent.baseReproductionCycle, ATTR_RANGES.reproductionCycle.min, ATTR_RANGES.reproductionCycle.max));
      this.baseAttackPower = mutate(parent.baseAttackPower, ATTR_RANGES.attackPower.min, ATTR_RANGES.attackPower.max);
    }
    this.attackPower = this.baseAttackPower;
    this.speed = this.baseSpeed;
    this.reproductionCycle = this.baseReproductionCycle;
    this.maxHunger = CARNIVORE_ATTR.maxHunger;
    this.hunger = this.maxHunger * 0.6;
  }

  private findNearestHerbivore(herbivores: Herbivore[]): Herbivore | null {
    let nearest: Herbivore | null = null;
    let nearestDist = CARNIVORE_ATTR.senseRange;
    for (const h of herbivores) {
      if (!h.alive) continue;
      const d = this.distanceTo(h.x, h.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = h;
      }
    }
    return nearest;
  }

  update(ecosystem: Ecosystem): void {
    this.applyEnvEffects(ecosystem);
    const herb = this.findNearestHerbivore(ecosystem.herbivores);
    if (herb) {
      this.move(herb.x, herb.y);
      const d = this.distanceTo(herb.x, herb.y);
      if (d < (CARNIVORE_ATTR.circleRadius + this.size * 2 + HERBIVORE_ATTR.triangleSize)) {
        if (this.attackPower > herb.size) {
          herb.alive = false;
          this.hunger = Math.min(this.maxHunger, this.hunger + CARNIVORE_ATTR.eatGain);
        } else {
          herb.fleeFrom(this.x, this.y);
          this.fleeFrom(herb.x, herb.y);
        }
      }
    } else {
      this.move();
    }
    this.decayHunger(CARNIVORE_ATTR.hungerDecay);
    this.reproductionTimer++;
    if (this.reproductionTimer >= this.reproductionCycle && this.hunger >= this.maxHunger * 0.8) {
      this.reproductionTimer = 0;
      if (ecosystem.totalPopulation() < ecosystem.maxPopulation) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 30;
        const nx = clamp(this.x + Math.cos(angle) * dist, 10, CANVAS_WIDTH - 10);
        const ny = clamp(this.y + Math.sin(angle) * dist, 10, CANVAS_HEIGHT - 10);
        ecosystem.carnivores.push(new Carnivore(nx, ny, this));
        this.hunger -= 30;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = COLORS.carnivore;
    ctx.beginPath();
    ctx.arc(this.x, this.y, CARNIVORE_ATTR.circleRadius + this.size * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}
