interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  size: number;
}

export class Player {
  public x: number;
  public y: number;
  public radius: number = 14;
  public velocityY: number = 0;
  public isGrounded: boolean = true;
  public groundY: number;

  private gravity: number = 1800;
  private baseJumpVelocity: number = -700;
  private maxJumpMultiplier: number = 1.8;
  private currentJumpMultiplier: number = 1;

  private trail: TrailPoint[] = [];
  private maxTrailLength: number = 25;
  private trailAccumulator: number = 0;

  private visualY: number;
  private squash: number = 1;
  private targetSquash: number = 1;
  private glowIntensity: number = 0;

  constructor(x: number, groundY: number) {
    this.x = x;
    this.groundY = groundY;
    this.y = groundY - this.radius;
    this.visualY = this.y;
  }

  reset(): void {
    this.y = this.groundY - this.radius;
    this.visualY = this.y;
    this.velocityY = 0;
    this.isGrounded = true;
    this.trail = [];
    this.trailAccumulator = 0;
    this.squash = 1;
    this.targetSquash = 1;
    this.glowIntensity = 0;
    this.currentJumpMultiplier = 1;
  }

  jump(beatStrength: number = 0.5): void {
    if (this.isGrounded) {
      this.currentJumpMultiplier = 1 + beatStrength * (this.maxJumpMultiplier - 1);
      this.velocityY = this.baseJumpVelocity * this.currentJumpMultiplier;
      this.isGrounded = false;
      this.targetSquash = 1.4;
      this.glowIntensity = 1;
    }
  }

  update(deltaTime: number, speed: number): void {
    if (!this.isGrounded) {
      this.velocityY += this.gravity * deltaTime;
      this.y += this.velocityY * deltaTime;

      if (this.y >= this.groundY - this.radius) {
        this.y = this.groundY - this.radius;
        this.velocityY = 0;
        this.isGrounded = true;
        this.targetSquash = 0.7;
        this.glowIntensity = 0.8;
      }
    }

    this.squash += (this.targetSquash - this.squash) * Math.min(1, deltaTime * 12);
    if (Math.abs(this.squash - this.targetSquash) < 0.02) {
      this.targetSquash = 1;
    }

    this.glowIntensity += (0 - this.glowIntensity) * Math.min(1, deltaTime * 4);

    this.visualY += (this.y - this.visualY) * Math.min(1, deltaTime * 20);

    const trailSpawnInterval = 16;
    this.trailAccumulator += deltaTime * 1000;
    while (this.trailAccumulator >= trailSpawnInterval) {
      this.trailAccumulator -= trailSpawnInterval;
      const dynamicMaxTrail = Math.floor(this.maxTrailLength * (0.4 + (speed / 600) * 0.6));
      this.trail.unshift({
        x: this.x,
        y: this.visualY,
        alpha: 1,
        size: this.radius * (0.9 + Math.random() * 0.2)
      });
      if (this.trail.length > dynamicMaxTrail) {
        this.trail.pop();
      }
    }

    for (let i = 0; i < this.trail.length; i++) {
      const t = i / Math.max(this.trail.length - 1, 1);
      this.trail[i].alpha = (1 - t) * 0.6;
      this.trail[i].size = this.radius * (1 - t * 0.7);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const point = this.trail[i];
      ctx.beginPath();
      ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 210, 255, ${point.alpha * 0.5})`;
      ctx.fill();
    }

    const glowRadius = this.radius * (3 + this.glowIntensity * 4);
    const gradient = ctx.createRadialGradient(
      this.x, this.visualY, 0,
      this.x, this.visualY, glowRadius
    );
    gradient.addColorStop(0, `rgba(0, 210, 255, ${0.4 + this.glowIntensity * 0.4})`);
    gradient.addColorStop(0.5, `rgba(0, 210, 255, ${0.15 + this.glowIntensity * 0.15})`);
    gradient.addColorStop(1, 'rgba(0, 210, 255, 0)');

    ctx.beginPath();
    ctx.arc(this.x, this.visualY, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.save();
    ctx.translate(this.x, this.visualY);
    ctx.scale(1 / this.squash, this.squash);

    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    const bodyGradient = ctx.createRadialGradient(
      -this.radius * 0.3, -this.radius * 0.3, 0,
      0, 0, this.radius
    );
    bodyGradient.addColorStop(0, '#ffffff');
    bodyGradient.addColorStop(0.3, '#00f0ff');
    bodyGradient.addColorStop(1, '#0088cc');
    ctx.fillStyle = bodyGradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 + this.glowIntensity * 0.4})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  getBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x - this.radius * 0.8,
      y: this.y - this.radius * 0.8,
      width: this.radius * 1.6,
      height: this.radius * 1.6
    };
  }

  setGroundY(groundY: number): void {
    const offset = this.groundY - this.y;
    this.groundY = groundY;
    this.y = groundY - offset;
  }
}
