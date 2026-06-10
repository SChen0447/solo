export interface TrailParticle {
  x: number;
  y: number;
  alpha: number;
  size: number;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  progress: number;
  active: boolean;
}

export class Player {
  public x: number;
  public y: number;
  public radius: number = 15;
  public hit: boolean = false;
  public hitTimer: number = 0;
  public flashPhase: number = 0;
  private trail: TrailParticle[] = [];
  private maxTrailLength: number = 6;
  private canvasWidth: number;
  private canvasHeight: number;
  private safeMargin: number = 30;
  public shockwave: Shockwave | null = null;
  private shockwaveCooldown: number = 0;
  private shockwaveCooldownMax: number = 8;
  public invulnerable: boolean = false;
  private invulnerableTimer: number = 0;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.x = canvasWidth / 2;
    this.y = canvasHeight / 2;
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.x = Math.min(Math.max(this.x, this.safeMargin), width - this.safeMargin);
    this.y = Math.min(Math.max(this.y, this.safeMargin), height - this.safeMargin);
  }

  public moveTo(targetX: number, targetY: number): void {
    this.x = Math.min(
      Math.max(targetX, this.safeMargin),
      this.canvasWidth - this.safeMargin
    );
    this.y = Math.min(
      Math.max(targetY, this.safeMargin),
      this.canvasHeight - this.safeMargin
    );
  }

  public update(dt: number): void {
    this.trail.unshift({
      x: this.x,
      y: this.y,
      alpha: 0.8,
      size: 8
    });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.pop();
    }

    for (let i = 0; i < this.trail.length; i++) {
      const t = i / this.maxTrailLength;
      this.trail[i].alpha = 0.8 * (1 - t);
      this.trail[i].size = 8 * (1 - t * 0.7);
    }

    if (this.hit) {
      this.hitTimer -= dt;
      this.flashPhase += dt * 8 * 2 * Math.PI;
      if (this.hitTimer <= 0) {
        this.hit = false;
      }
    }

    if (this.shockwaveCooldown > 0) {
      this.shockwaveCooldown = Math.max(0, this.shockwaveCooldown - dt);
    }

    if (this.shockwave) {
      this.shockwave.progress += dt / 0.3;
      this.shockwave.radius = this.shockwave.maxRadius * Math.min(1, this.shockwave.progress * 2);
      if (this.shockwave.progress >= 1) {
        this.shockwave.active = false;
        this.shockwave = null;
      }
    }

    if (this.invulnerable) {
      this.invulnerableTimer -= dt;
      if (this.invulnerableTimer <= 0) {
        this.invulnerable = false;
      }
    }
  }

  public triggerShockwave(): boolean {
    if (this.shockwaveCooldown > 0 || this.shockwave) return false;
    this.shockwave = {
      x: this.x,
      y: this.y,
      radius: 0,
      maxRadius: 120,
      progress: 0,
      active: true
    };
    this.shockwaveCooldown = this.shockwaveCooldownMax;
    this.invulnerable = true;
    this.invulnerableTimer = 0.3;
    return true;
  }

  public getShockwaveCooldownPercent(): number {
    return this.shockwaveCooldown / this.shockwaveCooldownMax;
  }

  public getShockwaveRadius(): number {
    return this.shockwave?.maxRadius ?? 120;
  }

  public getTrail(): TrailParticle[] {
    return this.trail;
  }

  public takeHit(): void {
    if (this.invulnerable) return;
    this.hit = true;
    this.hitTimer = 0.5;
    this.invulnerable = true;
    this.invulnerableTimer = 1.0;
  }

  public checkCollision(bx: number, by: number, bradius: number): boolean {
    if (this.invulnerable) return false;
    const dx = this.x - bx;
    const dy = this.y - by;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < this.radius * 0.7 + bradius;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const p = this.trail[i];
      const t = i / this.maxTrailLength;
      const r = Math.floor(255 - t * 0);
      const g = Math.floor(204 - t * 102);
      const b = Math.floor(0 + t * 0);
      ctx.beginPath();
      ctx.arc(p.x, p.y + 5, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.alpha * 0.6})`;
      ctx.fill();
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    let drawColor = '#00ffcc';
    let fillColor = 'rgba(0, 255, 204, 0.2)';

    if (this.hit) {
      const flashOn = Math.sin(this.flashPhase) > 0;
      if (flashOn) {
        drawColor = '#ffffff';
        fillColor = 'rgba(255, 255, 255, 0.4)';
      }
    }

    if (this.invulnerable && !this.hit) {
      const flicker = Math.sin(performance.now() * 0.02) > 0;
      if (!flicker) {
        ctx.globalAlpha = 0.5;
      }
    }

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6 - Math.PI / 2;
      const px = Math.cos(angle) * this.radius;
      const py = Math.sin(angle) * this.radius;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6 - Math.PI / 2;
      const px = Math.cos(angle) * (this.radius * 0.5);
      const py = Math.sin(angle) * (this.radius * 0.5);
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();

    if (this.shockwave && this.shockwave.active) {
      const alpha = 0.9 * (1 - this.shockwave.progress);
      const gradient = ctx.createRadialGradient(
        this.shockwave.x, this.shockwave.y, 0,
        this.shockwave.x, this.shockwave.y, this.shockwave.radius
      );
      const t = this.shockwave.progress;
      const r1 = Math.floor(255 - t * 0);
      const g1 = Math.floor(255 - t * 0);
      const b1 = Math.floor(255 - t * 89);
      const r2 = Math.floor(0 + t * 0);
      const g2 = Math.floor(255 - t * 0);
      const b2 = Math.floor(204 - t * 0);
      gradient.addColorStop(0, `rgba(${r1}, ${g1}, ${b1}, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(${r2}, ${g2}, ${b2}, ${alpha * 0.5})`);
      gradient.addColorStop(1, `rgba(${r2}, ${g2}, ${b2}, 0)`);

      ctx.beginPath();
      ctx.arc(this.shockwave.x, this.shockwave.y, this.shockwave.radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(this.shockwave.x, this.shockwave.y, this.shockwave.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 255, 204, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
}
