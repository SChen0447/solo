export type CreatureType = 'herbivore' | 'carnivore' | 'plant';

export interface Position {
  x: number;
  y: number;
}

export abstract class Creature {
  public x: number;
  public y: number;
  public energy: number;
  public type: CreatureType;
  public radius: number;
  public isHighlighted: boolean = false;
  public highlightTime: number = 0;

  constructor(x: number, y: number, energy: number, type: CreatureType, radius: number) {
    this.x = x;
    this.y = y;
    this.energy = energy;
    this.type = type;
    this.radius = radius;
  }

  public distanceTo(other: Creature): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public abstract render(ctx: CanvasRenderingContext2D, time: number): void;
}

export abstract class Animal extends Creature {
  public vx: number;
  public vy: number;
  public speed: number;
  public angle: number;
  public visionRadius: number;
  public maxTurnAngle: number;
  public energyDecayRate: number;
  public energyDecayInterval: number;
  public energyGainFromFood: number;
  public reproductionThreshold: number;
  public reproductionEnergy: number;
  public lastEnergyDecay: number = 0;

  constructor(
    x: number,
    y: number,
    energy: number,
    type: CreatureType,
    radius: number,
    speed: number,
    visionRadius: number,
    maxTurnAngle: number,
    energyDecayRate: number,
    energyDecayInterval: number,
    energyGainFromFood: number,
    reproductionThreshold: number,
    reproductionEnergy: number
  ) {
    super(x, y, energy, type, radius);
    this.speed = speed;
    this.visionRadius = visionRadius;
    this.maxTurnAngle = maxTurnAngle;
    this.energyDecayRate = energyDecayRate;
    this.energyDecayInterval = energyDecayInterval;
    this.energyGainFromFood = energyGainFromFood;
    this.reproductionThreshold = reproductionThreshold;
    this.reproductionEnergy = reproductionEnergy;
    this.angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(this.angle) * this.speed;
    this.vy = Math.sin(this.angle) * this.speed;
  }

  public move(
    targetX: number | null,
    targetY: number | null,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    let targetAngle: number;

    if (targetX !== null && targetY !== null) {
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      targetAngle = Math.atan2(dy, dx);
    } else {
      const turn = (Math.random() - 0.5) * 2 * this.maxTurnAngle;
      targetAngle = this.angle + turn;
    }

    let angleDiff = targetAngle - this.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const clampedDiff = Math.max(-this.maxTurnAngle, Math.min(this.maxTurnAngle, angleDiff));
    this.angle += clampedDiff;

    const targetVx = Math.cos(this.angle) * this.speed;
    const targetVy = Math.sin(this.angle) * this.speed;
    this.vx = this.vx * 0.8 + targetVx * 0.2;
    this.vy = this.vy * 0.8 + targetVy * 0.2;

    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (currentSpeed > 0) {
      this.vx = (this.vx / currentSpeed) * this.speed;
      this.vy = (this.vy / currentSpeed) * this.speed;
    }

    this.x += this.vx;
    this.y += this.vy;

    if (this.x - this.radius < 0) {
      this.x = this.radius;
      this.vx = Math.abs(this.vx);
      this.angle = Math.atan2(this.vy, this.vx);
    } else if (this.x + this.radius > canvasWidth) {
      this.x = canvasWidth - this.radius;
      this.vx = -Math.abs(this.vx);
      this.angle = Math.atan2(this.vy, this.vx);
    }

    if (this.y - this.radius < 0) {
      this.y = this.radius;
      this.vy = Math.abs(this.vy);
      this.angle = Math.atan2(this.vy, this.vx);
    } else if (this.y + this.radius > canvasHeight) {
      this.y = canvasHeight - this.radius;
      this.vy = -Math.abs(this.vy);
      this.angle = Math.atan2(this.vy, this.vx);
    }
  }

  public updateEnergy(elapsedMs: number): boolean {
    this.lastEnergyDecay += elapsedMs;
    if (this.lastEnergyDecay >= this.energyDecayInterval) {
      this.energy -= this.energyDecayRate;
      this.lastEnergyDecay = 0;
    }
    return this.energy < 0;
  }

  public eat(): void {
    this.energy += this.energyGainFromFood;
  }

  public canReproduce(): boolean {
    return this.energy >= this.reproductionThreshold;
  }

  public reproduce(): Animal {
    this.energy = this.reproductionEnergy;
    const offsetAngle = Math.random() * Math.PI * 2;
    const offsetDist = this.radius * 3;
    const childX = this.x + Math.cos(offsetAngle) * offsetDist;
    const childY = this.y + Math.sin(offsetAngle) * offsetDist;
    return this.createChild(childX, childY);
  }

  protected abstract createChild(x: number, y: number): Animal;

  protected renderHighlight(ctx: CanvasRenderingContext2D, time: number): void {
    if (!this.isHighlighted) return;
    const phase = ((time / 300) % 1);
    const alpha = 0.8 - 0.6 * phase;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 235, 59, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

export class Herbivore extends Animal {
  constructor(x: number, y: number, energy: number = 50) {
    super(
      x,
      y,
      energy,
      'herbivore',
      8,
      0.8,
      100,
      (Math.PI / 180) * 45,
      5,
      3000,
      10,
      100,
      50
    );
  }

  protected createChild(x: number, y: number): Animal {
    return new Herbivore(x, y, 50);
  }

  public render(ctx: CanvasRenderingContext2D, time: number): void {
    this.renderHighlight(ctx, time);

    ctx.save();
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#c5e1a5';
    ctx.beginPath();
    ctx.arc(this.x - this.radius / 3, this.y - this.radius / 3, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class Carnivore extends Animal {
  constructor(x: number, y: number, energy: number = 50) {
    super(
      x,
      y,
      energy,
      'carnivore',
      6,
      1.2,
      150,
      (Math.PI / 180) * 30,
      8,
      4000,
      15,
      120,
      60
    );
  }

  protected createChild(x: number, y: number): Animal {
    return new Carnivore(x, y, 60);
  }

  public render(ctx: CanvasRenderingContext2D, time: number): void {
    this.renderHighlight(ctx, time);

    const side = 12;
    const r = side / Math.sqrt(3);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.fillStyle = '#f44336';
    ctx.strokeStyle = '#b71c1c';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(r * Math.cos((2 * Math.PI) / 3), r * Math.sin((2 * Math.PI) / 3));
    ctx.lineTo(r * Math.cos((4 * Math.PI) / 3), r * Math.sin((4 * Math.PI) / 3));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

export class Plant extends Creature {
  constructor(x: number, y: number) {
    super(x, y, 999, 'plant', 3);
  }

  public render(ctx: CanvasRenderingContext2D, time: number): void {
    this.renderHighlight(ctx, time);

    ctx.save();
    ctx.fillStyle = '#1b5e20';
    ctx.strokeStyle = '#2e7d32';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
