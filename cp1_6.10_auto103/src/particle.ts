import { FlowField } from './flowField';

const PARTICLE_COLORS = ['#e74c3c', '#f39c12', '#3498db', '#1abc9c'];
const TRAIL_LENGTH = 100;

export interface TrailPoint {
  x: number;
  y: number;
}

export class Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public color: string;
  public radius: number;
  public trail: TrailPoint[];

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 2;
    this.color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
    this.trail = [];
  }

  public update(flowField: FlowField, containerX: number, containerY: number, containerWidth: number, containerHeight: number): void {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > TRAIL_LENGTH) {
      this.trail.shift();
    }

    const velocity = flowField.getVelocityAt(this.x, this.y);
    this.vx = velocity.vx;
    this.vy = velocity.vy;

    this.x += this.vx;
    this.y += this.vy;

    const wallThickness = 3;
    const left = containerX + wallThickness + this.radius;
    const right = containerX + containerWidth - wallThickness - this.radius;
    const top = containerY + wallThickness + this.radius;
    const bottom = containerY + containerHeight - wallThickness - this.radius;

    if (this.x < left) {
      this.x = left;
      this.vx = -this.vx * 0.5;
    }
    if (this.x > right) {
      this.x = right;
      this.vx = -this.vx * 0.5;
    }
    if (this.y < top) {
      this.y = top;
      this.vy = -this.vy * 0.5;
    }
    if (this.y > bottom) {
      this.y = bottom;
      this.vy = -this.vy * 0.5;
    }
  }

  public getSpeed(): number {
    return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  }
}

export function createParticles(count: number, containerX: number, containerY: number, containerWidth: number, containerHeight: number): Particle[] {
  const particles: Particle[] = [];
  const wallThickness = 3;
  const padding = 10;
  const minX = containerX + wallThickness + padding;
  const maxX = containerX + containerWidth - wallThickness - padding;
  const minY = containerY + wallThickness + padding;
  const maxY = containerY + containerHeight - wallThickness - padding;

  for (let i = 0; i < count; i++) {
    const x = minX + Math.random() * (maxX - minX);
    const y = minY + Math.random() * (maxY - minY);
    particles.push(new Particle(x, y));
  }

  return particles;
}
