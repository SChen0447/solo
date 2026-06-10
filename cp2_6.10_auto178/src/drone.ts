export interface Vec2 {
  x: number;
  y: number;
}

export interface DroneState {
  position: Vec2;
  velocity: Vec2;
  speed: number;
  angle: number;
  angularVelocity: number;
}

export interface InputState {
  accelerate: boolean;
  decelerate: boolean;
  turnLeft: boolean;
  turnRight: boolean;
}

const ACCELERATION = 0.5;
const DECELERATION = 0.3;
const MAX_SPEED = 5;
const TURN_SPEED = (Math.PI / 2);
const BOUNCE_COEFFICIENT = 0.4;
const STOP_THRESHOLD = 0.01;
const STOP_TIME_THRESHOLD = 2;

export class Drone {
  public position: Vec2;
  public velocity: Vec2;
  public angle: number;
  public stopped: boolean = false;
  private stopTimer: number = 0;
  private lastCollisionNormal: Vec2 | null = null;

  constructor(startX: number, startY: number, startAngle: number = 0) {
    this.position = { x: startX, y: startY };
    this.velocity = { x: 0, y: 0 };
    this.angle = startAngle;
  }

  public getState(): DroneState {
    const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    return {
      position: { ...this.position },
      velocity: { ...this.velocity },
      speed,
      angle: this.angle,
      angularVelocity: 0
    };
  }

  public getSpeed(): number {
    return Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
  }

  public isStopped(): boolean {
    return this.stopped;
  }

  public getStopTime(): number {
    return this.stopTimer;
  }

  public update(dt: number, input: InputState): void {
    const currentSpeed = this.getSpeed();

    if (input.turnLeft) {
      this.angle -= TURN_SPEED * dt;
    }
    if (input.turnRight) {
      this.angle += TURN_SPEED * dt;
    }

    let acceleration = 0;
    if (input.accelerate) {
      acceleration = ACCELERATION;
    } else if (input.decelerate) {
      acceleration = -DECELERATION;
    } else if (currentSpeed > 0) {
      acceleration = -DECELERATION * 0.3;
    }

    const forwardX = Math.cos(this.angle);
    const forwardY = Math.sin(this.angle);

    let newSpeed = currentSpeed + acceleration * dt;
    newSpeed = Math.max(0, Math.min(MAX_SPEED, newSpeed));

    if (currentSpeed > 0) {
      this.velocity.x = (this.velocity.x / currentSpeed) * newSpeed;
      this.velocity.y = (this.velocity.y / currentSpeed) * newSpeed;
    }

    if (acceleration > 0 && newSpeed > 0) {
      this.velocity.x = forwardX * newSpeed;
      this.velocity.y = forwardY * newSpeed;
    }

    if (newSpeed <= 0) {
      this.velocity.x = 0;
      this.velocity.y = 0;
    }

    this.position.x += this.velocity.x * dt * 60;
    this.position.y += this.velocity.y * dt * 60;

    if (newSpeed < STOP_THRESHOLD) {
      this.stopTimer += dt;
      if (this.stopTimer >= STOP_TIME_THRESHOLD) {
        this.stopped = true;
      }
    } else {
      this.stopTimer = 0;
      this.stopped = false;
    }
  }

  public handleCollision(collisionNormal: Vec2): void {
    const dotProduct = this.velocity.x * collisionNormal.x + this.velocity.y * collisionNormal.y;

    if (dotProduct < 0) {
      this.velocity.x -= 2 * dotProduct * collisionNormal.x;
      this.velocity.y -= 2 * dotProduct * collisionNormal.y;
    }

    const currentSpeed = this.getSpeed();
    if (currentSpeed > 0) {
      const newSpeed = currentSpeed * BOUNCE_COEFFICIENT;
      this.velocity.x = (this.velocity.x / currentSpeed) * newSpeed;
      this.velocity.y = (this.velocity.y / currentSpeed) * newSpeed;
    }

    const pushDistance = 3;
    this.position.x += collisionNormal.x * pushDistance;
    this.position.y += collisionNormal.y * pushDistance;

    this.lastCollisionNormal = collisionNormal;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.position;
    const size = 12;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.angle);

    ctx.fillStyle = '#ff5722';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.7, size * 0.6);
    ctx.lineTo(-size * 0.4, 0);
    ctx.lineTo(-size * 0.7, -size * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#2196f3';
    ctx.beginPath();
    ctx.arc(size * 0.3, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    const speed = this.getSpeed();
    if (speed > 0.5) {
      const trailLength = Math.min(speed * 10, 30);
      const backX = x - Math.cos(this.angle) * trailLength;
      const backY = y - Math.sin(this.angle) * trailLength;

      const gradient = ctx.createLinearGradient(x, y, backX, backY);
      gradient.addColorStop(0, 'rgba(255, 152, 0, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 152, 0, 0)');

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(this.angle) * 10, y - Math.sin(this.angle) * 10);
      ctx.lineTo(backX, backY);
      ctx.stroke();
    }
  }
}
