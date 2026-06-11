export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

export class Bird {
  public x: number;
  public y: number;
  public trackIndex: number = 1;
  public angle: number = 0;
  public baseRadii: number[];
  public currentRadius: number;
  public targetRadius: number;
  public transitionProgress: number = 1;
  public fromRadius: number;
  public trailParticles: Particle[] = [];
  public glowPulse: number = 0;
  public baseSize: number = 18;
  public hitFlashTime: number = 0;
  public angularVelocity: number = 1.5;
  public wingsAngle: number = 0;
  private centerX: number;
  private centerY: number;

  constructor(centerX: number, centerY: number, radii: number[]) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.baseRadii = radii;
    this.trackIndex = 1;
    this.currentRadius = radii[this.trackIndex];
    this.targetRadius = radii[this.trackIndex];
    this.fromRadius = radii[this.trackIndex];
    this.x = centerX + this.currentRadius;
    this.y = centerY;
  }

  public reset(centerX?: number, centerY?: number): void {
    if (centerX !== undefined) this.centerX = centerX;
    if (centerY !== undefined) this.centerY = centerY;
    this.trackIndex = 1;
    this.currentRadius = this.baseRadii[this.trackIndex];
    this.targetRadius = this.baseRadii[this.trackIndex];
    this.fromRadius = this.baseRadii[this.trackIndex];
    this.transitionProgress = 1;
    this.angle = 0;
    this.x = this.centerX + this.currentRadius;
    this.y = this.centerY;
    this.trailParticles = [];
    this.glowPulse = 0;
    this.hitFlashTime = 0;
    this.wingsAngle = 0;
  }

  public switchTrack(): void {
    const newTrackIndex = (this.trackIndex + 1) % this.baseRadii.length;
    this.trackIndex = newTrackIndex;
    this.fromRadius = this.currentRadius;
    this.targetRadius = this.baseRadii[newTrackIndex];
    this.transitionProgress = 0;
    this.spawnTrailBurst();
  }

  private spawnTrailBurst(): void {
    for (let i = 0; i < 10; i++) {
      const t = i / 10;
      const angleJitter = (Math.random() - 0.5) * 0.3;
      const speed = 2 + Math.random() * 2;
      const particleAngle = this.angle + Math.PI + angleJitter;
      this.trailParticles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(particleAngle) * speed + (Math.random() - 0.5),
        vy: Math.sin(particleAngle) * speed + (Math.random() - 0.5),
        life: 0.5,
        maxLife: 0.5,
        size: 4 + Math.random() * 4,
        color: this.lerpColor('#00ffff', '#ff69b4', t),
        alpha: 1
      });
    }
    this.limitParticles();
  }

  private limitParticles(): void {
    if (this.trailParticles.length > 120) {
      this.trailParticles.splice(0, this.trailParticles.length - 120);
    }
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 0, g: 0, b: 0 };
  }

  public update(dt: number, beatEnergy: number, radiusOffset: number = 0): void {
    this.angle += this.angularVelocity * dt;
    if (this.angle > Math.PI * 2) this.angle -= Math.PI * 2;
    if (this.angle < -Math.PI * 2) this.angle += Math.PI * 2;

    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + dt / 0.2);
      const t = this.easeOutElastic(this.transitionProgress);
      this.currentRadius = this.fromRadius + (this.targetRadius - this.fromRadius) * t;
    }

    const effectiveRadius = this.currentRadius + radiusOffset;
    this.x = this.centerX + Math.cos(this.angle) * effectiveRadius;
    this.y = this.centerY + Math.sin(this.angle) * effectiveRadius;

    this.glowPulse = beatEnergy;
    this.wingsAngle += dt * 12;

    if (Math.random() < 0.6) {
      const t = Math.random();
      const particleAngle = this.angle + Math.PI + (Math.random() - 0.5) * 0.2;
      const speed = 1 + Math.random();
      this.trailParticles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(particleAngle) * speed,
        vy: Math.sin(particleAngle) * speed,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
        size: 2 + Math.random() * 3,
        color: this.lerpColor('#00ffff', '#ff69b4', t),
        alpha: 1
      });
    }

    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const p = this.trailParticles[i];
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
      if (p.life <= 0) {
        this.trailParticles.splice(i, 1);
      }
    }

    if (this.hitFlashTime > 0) {
      this.hitFlashTime -= dt;
    }

    this.limitParticles();
  }

  private easeOutElastic(t: number): number {
    if (t === 0 || t === 1) return t;
    const p = 0.3;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.trailParticles) {
      ctx.save();
      ctx.globalAlpha = p.alpha * 0.8;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI / 2);

    const glowSize = this.baseSize * (1.5 + this.glowPulse * 1.5);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
    gradient.addColorStop(0, 'rgba(0, 255, 255, 0.6)');
    gradient.addColorStop(0.4, 'rgba(138, 43, 226, 0.3)');
    gradient.addColorStop(1, 'rgba(138, 43, 226, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
    ctx.fill();

    const flash = this.hitFlashTime > 0 && Math.floor(this.hitFlashTime * 20) % 2 === 0;
    const wingFlap = Math.sin(this.wingsAngle) * 0.4;

    ctx.beginPath();
    ctx.moveTo(0, -this.baseSize);
    ctx.quadraticCurveTo(-this.baseSize * 0.8, -this.baseSize * 0.3 + wingFlap * 10, -this.baseSize * 1.2, this.baseSize * 0.2 + wingFlap * 8);
    ctx.quadraticCurveTo(-this.baseSize * 0.5, this.baseSize * 0.1, 0, this.baseSize * 0.6);
    ctx.quadraticCurveTo(this.baseSize * 0.5, this.baseSize * 0.1, this.baseSize * 1.2, this.baseSize * 0.2 + wingFlap * 8);
    ctx.quadraticCurveTo(this.baseSize * 0.8, -this.baseSize * 0.3 + wingFlap * 10, 0, -this.baseSize);
    ctx.closePath();

    if (flash) {
      ctx.fillStyle = '#ff4444';
      ctx.shadowColor = '#ff0000';
    } else {
      const birdGrad = ctx.createLinearGradient(0, -this.baseSize, 0, this.baseSize);
      birdGrad.addColorStop(0, '#00ffff');
      birdGrad.addColorStop(0.5, '#8a2be2');
      birdGrad.addColorStop(1, '#ff69b4');
      ctx.fillStyle = birdGrad;
      ctx.shadowColor = '#00ffff';
    }
    ctx.shadowBlur = 20 + this.glowPulse * 20;
    ctx.fill();

    ctx.strokeStyle = flash ? '#ff8888' : 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 0;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(-this.baseSize * 0.2, -this.baseSize * 0.4, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
  }

  public getHitboxRadius(): number {
    return this.baseSize * 0.8;
  }

  public triggerHitFlash(): void {
    this.hitFlashTime = 0.5;
  }
}
