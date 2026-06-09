export interface Vec2 {
  x: number;
  y: number;
}

export type ObjectType = 'box' | 'barrel' | 'bottle' | 'door' | 'player' | 'energy' | 'marker';

export interface ObjectState {
  id: string;
  type: ObjectType;
  position: Vec2;
  velocity: Vec2;
  rotation: number;
  broken?: boolean;
  burning?: boolean;
  burnStartTime?: number;
  open?: boolean;
  locked?: boolean;
  pushable?: boolean;
  collected?: boolean;
}

export interface TimeMarker {
  id: string;
  time: number;
  objectId: string;
  position: Vec2;
}

export interface RippleEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  startTime: number;
  duration: number;
}

const WORLD_WIDTH = 600;
const WORLD_HEIGHT = 400;

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

let idCounter = 0;
function genId(prefix: string): string {
  return `${prefix}_${++idCounter}_${Date.now().toString(36)}`;
}

export abstract class GameObject {
  id: string;
  type: ObjectType;
  position: Vec2;
  velocity: Vec2;
  rotation: number;
  recordedStates: Map<number, ObjectState> = new Map();
  hovered: boolean = false;
  pushable: boolean = true;

  constructor(id: string, type: ObjectType, position: Vec2) {
    this.id = id;
    this.type = type;
    this.position = { ...position };
    this.velocity = { x: 0, y: 0 };
    this.rotation = 0;
  }

  abstract getBoundingRadius(): number;
  abstract render(ctx: CanvasRenderingContext2D, time: number): void;

  containsPoint(px: number, py: number): boolean {
    const dx = px - this.position.x;
    const dy = py - this.position.y;
    return Math.sqrt(dx * dx + dy * dy) <= this.getBoundingRadius() * 1.2;
  }

  recordState(gameTime: number): void {
    this.recordedStates.set(gameTime, this.getState());
  }

  restoreToState(state: ObjectState): void {
    this.position = { ...state.position };
    this.velocity = { ...state.velocity };
    this.rotation = state.rotation;
    if (state.broken !== undefined) (this as any).broken = state.broken;
    if (state.burning !== undefined) (this as any).burning = state.burning;
    if (state.burnStartTime !== undefined) (this as any).burnStartTime = state.burnStartTime;
    if (state.open !== undefined) (this as any).open = state.open;
    if (state.locked !== undefined) (this as any).locked = state.locked;
    if (state.collected !== undefined) (this as any).collected = state.collected;
  }

  getState(): ObjectState {
    return {
      id: this.id,
      type: this.type,
      position: { ...this.position },
      velocity: { ...this.velocity },
      rotation: this.rotation,
      broken: (this as any).broken,
      burning: (this as any).burning,
      burnStartTime: (this as any).burnStartTime,
      open: (this as any).open,
      locked: (this as any).locked,
      pushable: this.pushable,
      collected: (this as any).collected
    };
  }

  applyPhysics(dt: number, allObjects: GameObject[]): void {
    if (!this.pushable) return;

    this.velocity.x *= 0.92;
    this.velocity.y *= 0.92;

    this.position.x += this.velocity.x * dt * 60;
    this.position.y += this.velocity.y * dt * 60;

    const r = this.getBoundingRadius();
    this.position.x = Math.max(r, Math.min(WORLD_WIDTH - r, this.position.x));
    this.position.y = Math.max(r, Math.min(WORLD_HEIGHT - r, this.position.y));

    for (const other of allObjects) {
      if (other === this) continue;
      if (other.type === 'energy' || other.type === 'marker') continue;
      this.resolveCollision(other);
    }
  }

  private resolveCollision(other: GameObject): void {
    const dx = other.position.x - this.position.x;
    const dy = other.position.y - this.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = this.getBoundingRadius() + other.getBoundingRadius();

    if (dist < minDist && dist > 0) {
      const overlap = (minDist - dist) / 2;
      const nx = dx / dist;
      const ny = dy / dist;

      if (this.pushable) {
        this.position.x -= nx * overlap;
        this.position.y -= ny * overlap;
      }
      if (other.pushable) {
        other.position.x += nx * overlap;
        other.position.y += ny * overlap;
      }

      const relVx = this.velocity.x - other.velocity.x;
      const relVy = this.velocity.y - other.velocity.y;
      const dotProduct = relVx * nx + relVy * ny;

      if (dotProduct > 0) {
        const restitution = 0.3;
        if (this.pushable) {
          this.velocity.x -= restitution * dotProduct * nx;
          this.velocity.y -= restitution * dotProduct * ny;
        }
        if (other.pushable) {
          other.velocity.x += restitution * dotProduct * nx;
          other.velocity.y += restitution * dotProduct * ny;
        }
      }
    }
  }

  applyImpulse(dx: number, dy: number): void {
    if (!this.pushable) return;
    this.velocity.x += dx;
    this.velocity.y += dy;
  }
}

