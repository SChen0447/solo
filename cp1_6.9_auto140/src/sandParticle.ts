import type p5 from 'p5';
import { randomSandColor, hexToRgb } from './colorPalette';

export const GRAVITY = 0.3;
export const ELASTICITY = 0.4;
export const PARTICLE_SIZE = 3;

export class SandParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  isFalling: boolean;
  passedThroughChannel: boolean;
  settled: boolean;
  originalColor: string;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.color = randomSandColor();
    this.originalColor = this.color;
    this.isFalling = true;
    this.passedThroughChannel = false;
    this.settled = false;
  }

  update(): void {
    if (!this.isFalling || this.settled) return;
    this.vy += GRAVITY;
    this.x += this.vx;
    this.y += this.vy;
  }

  draw(p: p5): void {
    const rgb = hexToRgb(this.color);
    p.noStroke();
    p.fill(rgb.r, rgb.g, rgb.b, 255);
    p.circle(this.x, this.y, PARTICLE_SIZE);
  }

  reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.color = randomSandColor();
    this.originalColor = this.color;
    this.isFalling = true;
    this.passedThroughChannel = false;
    this.settled = false;
  }

  bounceX(): void {
    this.vx = -this.vx * ELASTICITY;
  }

  stop(): void {
    this.vx = 0;
    this.vy = 0;
    this.isFalling = false;
    this.settled = true;
  }
}
