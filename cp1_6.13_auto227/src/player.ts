export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  radius: number;
}

export class Player {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  radius: number = 20;
  color: string = '#48dbfb';
  speed: number = 0;
  velocityX: number = 0;
  velocityY: number = 0;
  trail: TrailPoint[] = [];
  maxTrailLength: number = 8;
  trailTimer: number = 0;
  trailInterval: number = 0.06;
  damping: number = 0.15;
  warningActive: boolean = false;
  warningTimer: number = 0;
  warningPeriod: number = 0.2;
  energy: number = 0;
  maxEnergy: number = 100;
  energyChargeBoost: number = 0;
  chargeBoostLevel: number = 0;
  maxChargeBoost: number = 5;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
  }

  setTarget(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  update(deltaTime: number): void {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dampingFactor = 1 - Math.pow(1 - this.damping, deltaTime * 60);
    
    const oldX = this.x;
    const oldY = this.y;
    
    this.x += dx * dampingFactor;
    this.y += dy * dampingFactor;
    
    this.velocityX = (this.x - oldX) / deltaTime;
    this.velocityY = (this.y - oldY) / deltaTime;
    this.speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
    
    this.trailTimer += deltaTime;
    if (this.trailTimer >= this.trailInterval) {
      this.trailTimer = 0;
      this.trail.unshift({
        x: this.x,
        y: this.y,
        alpha: 0.5,
        radius: this.radius
      });
      if (this.trail.length > this.maxTrailLength) {
        this.trail.pop();
      }
    }
    
    for (let i = 0; i < this.trail.length; i++) {
      const t = i / this.maxTrailLength;
      this.trail[i].alpha = 0.5 * (1 - t);
      this.trail[i].radius = this.radius * (1 - t * 0.5);
    }
    
    if (this.warningActive) {
      this.warningTimer += deltaTime;
    }
  }

  setWarning(active: boolean): void {
    this.warningActive = active;
    if (!active) {
      this.warningTimer = 0;
    }
  }

  isWarningVisible(): boolean {
    if (!this.warningActive) return false;
    return Math.floor(this.warningTimer / this.warningPeriod) % 2 === 0;
  }

  addEnergy(amount: number): void {
    const boostedAmount = amount * (1 + this.energyChargeBoost);
    this.energy = Math.min(this.maxEnergy, this.energy + boostedAmount);
  }

  canReleasePulse(): boolean {
    return this.energy >= this.maxEnergy;
  }

  releasePulse(): void {
    this.energy = 0;
    if (this.chargeBoostLevel < this.maxChargeBoost) {
      this.chargeBoostLevel++;
      this.energyChargeBoost = this.chargeBoostLevel * 0.1;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const point = this.trail[i];
      const gradient = ctx.createRadialGradient(
        point.x, point.y, 0,
        point.x, point.y, point.radius
      );
      gradient.addColorStop(0, `rgba(72, 219, 251, ${point.alpha})`);
      gradient.addColorStop(1, 'rgba(72, 219, 251, 0)');
      ctx.beginPath();
      ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
    
    const outerGlow = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, 44
    );
    outerGlow.addColorStop(0, 'rgba(72, 219, 251, 0.1)');
    outerGlow.addColorStop(0.55, 'rgba(72, 219, 251, 0.05)');
    outerGlow.addColorStop(1, 'rgba(72, 219, 251, 0)');
    ctx.beginPath();
    ctx.arc(this.x, this.y, 44, 0, Math.PI * 2);
    ctx.fillStyle = outerGlow;
    ctx.fill();
    
    const midGlow = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, 32
    );
    midGlow.addColorStop(0, 'rgba(72, 219, 251, 0.2)');
    midGlow.addColorStop(0.6, 'rgba(72, 219, 251, 0.08)');
    midGlow.addColorStop(1, 'rgba(72, 219, 251, 0)');
    ctx.beginPath();
    ctx.arc(this.x, this.y, 32, 0, Math.PI * 2);
    ctx.fillStyle = midGlow;
    ctx.fill();
    
    const innerGlow = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, 24
    );
    innerGlow.addColorStop(0, 'rgba(72, 219, 251, 0.4)');
    innerGlow.addColorStop(0.7, 'rgba(72, 219, 251, 0.15)');
    innerGlow.addColorStop(1, 'rgba(72, 219, 251, 0)');
    ctx.beginPath();
    ctx.arc(this.x, this.y, 24, 0, Math.PI * 2);
    ctx.fillStyle = innerGlow;
    ctx.fill();
    
    const coreGradient = ctx.createRadialGradient(
      this.x - 6, this.y - 6, 0,
      this.x, this.y, this.radius
    );
    coreGradient.addColorStop(0, '#ffffff');
    coreGradient.addColorStop(0.3, '#9be7ff');
    coreGradient.addColorStop(0.7, '#48dbfb');
    coreGradient.addColorStop(1, '#2cc4e0');
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = coreGradient;
    ctx.fill();
    
    if (this.isWarningVisible()) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
}