export class Box extends GameObject {
  size: number = 30;
  broken: boolean = false;

  constructor(position: Vec2) {
    super(genId('box'), 'box', position);
  }

  getBoundingRadius(): number {
    return this.size * 0.7;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const s = this.size * (this.hovered ? 1.5 : 1);
    const { x, y } = this.position;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.rotation);

    ctx.fillStyle = '#8B4513';
    ctx.strokeStyle = this.hovered ? '#00E5FF' : '#5C3317';
    ctx.lineWidth = this.hovered ? 3 : 2;

    ctx.beginPath();
    ctx.rect(-s / 2, -s / 2, s, s);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = this.hovered ? 'rgba(0, 229, 255, 0.5)' : 'rgba(92, 51, 23, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-s / 2, 0);
    ctx.lineTo(s / 2, 0);
    ctx.moveTo(0, -s / 2);
    ctx.lineTo(0, s / 2);
    ctx.stroke();

    ctx.restore();
  }
}

export class Barrel extends GameObject {
  radius: number = 12;
  height: number = 20;
  burning: boolean = false;
  burnStartTime: number = 0;

  constructor(position: Vec2) {
    super(genId('barrel'), 'barrel', position);
  }

  getBoundingRadius(): number {
    return this.radius;
  }

  ignite(currentTime: number): void {
    if (!this.burning) {
      this.burning = true;
      this.burnStartTime = currentTime;
    }
  }

  extinguish(): void {
    this.burning = false;
  }

