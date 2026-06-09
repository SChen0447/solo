export interface SmokeParticle {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  vy: number;
  life: number;
  maxLife: number;
  active: boolean;
}

export class Player {
  public x: number;
  public y: number;
  public speed: number;
  public minSpeed: number = 2;
  public maxSpeed: number = 10;
  public speedStep: number = 0.5;
  public lane: number = 1;
  public laneWidth: number = 100;
  public trackCenterX: number;

  public readonly colliderWidth: number = 16;
  public readonly colliderHeight: number = 28;
  public readonly pixelWidth: number = 16;
  public readonly pixelHeight: number = 28;

  public horizontalSpeed: number = 5;
  public targetLaneX: number;

  private smokePool: SmokeParticle[] = [];
  private maxSmokeParticles: number = 20;
  private smokeTimer: number = 0;
  private smokeInterval: number = 4;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.trackCenterX = canvasWidth / 2;
    this.x = this.trackCenterX;
    this.y = canvasHeight - 140;
    this.speed = 4;
    this.targetLaneX = this.trackCenterX;
    this.initSmokePool();
  }

  private initSmokePool(): void {
    for (let i = 0; i < this.maxSmokeParticles; i++) {
      this.smokePool.push({
        x: 0,
        y: 0,
        radius: 0,
        opacity: 0,
        vy: 0,
        life: 0,
        maxLife: 30,
        active: false
      });
    }
  }

  public moveLeft(): void {
    if (this.lane > 0) {
      this.lane--;
      this.targetLaneX = this.trackCenterX + (this.lane - 1) * this.laneWidth;
    }
  }

  public moveRight(): void {
    if (this.lane < 2) {
      this.lane++;
      this.targetLaneX = this.trackCenterX + (this.lane - 1) * this.laneWidth;
    }
  }

  public accelerate(): void {
    if (this.speed < this.maxSpeed) {
      this.speed = Math.min(this.maxSpeed, this.speed + this.speedStep);
    }
  }

  public decelerate(): void {
    if (this.speed > this.minSpeed) {
      this.speed = Math.max(this.minSpeed, this.speed - this.speedStep);
    }
  }

  public update(): void {
    if (this.x < this.targetLaneX) {
      this.x = Math.min(this.x + this.horizontalSpeed, this.targetLaneX);
    } else if (this.x > this.targetLaneX) {
      this.x = Math.max(this.x - this.horizontalSpeed, this.targetLaneX);
    }

    this.smokeTimer++;
    if (this.smokeTimer >= this.smokeInterval) {
      this.smokeTimer = 0;
      this.emitSmoke();
    }

    this.updateSmokeParticles();
  }

  private emitSmoke(): void {
    const particle = this.smokePool.find(p => !p.active);
    if (!particle) return;

    particle.x = this.x + (Math.random() - 0.5) * 6;
    particle.y = this.y + this.pixelHeight / 2;
    particle.radius = 2 + Math.random() * 2;
    particle.opacity = 0.5;
    particle.vy = 0.5 + Math.random() * 0.5;
    particle.life = 0;
    particle.maxLife = 30;
    particle.active = true;
  }

  private updateSmokeParticles(): void {
    for (const particle of this.smokePool) {
      if (!particle.active) continue;

      particle.life++;
      particle.y -= particle.vy;
      particle.opacity = 0.5 * (1 - particle.life / particle.maxLife);
      particle.radius += 0.05;

      if (particle.life >= particle.maxLife) {
        particle.active = false;
      }
    }
  }

  public getSmokeParticles(): SmokeParticle[] {
    return this.smokePool.filter(p => p.active);
  }

  public getCollider(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x - this.colliderWidth / 2,
      y: this.y - this.colliderHeight / 2,
      width: this.colliderWidth,
      height: this.colliderHeight
    };
  }

  public reset(): void {
    this.x = this.trackCenterX;
    this.lane = 1;
    this.targetLaneX = this.trackCenterX;
    this.speed = 4;
    for (const particle of this.smokePool) {
      particle.active = false;
    }
  }
}
