import { checkBallWallCollision, Wall } from './collision';

export interface TrailParticle {
  x: number;
  y: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export class Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  active: boolean;
  ownerId: number;
  trail: TrailParticle[] = [];
  private maxTrailParticles = 150;
  private trailEmitRate = 2;
  private trailCounter = 0;
  private speed = 8;

  constructor(x: number, y: number, vx: number, vy: number, color: string, ownerId: number) {
    this.x = x;
    this.y = y;
    this.vx = vx * this.speed;
    this.vy = vy * this.speed;
    this.radius = 15;
    this.color = color;
    this.active = true;
    this.ownerId = ownerId;
  }

  update(wall: Wall): void {
    if (!this.active) return;

    this.x += this.vx;
    this.y += this.vy;

    const collision = checkBallWallCollision(
      { x: this.x, y: this.y, radius: this.radius, vx: this.vx, vy: this.vy },
      wall
    );

    if (collision.collided) {
      this.vx = collision.newVx;
      this.vy = collision.newVy;

      if (this.x - this.radius < wall.left) {
        this.x = wall.left + this.radius;
      }
      if (this.x + this.radius > wall.right) {
        this.x = wall.right - this.radius;
      }
      if (this.y - this.radius < wall.top) {
        this.y = wall.top + this.radius;
      }
      if (this.y + this.radius > wall.bottom) {
        this.y = wall.bottom - this.radius;
      }
    }

    this.trailCounter++;
    if (this.trailCounter >= this.trailEmitRate) {
      this.trailCounter = 0;
      this.emitTrailParticle();
    }

    this.updateTrail();
  }

  private emitTrailParticle(): void {
    if (this.trail.length >= this.maxTrailParticles) {
      this.trail.shift();
    }

    this.trail.push({
      x: this.x,
      y: this.y,
      alpha: 0.6,
      life: 1,
      maxLife: 1
    });
  }

  private updateTrail(): void {
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const p = this.trail[i];
      p.life -= 0.03;
      p.alpha = p.life * 0.6;

      if (p.life <= 0) {
        this.trail.splice(i, 1);
      }
    }
  }

  getTrailParticles(): TrailParticle[] {
    return this.trail;
  }

  getColor(): string {
    return this.color;
  }
}