  render(ctx: CanvasRenderingContext2D, time: number): void {
    const r = this.radius * (this.hovered ? 1.5 : 1);
    const h = this.height;
    const { x, y } = this.position;

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = '#CC3333';
    ctx.strokeStyle = this.hovered ? '#00E5FF' : '#8B0000';
    ctx.lineWidth = this.hovered ? 3 : 2;

    ctx.beginPath();
    ctx.ellipse(0, -h / 4, r, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#A02020';
    ctx.beginPath();
    ctx.rect(-r, -h / 4, r * 2, h / 2);
    ctx.fill();

    ctx.strokeStyle = this.hovered ? '#00E5FF' : '#8B0000';
    ctx.strokeRect(-r, -h / 4, r * 2, h / 2);

    ctx.fillStyle = '#B02525';
    ctx.beginPath();
    ctx.ellipse(0, h / 4, r, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (this.burning) {
      const flicker = Math.sin(time * 20) * 2;
      ctx.fillStyle = '#FF6B00';
      ctx.beginPath();
      ctx.ellipse(0, -h / 2 - 8 + flicker, 8, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFDD00';
      ctx.beginPath();
      ctx.ellipse(0, -h / 2 - 5 + flicker, 4, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 200, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(0, -h / 2 - 5, 20, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

export class Bottle extends GameObject {
  radius: number = 8;
  broken: boolean = false;

  constructor(position: Vec2) {
    super(genId('bottle'), 'bottle', position);
  }

  getBoundingRadius(): number {
    return this.radius;
  }

  break(): void {
    if (!this.broken) {
      this.broken = true;
      this.pushable = false;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const r = this.radius * (this.hovered ? 1.5 : 1);
    const { x, y } = this.position;

    ctx.save();
    ctx.translate(x, y);

    if (this.broken) {
      ctx.fillStyle = 'rgba(0, 229, 255, 0.3)';
      ctx.strokeStyle = this.hovered ? '#00E5FF' : 'rgba(0, 229, 255, 0.5)';
      ctx.lineWidth = 1;

      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const dist = r * 1.2;
        const sx = Math.cos(angle) * dist * 0.3;
        const sy = Math.sin(angle) * dist * 0.3;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(Math.cos(angle) * dist, Math.sin(angle) * dist);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = 'rgba(0, 229, 255, 0.4)';
      ctx.strokeStyle = this.hovered ? '#00E5FF' : 'rgba(0, 229, 255, 0.8)';
      ctx.lineWidth = this.hovered ? 2.5 : 1.5;

      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.ellipse(-r * 0.3, -r * 0.5, r * 0.25, r * 0.4, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

export class Door extends GameObject {
  width: number = 20;
  height: number = 40;
  open: boolean = false;
  locked: boolean = false;
  pushable: boolean = false;

  constructor(position: Vec2) {
    super(genId('door'), 'door', position);
  }

  getBoundingRadius(): number {
    return Math.max(this.width, this.height) / 2;
  }

  containsPoint(px: number, py: number): boolean {
    const dx = Math.abs(px - this.position.x);
    const dy = Math.abs(py - this.position.y);
    return dx <= this.width / 2 + 5 && dy <= this.height / 2 + 5;
  }

  toggle(): void {
    if (!this.locked) {
      this.open = !this.open;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const w = this.width * (this.hovered ? 1.5 : 1);
    const h = this.height * (this.hovered ? 1.5 : 1);
    const { x, y } = this.position;

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = this.open ? 'rgba(139, 90, 43, 0.3)' : '#8B5A2B';
    ctx.strokeStyle = this.hovered ? '#00E5FF' : '#5C3A1A';
    ctx.lineWidth = this.hovered ? 3 : 2;

    if (this.open) {
      ctx.beginPath();
      ctx.moveTo(-w / 2, -h / 2);
      ctx.lineTo(-w / 2 - w * 0.6, -h / 2);
      ctx.lineTo(-w / 2 - w * 0.6, h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.rect(-w / 2, -h / 2, w, h);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = this.hovered ? '#00E5FF' : '#D4AF37';
      ctx.beginPath();
      ctx.arc(w / 2 - 4, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.locked) {
      ctx.fillStyle = '#FF6B6B';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔒', 0, 0);
    }

    ctx.restore();
  }
}

export class PlayerCursor extends GameObject {
  radius: number = 6;
  pushable: boolean = false;

  constructor(position: Vec2) {
    super('player', 'player', position);
  }

  getBoundingRadius(): number {
    return this.radius;
  }

  containsPoint(): boolean {
    return false;
  }

  render(ctx: CanvasRenderingContext2D, time: number): void {
    const r = this.radius;
    const { x, y } = this.position;
    const pulse = Math.sin(time * 4) * 2;

    ctx.save();
    ctx.translate(x, y);

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 3 + pulse);
    gradient.addColorStop(0, 'rgba(0, 229, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 229, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, r * 3 + pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  moveTo(target: Vec2): void {
    this.position.x = target.x;
    this.position.y = target.y;
  }
}

export class EnergyOrb extends GameObject {
  radius: number = 10;
  collected: boolean = false;
  pushable: boolean = false;
  spawnTime: number;

  constructor(position: Vec2, spawnTime: number) {
    super(genId('energy'), 'energy', position);
    this.spawnTime = spawnTime;
  }

  getBoundingRadius(): number {
    return this.radius;
  }

  render(ctx: CanvasRenderingContext2D, time: number): void {
    if (this.collected) return;

    const r = this.radius;
    const { x, y } = this.position;
    const bob = Math.sin(time * 3 + this.spawnTime) * 3;
    const pulse = Math.sin(time * 5 + this.spawnTime) * 0.2 + 1;

    ctx.save();
    ctx.translate(x, y + bob);

    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.5 * pulse);
    glowGradient.addColorStop(0, 'rgba(0, 255, 136, 0.5)');
    glowGradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.5 * pulse, 0, Math.PI * 2);
    ctx.fill();

    const coreGradient = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
    coreGradient.addColorStop(0, '#88FFCC');
    coreGradient.addColorStop(0.5, '#00FF88');
    coreGradient.addColorStop(1, '#00AA55');
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}

export class MarkerVisual extends GameObject {
  radius: number = 10;
  pushable: boolean = false;
  markerTime: number;
  connectedObjectId: string;

  constructor(position: Vec2, markerTime: number, objectId: string) {
    super(genId('marker'), 'marker', position);
    this.markerTime = markerTime;
    this.connectedObjectId = objectId;
  }

  getBoundingRadius(): number {
    return this.radius;
  }

  containsPoint(): boolean {
    return false;
  }

  render(ctx: CanvasRenderingContext2D, time: number): void {
    const r = this.radius;
    const { x, y } = this.position;
    const bob = Math.sin(time * 2) * 4;
    const pulse = Math.sin(time * 4) * 0.15 + 1;

    ctx.save();
    ctx.translate(x, y + bob);

    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.5 * pulse);
    glowGradient.addColorStop(0, 'rgba(0, 229, 255, 0.5)');
    glowGradient.addColorStop(1, 'rgba(0, 229, 255, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.5 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(0, 229, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#00E5FF';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⏱', 0, 0);

    ctx.restore();
  }
}

export function generateRandomObjects(): GameObject[] {
  const objects: GameObject[] = [];

  for (let i = 0; i < 3; i++) {
    objects.push(new Box({
      x: rand(80, WORLD_WIDTH - 80),
      y: rand(80, WORLD_HEIGHT - 80)
    }));
  }

  for (let i = 0; i < 2; i++) {
    objects.push(new Barrel({
      x: rand(60, WORLD_WIDTH - 60),
      y: rand(60, WORLD_HEIGHT - 60)
    }));
  }

  for (let i = 0; i < 4; i++) {
    objects.push(new Bottle({
      x: rand(50, WORLD_WIDTH - 50),
      y: rand(50, WORLD_HEIGHT - 50)
    }));
  }

  const doorPositions = [
    { x: 30, y: WORLD_HEIGHT / 2 },
    { x: WORLD_WIDTH - 30, y: WORLD_HEIGHT / 2 },
    { x: WORLD_WIDTH / 2, y: 30 }
  ];
  for (const pos of doorPositions) {
    objects.push(new Door(pos));
  }

  return objects;
}

export { WORLD_WIDTH, WORLD_HEIGHT };
