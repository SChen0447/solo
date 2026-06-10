export interface ShipState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  angle: number;
  targetX: number;
  targetY: number;
  isAccelerating: boolean;
  flameLength: number;
}

export class Ship {
  state: ShipState;
  private canvasWidth: number;
  private canvasHeight: number;
  private readonly MIN_SPEED = 1;
  private readonly MAX_SPEED = 6;
  private readonly ACCELERATION = 0.15;
  private readonly DECELERATION = 0.08;
  private readonly MIN_FLAME = 4;
  private readonly MAX_FLAME = 12;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.state = {
      x: canvasWidth / 2,
      y: canvasHeight / 2,
      vx: 0,
      vy: 0,
      speed: this.MIN_SPEED,
      angle: -Math.PI / 2,
      targetX: canvasWidth / 2,
      targetY: canvasHeight / 2 - 100,
      isAccelerating: false,
      flameLength: this.MIN_FLAME
    };
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    const ratioX = canvasWidth / this.canvasWidth;
    const ratioY = canvasHeight / this.canvasHeight;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.state.x *= ratioX;
    this.state.y *= ratioY;
    this.state.targetX *= ratioX;
    this.state.targetY *= ratioY;
  }

  setTarget(x: number, y: number): void {
    this.state.targetX = x;
    this.state.targetY = y;
  }

  setAccelerating(accelerating: boolean): void {
    this.state.isAccelerating = accelerating;
  }

  update(deltaTime: number): void {
    const dt = deltaTime / 16.67;

    const dx = this.state.targetX - this.state.x;
    const dy = this.state.targetY - this.state.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 1) {
      const targetAngle = Math.atan2(dy, dx);
      let angleDiff = targetAngle - this.state.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      this.state.angle += angleDiff * 0.1 * dt;
    }

    if (this.state.isAccelerating) {
      this.state.speed = Math.min(this.state.speed + this.ACCELERATION * dt, this.MAX_SPEED);
    } else {
      this.state.speed = Math.max(this.state.speed - this.DECELERATION * dt, this.MIN_SPEED);
    }

    const speedRatio = (this.state.speed - this.MIN_SPEED) / (this.MAX_SPEED - this.MIN_SPEED);
    this.state.flameLength = this.MIN_FLAME + (this.MAX_FLAME - this.MIN_FLAME) * speedRatio;

    this.state.vx = Math.cos(this.state.angle) * this.state.speed;
    this.state.vy = Math.sin(this.state.angle) * this.state.speed;

    this.state.x += this.state.vx * dt;
    this.state.y += this.state.vy * dt;

    this.state.x = Math.max(10, Math.min(this.canvasWidth - 10, this.state.x));
    this.state.y = Math.max(10, Math.min(this.canvasHeight - 10, this.state.y));
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { x, y, angle, flameLength } = this.state;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.shadowColor = '#81d4fa';
    ctx.shadowBlur = 8;

    const flameGrad = ctx.createLinearGradient(-8, 0, -8 - flameLength, 0);
    flameGrad.addColorStop(0, '#ffeb3b');
    flameGrad.addColorStop(0.5, '#ff9800');
    flameGrad.addColorStop(1, 'rgba(255, 152, 0, 0)');

    ctx.beginPath();
    ctx.fillStyle = flameGrad;
    const flameWobble = Math.sin(Date.now() * 0.02) * 2;
    ctx.moveTo(-8, -4);
    ctx.quadraticCurveTo(-8 - flameLength / 2, -3 + flameWobble, -8 - flameLength, 0);
    ctx.quadraticCurveTo(-8 - flameLength / 2, 3 - flameWobble, -8, 4);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.fillStyle = '#4fc3f7';
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -8);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = '#81d4fa';
    ctx.lineWidth = 2;
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -8);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }

  getSpeed(): number {
    return this.state.speed;
  }

  getMaxSpeed(): number {
    return this.MAX_SPEED;
  }

  getDirection(): { dx: number; dy: number } {
    return {
      dx: Math.cos(this.state.angle),
      dy: Math.sin(this.state.angle)
    };
  }
}
