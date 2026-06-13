import { ParticleSystem } from './particles';

export class Ship {
  x: number;
  y: number;
  vx: number = 0;
  vy: number = 0;
  angle: number = 0;
  health: number = 100;
  maxHealth: number = 100;
  score: number = 0;
  radius: number = 18;

  private keys: { [key: string]: boolean } = {};
  private acceleration: number = 200;
  private maxSpeed: number = 250;
  private rotationSpeed: number = 3;
  private particleSystem: ParticleSystem;
  private invincible: boolean = false;
  private invincibleTimer: number = 0;
  private hitFlash: number = 0;
  private knockbackTimer: number = 0;
  private knockbackDuration: number = 0;

  constructor(x: number, y: number, particleSystem: ParticleSystem) {
    this.x = x;
    this.y = y;
    this.particleSystem = particleSystem;
    this.setupInput();
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key] = false;
    });
  }

  update(dt: number, canvasWidth: number, canvasHeight: number): void {
    if (this.knockbackTimer > 0) {
      this.knockbackTimer -= dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vx *= 0.95;
      this.vy *= 0.95;
      this.wrapAround(canvasWidth, canvasHeight);
      return;
    }

    if (this.keys['ArrowLeft']) {
      this.angle -= this.rotationSpeed * dt;
    }
    if (this.keys['ArrowRight']) {
      this.angle += this.rotationSpeed * dt;
    }

    const thrusting = this.keys['ArrowUp'];
    const braking = this.keys['ArrowDown'];

    if (thrusting) {
      this.vx += Math.cos(this.angle) * this.acceleration * dt;
      this.vy += Math.sin(this.angle) * this.acceleration * dt;

      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      if (speed > this.maxSpeed) {
        this.vx = (this.vx / speed) * this.maxSpeed;
        this.vy = (this.vy / speed) * this.maxSpeed;
      }
    }

    if (braking) {
      this.vx *= 0.98;
      this.vy *= 0.98;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.wrapAround(canvasWidth, canvasHeight);

    if (thrusting) {
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      const flameAngle = this.angle + Math.PI;
      this.particleSystem.emitFlame(
        this.x + Math.cos(flameAngle) * 15,
        this.y + Math.sin(flameAngle) * 15,
        flameAngle,
        speed / 20
      );
    }

    if (this.invincible) {
      this.invincibleTimer -= dt;
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
      }
    }

    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
    }
  }

  private wrapAround(canvasWidth: number, canvasHeight: number): void {
    if (this.x < -30) this.x = canvasWidth + 30;
    if (this.x > canvasWidth + 30) this.x = -30;
    if (this.y < -30) this.y = canvasHeight + 30;
    if (this.y > canvasHeight + 30) this.y = -30;
  }

  applyGravity(fx: number, fy: number, dt: number): void {
    if (this.knockbackTimer > 0) return;
    this.vx += fx * dt;
    this.vy += fy * dt;

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > this.maxSpeed * 1.5) {
      this.vx = (this.vx / speed) * this.maxSpeed * 1.5;
      this.vy = (this.vy / speed) * this.maxSpeed * 1.5;
    }
  }

  takeDamage(amount: number): void {
    if (this.invincible) return;
    this.health -= amount;
    this.hitFlash = 0.3;
    this.invincible = true;
    this.invincibleTimer = 1;

    if (this.health < 0) {
      this.health = 0;
    }
  }

  addScore(points: number): void {
    this.score += points;
  }

  getScore(): number {
    return this.score;
  }

  knockback(targetX: number, targetY: number, duration: number): void {
    const dx = this.x - targetX;
    const dy = this.y - targetY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 400;

    this.vx = (dx / dist) * speed;
    this.vy = (dy / dist) * speed;
    this.knockbackTimer = duration;
    this.knockbackDuration = duration;
    this.invincible = true;
    this.invincibleTimer = duration + 0.5;
  }

  isInvincible(): boolean {
    return this.invincible;
  }

  isGameOver(): boolean {
    return this.health <= 0;
  }

  getBounds(): { x: number; y: number; radius: number } {
    return { x: this.x, y: this.y, radius: this.radius };
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    if (this.invincible && Math.floor(this.invincibleTimer * 10) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;

    const bodyGradient = ctx.createLinearGradient(-20, -15, 20, 15);
    bodyGradient.addColorStop(0, '#e8e8f0');
    bodyGradient.addColorStop(0.3, '#c0c0d0');
    bodyGradient.addColorStop(0.7, '#9090a0');
    bodyGradient.addColorStop(1, '#707080');

    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.moveTo(25, 0);
    ctx.lineTo(-15, -15);
    ctx.lineTo(-10, -8);
    ctx.lineTo(-20, -10);
    ctx.lineTo(-20, 10);
    ctx.lineTo(-10, 8);
    ctx.lineTo(-15, 15);
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = this.hitFlash > 0 ? '#ff6666' : '#4a5568';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const cockpitGradient = ctx.createRadialGradient(5, -3, 0, 8, 0, 8);
    cockpitGradient.addColorStop(0, '#80d0ff');
    cockpitGradient.addColorStop(0.5, '#4090dd');
    cockpitGradient.addColorStop(1, '#205099');

    ctx.fillStyle = cockpitGradient;
    ctx.beginPath();
    ctx.ellipse(5, 0, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#aaddff';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.ellipse(3, -2, 3, 2, -0.3, 0, Math.PI * 2);
    ctx.fill();

    if (this.hitFlash > 0) {
      ctx.globalAlpha = this.hitFlash * 2;
      ctx.fillStyle = '#ff4444';
      ctx.globalCompositeOperation = 'overlay';
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.health = this.maxHealth;
    this.score = 0;
    this.invincible = false;
    this.invincibleTimer = 0;
    this.hitFlash = 0;
    this.knockbackTimer = 0;
  }
}
