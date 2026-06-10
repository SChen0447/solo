import { InputHandler } from './input';
import { ParticleSystem } from './particles';

export interface TerrainPoint {
  x: number;
  y: number;
}

export class Player {
  public x: number;
  public y: number;
  public vx: number = 0;
  public vy: number = 0;
  public width: number = 30;
  public height: number = 40;
  public isGrounded: boolean = true;
  public wasGrounded: boolean = true;

  private readonly baseWidth: number = 30;
  private readonly baseHeight: number = 40;
  private readonly jumpWidth: number = 25;
  private readonly jumpHeight: number = 40;
  private readonly landWidth: number = 35;
  private readonly landHeight: number = 25;

  private targetWidth: number = 30;
  private targetHeight: number = 40;
  private readonly animSpeed: number = 10;

  private readonly moveSpeed: number = 6;
  private readonly jumpForce: number = -12;
  private readonly gravity: number = 0.5;

  private canvasWidth: number;
  private terrainFunc: (x: number) => number;
  private particleSystem: ParticleSystem;

  constructor(
    startX: number,
    canvasWidth: number,
    terrainFunc: (x: number) => number,
    particleSystem: ParticleSystem
  ) {
    this.canvasWidth = canvasWidth;
    this.terrainFunc = terrainFunc;
    this.particleSystem = particleSystem;
    this.x = startX;
    this.y = terrainFunc(startX) - this.height;
  }

  public update(input: InputHandler, deltaTime: number): void {
    this.wasGrounded = this.isGrounded;

    this.vx = 0;
    if (input.wasDown('ArrowLeft')) {
      this.vx = -this.moveSpeed;
    }
    if (input.wasDown('ArrowRight')) {
      this.vx = this.moveSpeed;
    }

    if (input.justPressed('Space') && this.isGrounded) {
      this.vy = this.jumpForce;
      this.isGrounded = false;
    }

    if (!this.isGrounded) {
      this.vy += this.gravity;
    }

    this.x += this.vx;
    this.y += this.vy;

    this.x = Math.max(this.width / 2, Math.min(this.canvasWidth - this.width / 2, this.x));

    if (!this.isGrounded) {
      const groundY = this.terrainFunc(this.x);
      if (this.y + this.height >= groundY) {
        this.y = groundY - this.height;
        this.vy = 0;
        this.isGrounded = true;
      }
    } else {
      const groundY = this.terrainFunc(this.x);
      this.y = groundY - this.height;
    }

    if (!this.wasGrounded && this.isGrounded) {
      this.targetWidth = this.landWidth;
      this.targetHeight = this.landHeight;
    } else if (!this.isGrounded) {
      this.targetWidth = this.jumpWidth;
      this.targetHeight = this.jumpHeight;
    } else if (Math.abs(this.vx) > 0) {
      this.targetWidth = this.baseWidth;
      this.targetHeight = this.baseHeight;
    } else {
      this.targetWidth = this.baseWidth;
      this.targetHeight = this.baseHeight;
    }

    const t = Math.min(1, this.animSpeed * (deltaTime / 1000));
    this.width += (this.targetWidth - this.width) * t;
    this.height += (this.targetHeight - this.height) * t;

    if (this.isGrounded && Math.abs(this.vx) > 0) {
      const footX = this.x;
      const footY = this.terrainFunc(this.x);
      const xProgress = this.x / this.canvasWidth;
      this.particleSystem.emit(footX, footY, xProgress);
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const bodyX = this.x - this.width / 2;
    const bodyY = this.y;

    ctx.fillStyle = '#4a9eff';
    ctx.fillRect(bodyX, bodyY, this.width, this.height);

    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    const hatCenterX = this.x;
    const hatBaseY = this.y;
    const hatHeight = 12;
    const hatHalfWidth = this.width * 0.45;
    ctx.moveTo(hatCenterX - hatHalfWidth, hatBaseY);
    ctx.lineTo(hatCenterX + hatHalfWidth, hatBaseY);
    ctx.lineTo(hatCenterX, hatBaseY - hatHeight);
    ctx.closePath();
    ctx.fill();
  }

  public reset(startX: number): void {
    this.vx = 0;
    this.vy = 0;
    this.width = this.baseWidth;
    this.height = this.baseHeight;
    this.targetWidth = this.baseWidth;
    this.targetHeight = this.baseHeight;
    this.isGrounded = true;
    this.wasGrounded = true;
    this.x = startX;
    this.y = this.terrainFunc(startX) - this.height;
  }
}
