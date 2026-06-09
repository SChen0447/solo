export class Player {
  public x: number;
  public y: number;
  public readonly radius: number = 18;
  public shield: number;
  public readonly maxShield: number = 100;
  public readonly speed: number = 200;
  public vx: number = 0;
  public vy: number = 0;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.x = canvasWidth / 2;
    this.y = canvasHeight / 2;
    this.shield = 50;
  }

  public move(dx: number, dy: number, deltaTime: number, canvasWidth: number, canvasHeight: number): void {
    this.vx = dx * this.speed;
    this.vy = dy * this.speed;
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;

    if (this.x - this.radius < 0) this.x = this.radius;
    if (this.x + this.radius > canvasWidth) this.x = canvasWidth - this.radius;
    if (this.y - this.radius < 0) this.y = this.radius;
    if (this.y + this.radius > canvasHeight) this.y = canvasHeight - this.radius;
  }

  public drain(amount: number): void {
    this.shield = Math.max(0, this.shield - amount);
  }

  public recharge(amount: number): void {
    this.shield = Math.min(this.maxShield, this.shield + amount);
  }

  public isDead(): boolean {
    return this.shield <= 0;
  }

  public reset(canvasWidth: number, canvasHeight: number): void {
    this.x = canvasWidth / 2;
    this.y = canvasHeight / 2;
    this.shield = 50;
    this.vx = 0;
    this.vy = 0;
  }
}
