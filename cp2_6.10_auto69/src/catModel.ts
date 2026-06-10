import { CatBehaviorState } from './catAI';

export interface CatDirtyRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class CatModel {
  public x: number;
  public y: number;
  public state: CatBehaviorState = 'chasing';
  public direction: number = 1;
  public walkingPhase: number = 0;
  public breathePhase: number = 0;
  public pounceTimer: number = 0;
  public sleepTimer: number = 0;
  public transitionProgress: number = 1;
  public prevState: CatBehaviorState = 'chasing';
  private readonly catSize = 30;
  private readonly pounceDuration = 500;
  private readonly transitionDuration = 200;
  private prevX: number;
  private prevY: number;
  public shakeOffset: number = 0;
  public tiltAngle: number = 0;

  constructor(initialX: number, initialY: number) {
    this.x = initialX;
    this.y = initialY;
    this.prevX = initialX;
    this.prevY = initialY;
  }

  public update(
    targetX: number,
    targetY: number,
    newState: CatBehaviorState,
    speedMultiplier: number,
    baseSpeed: number,
    deltaTime: number
  ): void {
    this.prevX = this.x;
    this.prevY = this.y;

    if (newState !== this.state && this.transitionProgress >= 1) {
      this.prevState = this.state;
      this.state = newState;
      this.transitionProgress = 0;
    }

    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + deltaTime / this.transitionDuration);
    }

    const speed = baseSpeed * speedMultiplier * (deltaTime / 16.67);

    if (this.state === 'chasing' || this.state === 'sidestepping') {
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 1) {
        this.x += (dx / dist) * speed;
        this.y += (dy / dist) * speed;
        this.direction = dx >= 0 ? 1 : -1;
        this.walkingPhase += deltaTime * 0.01;
      }

      if (this.state === 'sidestepping') {
        this.tiltAngle = this.direction * 0.2;
        this.shakeOffset = Math.sin(deltaTime * 0.05) * 1.5;
      } else {
        this.tiltAngle = 0;
        this.shakeOffset = 0;
      }
    }

    if (this.state === 'pouncing') {
      this.pounceTimer += deltaTime;
      if (this.pounceTimer >= this.pounceDuration) {
        this.pounceTimer = 0;
      }
    } else {
      this.pounceTimer = 0;
    }

    if (this.state === 'sleeping') {
      this.sleepTimer += deltaTime;
      this.breathePhase = (this.sleepTimer / 2000) * Math.PI * 2;
    } else {
      this.sleepTimer = 0;
    }
  }

  public getDirtyRect(): CatDirtyRect {
    const margin = 50;
    const minX = Math.min(this.x, this.prevX) - margin;
    const minY = Math.min(this.y, this.prevY) - margin;
    const maxX = Math.max(this.x, this.prevX) + margin;
    const maxY = Math.max(this.y, this.prevY) + margin;
    return {
      x: Math.floor(minX),
      y: Math.floor(minY),
      width: Math.ceil(maxX - minX),
      height: Math.ceil(maxY - minY)
    };
  }

  public getStateLabel(): string {
    switch (this.state) {
      case 'chasing': return '追逐';
      case 'pouncing': return '扑击';
      case 'sidestepping': return '绕行';
      case 'sleeping': return '睡眠';
      default: return '未知';
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x + this.shakeOffset, this.y);
    ctx.scale(this.direction, 1);
    ctx.rotate(this.tiltAngle);

    if (this.state === 'sleeping') {
      this.drawSleepingCat(ctx);
    } else if (this.state === 'pouncing') {
      this.drawPouncingCat(ctx);
    } else {
      this.drawWalkingCat(ctx);
    }

    ctx.restore();
  }

  private drawSleepingCat(ctx: CanvasRenderingContext2D): void {
    const breatheScale = 1 + Math.sin(this.breathePhase) * 0.08;

    ctx.save();
    ctx.scale(breatheScale, breatheScale);

    ctx.beginPath();
    ctx.arc(0, 0, this.catSize * 0.9, 0, Math.PI * 2);
    ctx.fillStyle = '#FFB347';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(-5, -this.catSize * 0.3, this.catSize * 0.5, this.catSize * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#FFA726';
    ctx.fill();

    ctx.strokeStyle = '#5C4A3A';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-18, -8);
    ctx.lineTo(-10, -6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-18, -2);
    ctx.lineTo(-10, -2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-20, 5);
    ctx.quadraticCurveTo(-35, 0, -30, 15);
    ctx.quadraticCurveTo(-25, 20, -20, 15);
    ctx.strokeStyle = '#FFB347';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.fillStyle = '#FFB347';
    ctx.beginPath();
    ctx.moveTo(-15, -20);
    ctx.lineTo(-18, -30);
    ctx.lineTo(-8, -22);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-2, -22);
    ctx.lineTo(2, -32);
    ctx.lineTo(5, -22);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFCC80';
    ctx.beginPath();
    ctx.moveTo(-15, -21);
    ctx.lineTo(-16, -27);
    ctx.lineTo(-11, -23);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawPouncingCat(ctx: CanvasRenderingContext2D): void {
    const pounceProgress = Math.min(1, this.pounceTimer / 300);
    const frontLift = Math.sin(pounceProgress * Math.PI) * 15;

    ctx.beginPath();
    ctx.ellipse(0, 0, this.catSize * 0.8, this.catSize * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#FFB347';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(-this.catSize * 0.6, -this.catSize * 0.2, this.catSize * 0.45, this.catSize * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#FFB347';
    ctx.fill();

    ctx.fillStyle = '#FFB347';
    ctx.beginPath();
    ctx.moveTo(-this.catSize * 0.85, -this.catSize * 0.45);
    ctx.lineTo(-this.catSize * 0.95, -this.catSize * 0.85);
    ctx.lineTo(-this.catSize * 0.55, -this.catSize * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-this.catSize * 0.4, -this.catSize * 0.55);
    ctx.lineTo(-this.catSize * 0.35, -this.catSize * 0.95);
    ctx.lineTo(-this.catSize * 0.2, -this.catSize * 0.55);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFCC80';
    ctx.beginPath();
    ctx.moveTo(-this.catSize * 0.85, -this.catSize * 0.48);
    ctx.lineTo(-this.catSize * 0.9, -this.catSize * 0.75);
    ctx.lineTo(-this.catSize * 0.6, -this.catSize * 0.52);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#2C2C2C';
    ctx.beginPath();
    ctx.ellipse(-this.catSize * 0.7, -this.catSize * 0.25, 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-this.catSize * 0.5, -this.catSize * 0.25, 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FF69B4';
    ctx.beginPath();
    ctx.ellipse(-this.catSize * 0.6, -this.catSize * 0.08, 2.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#5C4A3A';
    ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(-this.catSize * 0.85, -this.catSize * 0.02 + i * 3);
      ctx.lineTo(-this.catSize * 1.15, -this.catSize * 0.05 + i * 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-this.catSize * 0.4, -this.catSize * 0.02 + i * 3);
      ctx.lineTo(-this.catSize * 0.15, -this.catSize * 0.05 + i * 5);
      ctx.stroke();
    }

    const legY = this.catSize * 0.25;
    ctx.fillStyle = '#FFB347';
    ctx.fillRect(this.catSize * 0.1, legY - frontLift, 8, this.catSize * 0.35 - frontLift * 0.5);
    ctx.fillRect(this.catSize * 0.35, legY - frontLift, 8, this.catSize * 0.35 - frontLift * 0.5);

    ctx.fillRect(-this.catSize * 0.55, legY, 8, this.catSize * 0.35);
    ctx.fillRect(-this.catSize * 0.3, legY, 8, this.catSize * 0.35);

    if (frontLift > 3) {
      ctx.fillStyle = '#FFB3A0';
      ctx.beginPath();
      ctx.arc(this.catSize * 0.14, legY - frontLift - 2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(this.catSize * 0.39, legY - frontLift - 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = '#FFB347';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.catSize * 0.55, -5);
    ctx.quadraticCurveTo(this.catSize * 1.0, -this.catSize * 0.5, this.catSize * 0.9, this.catSize * 0.2);
    ctx.stroke();

    ctx.fillStyle = '#FFA726';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(-5 + i * 8, -this.catSize * 0.1, 3, this.catSize * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawWalkingCat(ctx: CanvasRenderingContext2D): void {
    const walkCycle = Math.sin(this.walkingPhase);
    const stride = this.catSize * 0.05;

    ctx.beginPath();
    ctx.ellipse(0, 0, this.catSize * 0.75, this.catSize * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#FFB347';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(-this.catSize * 0.55, -this.catSize * 0.15, this.catSize * 0.42, this.catSize * 0.38, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#FFB347';
    ctx.fill();

    ctx.fillStyle = '#FFB347';
    ctx.beginPath();
    ctx.moveTo(-this.catSize * 0.8, -this.catSize * 0.4);
    ctx.lineTo(-this.catSize * 0.92, -this.catSize * 0.78);
    ctx.lineTo(-this.catSize * 0.5, -this.catSize * 0.45);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-this.catSize * 0.35, -this.catSize * 0.48);
    ctx.lineTo(-this.catSize * 0.3, -this.catSize * 0.88);
    ctx.lineTo(-this.catSize * 0.15, -this.catSize * 0.48);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFCC80';
    ctx.beginPath();
    ctx.moveTo(-this.catSize * 0.8, -this.catSize * 0.42);
    ctx.lineTo(-this.catSize * 0.87, -this.catSize * 0.68);
    ctx.lineTo(-this.catSize * 0.55, -this.catSize * 0.46);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#2C2C2C';
    ctx.beginPath();
    ctx.ellipse(-this.catSize * 0.65, -this.catSize * 0.2, 2.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-this.catSize * 0.45, -this.catSize * 0.2, 2.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-this.catSize * 0.64, -this.catSize * 0.22, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-this.catSize * 0.44, -this.catSize * 0.22, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FF69B4';
    ctx.beginPath();
    ctx.ellipse(-this.catSize * 0.55, -this.catSize * 0.03, 2.5, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#5C4A3A';
    ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(-this.catSize * 0.8, 0 + i * 3);
      ctx.lineTo(-this.catSize * 1.08, -2 + i * 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-this.catSize * 0.35, 0 + i * 3);
      ctx.lineTo(-this.catSize * 0.1, -2 + i * 5);
      ctx.stroke();
    }

    const legY = this.catSize * 0.22;
    ctx.fillStyle = '#FFB347';
    const frontOffset1 = walkCycle * stride;
    const frontOffset2 = -walkCycle * stride;
    const backOffset1 = -walkCycle * stride;
    const backOffset2 = walkCycle * stride;

    ctx.fillRect(this.catSize * 0.08, legY + frontOffset1, 7, this.catSize * 0.32);
    ctx.fillRect(this.catSize * 0.32, legY + frontOffset2, 7, this.catSize * 0.32);
    ctx.fillRect(-this.catSize * 0.52, legY + backOffset1, 7, this.catSize * 0.32);
    ctx.fillRect(-this.catSize * 0.28, legY + backOffset2, 7, this.catSize * 0.32);

    ctx.fillStyle = '#FFB3A0';
    ctx.beginPath();
    ctx.arc(this.catSize * 0.115, legY + frontOffset1 + this.catSize * 0.32, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.catSize * 0.355, legY + frontOffset2 + this.catSize * 0.32, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-this.catSize * 0.485, legY + backOffset1 + this.catSize * 0.32, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-this.catSize * 0.245, legY + backOffset2 + this.catSize * 0.32, 3.5, 0, Math.PI * 2);
    ctx.fill();

    const tailWave = Math.sin(this.walkingPhase * 0.8) * 8;
    ctx.strokeStyle = '#FFB347';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.catSize * 0.55, -8);
    ctx.quadraticCurveTo(this.catSize * 0.95, -this.catSize * 0.35 + tailWave, this.catSize * 0.85, this.catSize * 0.15 + tailWave);
    ctx.stroke();

    ctx.fillStyle = '#FFA726';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(-8 + i * 8, -this.catSize * 0.05, 2.5, this.catSize * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
