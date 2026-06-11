import { Vec2 } from './BlackHole';

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export class PlayerShip {
  public x: number;
  public y: number;
  public vx: number = 0;
  public vy: number = 0;
  public angle: number = 0;
  public angularVelocity: number = 0;

  public initialX: number;
  public initialY: number;

  public trail: TrailPoint[] = [];
  private readonly MAX_TRAIL_LENGTH: number = 100;

  private keys: Set<string> = new Set();
  private readonly ACCELERATION: number = 220;
  private readonly ANGULAR_ACCEL: number = 5;
  private readonly ANGULAR_DRAG: number = 0.92;
  private readonly THRUST_DRAG: number = 0.995;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.initialX = x;
    this.initialY = y;
    this.setupInput();
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      this.keys.add(e.key.toLowerCase());
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.keys.delete(e.key.toLowerCase());
    });
  }

  public isResetPressed(): boolean {
    return this.keys.has('r');
  }

  public consumeResetPress(): void {
    this.keys.delete('r');
  }

  public reset(): void {
    this.x = this.initialX;
    this.y = this.initialY;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.angularVelocity = 0;
    this.trail = [];
  }

  public setInitialPosition(x: number, y: number): void {
    this.initialX = x;
    this.initialY = y;
  }

  public update(deltaTime: number, gravityAccel: Vec2): void {
    this.handleInput(deltaTime);

    this.vx += gravityAccel.x * deltaTime;
    this.vy += gravityAccel.y * deltaTime;

    this.vx *= this.THRUST_DRAG;
    this.vy *= this.THRUST_DRAG;

    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;

    this.angularVelocity *= this.ANGULAR_DRAG;
    this.angle += this.angularVelocity * deltaTime;

    this.updateTrail();
  }

  private handleInput(deltaTime: number): void {
    let thrustX: number = 0;
    let thrustY: number = 0;

    if (this.keys.has('w') || this.keys.has('arrowup')) {
      thrustY -= 1;
    }
    if (this.keys.has('s') || this.keys.has('arrowdown')) {
      thrustY += 1;
    }
    if (this.keys.has('a') || this.keys.has('arrowleft')) {
      thrustX -= 1;
    }
    if (this.keys.has('d') || this.keys.has('arrowright')) {
      thrustX += 1;
    }

    const mag: number = Math.sqrt(thrustX * thrustX + thrustY * thrustY);
    if (mag > 0) {
      thrustX /= mag;
      thrustY /= mag;
      this.vx += thrustX * this.ACCELERATION * deltaTime;
      this.vy += thrustY * this.ACCELERATION * deltaTime;

      const targetAngle: number = Math.atan2(thrustY, thrustX);
      let angleDiff: number = targetAngle - this.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      this.angularVelocity += angleDiff * this.ANGULAR_ACCEL * deltaTime;
    }
  }

  private updateTrail(): void {
    const speed: number = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > 5) {
      this.trail.push({ x: this.x, y: this.y, alpha: 1 });
      if (this.trail.length > this.MAX_TRAIL_LENGTH) {
        this.trail.shift();
      }
    }

    for (let i: number = 0; i < this.trail.length; i++) {
      this.trail[i].alpha = (i + 1) / this.trail.length;
    }
  }

  public getSpeed(): number {
    return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    this.drawTrail(ctx);
    this.drawFlame(ctx);
    this.drawShip(ctx);
  }

  private drawTrail(ctx: CanvasRenderingContext2D): void {
    if (this.trail.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i: number = 1; i < this.trail.length; i++) {
      const p0: TrailPoint = this.trail[i - 1];
      const p1: TrailPoint = this.trail[i];
      const alpha: number = p1.alpha * 0.4;

      ctx.strokeStyle = `rgba(255, 180, 100, ${alpha})`;
      ctx.lineWidth = 2 * p1.alpha;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawFlame(ctx: CanvasRenderingContext2D): void {
    const speed: number = this.getSpeed();
    const maxFlameLength: number = Math.min(50, 10 + speed * 0.6);
    if (maxFlameLength < 3) return;

    const backAngle: number = this.angle + Math.PI;
    const noseOffset: number = 14;
    const baseX: number = this.x + Math.cos(backAngle) * noseOffset * 0.3;
    const baseY: number = this.y + Math.sin(backAngle) * noseOffset * 0.3;

    ctx.save();
    ctx.translate(baseX, baseY);
    ctx.rotate(backAngle);

    const flicker: number = 0.8 + Math.random() * 0.4;
    const flameLength: number = maxFlameLength * flicker;

    const gradient: CanvasGradient = ctx.createLinearGradient(0, 0, flameLength, 0);
    gradient.addColorStop(0, 'rgba(255, 120, 40, 0.9)');
    gradient.addColorStop(0.4, 'rgba(255, 80, 20, 0.6)');
    gradient.addColorStop(0.7, 'rgba(255, 40, 10, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 20, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.quadraticCurveTo(flameLength * 0.5, -8 * flicker, flameLength, 0);
    ctx.quadraticCurveTo(flameLength * 0.5, 8 * flicker, 0, 5);
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = 'rgba(255, 150, 50, 0.8)';
    ctx.shadowBlur = 15;
    ctx.fillStyle = 'rgba(255, 220, 150, 0.8)';
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.quadraticCurveTo(flameLength * 0.3, -3, flameLength * 0.5, 0);
    ctx.quadraticCurveTo(flameLength * 0.3, 3, 0, 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawShip(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const size: number = 14;

    ctx.shadowColor = 'rgba(200, 230, 255, 0.9)';
    ctx.shadowBlur = 12;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.7, -size * 0.65);
    ctx.lineTo(-size * 0.3, 0);
    ctx.lineTo(-size * 0.7, size * 0.65);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(150, 210, 255, 0.8)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(100, 200, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(size * 0.2, 0, size * 0.22, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
