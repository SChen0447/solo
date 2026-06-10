import { InputState, Vector2 } from './types';
import { ParticleSystem } from './utils/ParticleSystem';

export class SpaceShip {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  lives: number;
  maxLives: number;
  energy: number;
  maxEnergy: number;
  isShielded: boolean;
  shieldTimer: number;
  shieldDuration: number;
  isBoosting: boolean;
  boostTimer: number;
  boostDuration: number;
  cooldownTimer: number;
  cooldownDuration: number;
  baseSpeed: number;
  boostMultiplier: number;
  hitFlashTimer: number;
  hitFlashDuration: number;
  invincibleTimer: number;
  invincibleDuration: number;

  private width: number;
  private height: number;
  private particleSystem: ParticleSystem;
  private thrustTimer: number = 0;

  constructor(width: number, height: number, particleSystem: ParticleSystem) {
    this.width = width;
    this.height = height;
    this.particleSystem = particleSystem;

    this.x = width / 2;
    this.y = height / 2;
    this.vx = 0;
    this.vy = 0;
    this.radius = 18;
    this.rotation = -Math.PI / 2;

    this.lives = 3;
    this.maxLives = 3;
    this.energy = 0;
    this.maxEnergy = 100;

    this.isShielded = false;
    this.shieldTimer = 0;
    this.shieldDuration = 3;

    this.isBoosting = false;
    this.boostTimer = 0;
    this.boostDuration = 2;
    this.cooldownTimer = 0;
    this.cooldownDuration = 4;

    this.baseSpeed = 5;
    this.boostMultiplier = 2;

    this.hitFlashTimer = 0;
    this.hitFlashDuration = 0.3;
    this.invincibleTimer = 0;
    this.invincibleDuration = 1.5;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    if (this.x > this.width - this.radius) this.x = this.width - this.radius;
    if (this.y > this.height - this.radius) this.y = this.height - this.radius;
    if (this.x < this.radius) this.x = this.radius;
    if (this.y < this.radius) this.y = this.radius;
  }

  getPosition(): Vector2 {
    return { x: this.x, y: this.y };
  }

  getRadius(): number {
    return this.radius;
  }

  takeDamage(): boolean {
    if (this.invincibleTimer > 0 || this.isShielded) return false;
    this.lives--;
    this.hitFlashTimer = this.hitFlashDuration;
    this.invincibleTimer = this.invincibleDuration;
    return true;
  }

  collectEnergy(amount: number = 25): void {
    this.energy = Math.min(this.maxEnergy, this.energy + amount);
  }

  tryActivateShield(): boolean {
    if (this.energy >= this.maxEnergy && !this.isShielded) {
      this.isShielded = true;
      this.shieldTimer = this.shieldDuration;
      this.energy = 0;
      return true;
    }
    return false;
  }

  update(dt: number, input: InputState): void {
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= dt;
    }

    if (input.shift && this.cooldownTimer <= 0 && !this.isBoosting) {
      this.isBoosting = true;
      this.boostTimer = this.boostDuration;
    }

    if (this.isBoosting) {
      this.boostTimer -= dt;
      if (this.boostTimer <= 0) {
        this.isBoosting = false;
        this.cooldownTimer = this.cooldownDuration;
      }
    }

