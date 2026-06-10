export type VortexDirection = 'cw' | 'ccw';

export interface VortexParams {
  x: number;
  y: number;
  radius: number;
  speed: number;
  direction: VortexDirection;
}

export class Vortex {
  public x: number;
  public y: number;
  public radius: number;
  public speed: number;
  public direction: VortexDirection;

  constructor(params: VortexParams) {
    this.x = params.x;
    this.y = params.y;
    this.radius = params.radius;
    this.speed = params.speed;
    this.direction = params.direction;
  }

  public getVelocityAt(px: number, py: number): { vx: number; vy: number } {
    const dx = px - this.x;
    const dy = py - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.001 || dist > this.radius * 3) {
      return { vx: 0, vy: 0 };
    }

    const dirSign = this.direction === 'cw' ? 1 : -1;
    const falloff = Math.exp(-(dist * dist) / (2 * this.radius * this.radius));

    const tangentX = -dy / dist;
    const tangentY = dx / dist;

    const magnitude = this.speed * falloff;

    return {
      vx: tangentX * magnitude * dirSign,
      vy: tangentY * magnitude * dirSign
    };
  }

  public containsPoint(px: number, py: number, tolerance: number = 20): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return Math.sqrt(dx * dx + dy * dy) <= tolerance;
  }
}
