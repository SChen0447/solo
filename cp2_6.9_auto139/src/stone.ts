export type StoneColor = 'red' | 'blue';

export class Stone {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: StoneColor;
  radius: number;
  isMoving: boolean;
  shakeTime: number;
  angleOffset: number;
  friction: number;

  static readonly FRICTION = 0.5;
  static readonly MAX_ANGLE_OFFSET = 2;
  static readonly SHAKE_DURATION = 0.3;

  constructor(x: number, y: number, color: StoneColor, radius = 15) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.color = color;
    this.radius = radius;
    this.isMoving = false;
    this.shakeTime = 0;
    this.angleOffset = 0;
    this.friction = Stone.FRICTION;
  }

  launch(power: number, angle: number): void {
    const jitter = (Math.random() * 2 - 1) * Stone.MAX_ANGLE_OFFSET * Math.PI / 180;
    const finalAngle = angle + jitter;
    this.vx = Math.cos(finalAngle) * power;
    this.vy = Math.sin(finalAngle) * power;
    this.isMoving = true;
  }

  update(dt: number): void {
    if (!this.isMoving) return;

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed <= 0.01) {
      this.vx = 0;
      this.vy = 0;
      this.isMoving = false;
      return;
    }

    const deceleration = this.friction * dt;
    const newSpeed = Math.max(0, speed - deceleration);
    const ratio = newSpeed / speed;

    this.vx *= ratio;
    this.vy *= ratio;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - dt);
    }
  }

  triggerShake(): void {
    this.shakeTime = Stone.SHAKE_DURATION;
  }

  getShakeOffset(): { x: number; y: number } {
    if (this.shakeTime <= 0) return { x: 0, y: 0 };
    const intensity = 3 * (this.shakeTime / Stone.SHAKE_DURATION);
    return {
      x: (Math.random() * 2 - 1) * intensity,
      y: (Math.random() * 2 - 1) * intensity
    };
  }

  distanceTo(other: Stone): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static checkCollision(a: Stone, b: Stone): boolean {
    const dist = a.distanceTo(b);
    return dist <= a.radius + b.radius;
  }

  static resolveCollision(a: Stone, b: Stone): void {
    if (!Stone.checkCollision(a, b)) return;

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;

    const nx = dx / dist;
    const ny = dy / dist;

    const overlap = a.radius + b.radius - dist;
    if (overlap > 0) {
      a.x -= nx * overlap / 2;
      a.y -= ny * overlap / 2;
      b.x += nx * overlap / 2;
      b.y += ny * overlap / 2;
    }

    const aVn = a.vx * nx + a.vy * ny;
    const bVn = b.vx * nx + b.vy * ny;

    a.vx += (bVn - aVn) * nx;
    a.vy += (bVn - aVn) * ny;
    b.vx += (aVn - bVn) * nx;
    b.vy += (aVn - bVn) * ny;

    a.isMoving = true;
    b.isMoving = true;
    a.triggerShake();
    b.triggerShake();
  }
}