    if (this.isShielded) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) {
        this.isShielded = false;
      }
    }

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
    }
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dt;
    }

    let dx = 0;
    let dy = 0;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;

    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
      this.rotation = Math.atan2(dy, dx);
    }

    const speed = this.isBoosting ? this.baseSpeed * this.boostMultiplier : this.baseSpeed;
    const accel = 0.6;
    const friction = 0.88;

    this.vx += dx * speed * accel * dt * 60;
    this.vy += dy * speed * accel * dt * 60;
    this.vx *= friction;
    this.vy *= friction;

    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;

    this.x = Math.max(this.radius, Math.min(this.width - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(this.height - this.radius, this.y));

    this.thrustTimer += dt;
    const particleCount = this.isBoosting ? 4 : (len > 0 ? 2 : 1);
    if (this.thrustTimer > 0.02) {
      this.thrustTimer = 0;
      const backAngle = this.rotation + Math.PI;
      const offsetX = Math.cos(backAngle) * this.radius;
      const offsetY = Math.sin(backAngle) * this.radius;

      for (let i = 0; i < particleCount; i++) {
        const color = this.isBoosting
          ? Math.random() > 0.5
            ? '#ffcc00'
            : '#ff6600'
          : '#ff9944';

        this.particleSystem.emit(this.x + offsetX, this.y + offsetY, 1, {
          speed: this.isBoosting ? 5 : 3,
          spread: 0.5,
          life: this.isBoosting ? 0.4 : 0.25,
          size: this.isBoosting ? 4 : 2.5,
          color,
          direction: { x: Math.cos(backAngle), y: Math.sin(backAngle) }
        });
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    if (this.isShielded) {
      ctx.save();
      const shieldTime = this.shieldDuration - this.shieldTimer;
      const shieldRotation = shieldTime * 3;

      const gradient = ctx.createRadialGradient(0, 0, this.radius, 0, 0, this.radius * 2.2);
      gradient.addColorStop(0, 'rgba(100, 200, 255, 0)');
      gradient.addColorStop(0.6, 'rgba(100, 200, 255, 0.2)');
      gradient.addColorStop(0.8, 'rgba(150, 220, 255, 0.4)');
      gradient.addColorStop(1, 'rgba(100, 200, 255, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.rotate(shieldRotation);
      ctx.strokeStyle = 'rgba(150, 220, 255, 0.8)';
      ctx.lineWidth = 3;
      ctx.setLineDash([15, 8]);
      ctx.lineDashOffset = -shieldTime * 50;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI) / 2 + shieldRotation * 0.5);
        ctx.translate(this.radius * 1.8, 0);
        ctx.fillStyle = 'rgba(180, 230, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer * 10) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    const bodyColor = this.hitFlashTimer > 0 ? '#ff4444' : '#ff8c42';
    const bodyDark = this.hitFlashTimer > 0 ? '#cc0000' : '#cc5500';
    const bodyLight = this.hitFlashTimer > 0 ? '#ff8888' : '#ffb366';

    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = bodyDark;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(this.radius * 1.3, 0);
    ctx.lineTo(-this.radius * 0.7, -this.radius * 0.7);
    ctx.lineTo(-this.radius * 0.4, 0);
    ctx.lineTo(-this.radius * 0.7, this.radius * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = bodyLight;
    ctx.beginPath();
    ctx.moveTo(this.radius * 0.8, 0);
    ctx.lineTo(-this.radius * 0.2, -this.radius * 0.35);
    ctx.lineTo(-this.radius * 0.2, this.radius * 0.35);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#74c0fc';
    ctx.strokeStyle = '#339af0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.radius * 0.3, 0, this.radius * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(this.radius * 0.2, -this.radius * 0.1, this.radius * 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bodyDark;
    ctx.beginPath();
    ctx.moveTo(-this.radius * 0.3, -this.radius * 0.5);
    ctx.lineTo(-this.radius * 0.9, -this.radius * 1);
    ctx.lineTo(-this.radius * 0.5, -this.radius * 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-this.radius * 0.3, this.radius * 0.5);
    ctx.lineTo(-this.radius * 0.9, this.radius * 1);
    ctx.lineTo(-this.radius * 0.5, this.radius * 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  reset(): void {
    this.x = this.width / 2;
    this.y = this.height / 2;
    this.vx = 0;
    this.vy = 0;
    this.rotation = -Math.PI / 2;
    this.lives = this.maxLives;
    this.energy = 0;
    this.isShielded = false;
    this.shieldTimer = 0;
    this.isBoosting = false;
    this.boostTimer = 0;
    this.cooldownTimer = 0;
    this.hitFlashTimer = 0;
    this.invincibleTimer = 0;
  }
}
