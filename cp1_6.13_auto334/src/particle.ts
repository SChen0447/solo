interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export class Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  radius: number;
  baseRadius: number;
  color: string;
  targetColor: string;
  alpha: number;
  life: number;
  maxLife: number;
  isSettled: boolean;
  isDying: boolean;
  deathProgress: number;
  trail: TrailPoint[];
  maxTrailLength: number;
  glowIntensity: number;
  pressure: number;
  colorTransitionProgress: number;
  shrinkProgress: number;
  shrinking: boolean;
  deathAngle: number;
  deathRadius: number;
  deathCenterX: number;
  deathCenterY: number;

  private startColor: { r: number; g: number; b: number };
  private endColor: { r: number; g: number; b: number };

  constructor(
    x: number,
    y: number,
    radius: number,
    startColor: string,
    targetColor: string,
    pressure: number
  ) {
    this.x = x;
    this.y = y;
    this.baseX = x;
    this.baseY = y;
    this.radius = radius;
    this.baseRadius = radius;
    this.color = startColor;
    this.targetColor = targetColor;
    this.alpha = 1;
    this.life = 0;
    this.maxLife = 0.5;
    this.isSettled = false;
    this.isDying = false;
    this.deathProgress = 0;
    this.trail = [];
    this.maxTrailLength = 5;
    this.glowIntensity = 1;
    this.pressure = pressure;
    this.colorTransitionProgress = 0;
    this.shrinkProgress = 0;
    this.shrinking = false;
    this.deathAngle = Math.random() * Math.PI * 2;
    this.deathRadius = 0;
    this.deathCenterX = x;
    this.deathCenterY = y;

    this.startColor = this.hexToRgb(startColor);
    this.endColor = this.hexToRgb(targetColor);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      };
    }
    return { r: 184, g: 134, b: 11 };
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  startShrinking(): void {
    if (!this.shrinking && !this.isSettled) {
      this.shrinking = true;
      this.shrinkProgress = 0;
    }
  }

  startDying(centerX: number, centerY: number): void {
    this.isDying = true;
    this.deathProgress = 0;
    this.deathCenterX = centerX;
    this.deathCenterY = centerY;
    const dx = this.baseX - centerX;
    const dy = this.baseY - centerY;
    this.deathRadius = Math.sqrt(dx * dx + dy * dy);
    this.deathAngle = Math.atan2(dy, dx);
  }

  update(deltaTime: number): boolean {
    this.life += deltaTime;

    if (this.isDying) {
      this.deathProgress += deltaTime / 2;
      if (this.deathProgress >= 1) {
        return false;
      }
      const spiralT = this.deathProgress;
      const currentRadius = this.deathRadius * (1 - spiralT);
      const currentAngle = this.deathAngle + spiralT * Math.PI * 4;
      this.x = this.deathCenterX + Math.cos(currentAngle) * currentRadius;
      this.y = this.deathCenterY + Math.sin(currentAngle) * currentRadius;
      this.alpha = 1 - spiralT;
      this.radius = this.baseRadius * (1 - spiralT * 0.5);
      return true;
    }

    if (this.colorTransitionProgress < 1) {
      this.colorTransitionProgress = Math.min(1, this.life / this.maxLife);
      const t = this.colorTransitionProgress;
      const r = Math.round(this.lerp(this.startColor.r, this.endColor.r, t));
      const g = Math.round(this.lerp(this.startColor.g, this.endColor.g, t));
      const b = Math.round(this.lerp(this.startColor.b, this.endColor.b, t));
      this.color = this.rgbToHex(r, g, b);
    }

    if (this.shrinking && !this.isSettled) {
      this.shrinkProgress += deltaTime / 0.8;
      if (this.shrinkProgress >= 1) {
        this.shrinkProgress = 1;
        this.isSettled = true;
        this.shrinking = false;
      }
      const t = this.shrinkProgress;
      this.x = this.lerp(this.x, this.baseX, t);
      this.y = this.lerp(this.y, this.baseY, t);
      this.radius = this.lerp(this.baseRadius * 1.3, this.baseRadius, t);
    }

    if (!this.isSettled && !this.shrinking) {
      this.trail.unshift({ x: this.x, y: this.y, alpha: 0.6 });
      if (this.trail.length > this.maxTrailLength) {
        this.trail.pop();
      }
    }

    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].alpha = 0.6 * (1 - i / this.maxTrailLength);
    }

    return true;
  }

  draw(ctx: CanvasRenderingContext2D, pulseIntensity: number = 0): void {
    ctx.save();

    for (let i = this.trail.length - 1; i >= 0; i--) {
      const point = this.trail[i];
      const trailRadius = this.radius * (1 - i / this.maxTrailLength) * 0.7;
      ctx.beginPath();
      ctx.arc(point.x, point.y, trailRadius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = point.alpha * this.alpha * 0.5;
      ctx.fill();
    }

    if (pulseIntensity > 0 || this.glowIntensity > 0) {
      const glowRadius = this.radius * (2 + pulseIntensity * 2);
      const gradient = ctx.createRadialGradient(
        this.x, this.y, 0,
        this.x, this.y, glowRadius
      );
      gradient.addColorStop(0, this.color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
      ctx.globalAlpha = this.alpha * (0.15 + pulseIntensity * 0.15);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.alpha;

    if (!this.isSettled || pulseIntensity > 0) {
      ctx.shadowColor = this.color;
      ctx.shadowBlur = this.radius * (3 + pulseIntensity * 3);
    }

    ctx.fill();
    ctx.restore();
  }
}
