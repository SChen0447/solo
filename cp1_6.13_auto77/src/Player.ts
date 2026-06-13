import { ChargedBeam, CONFIG, Bullet, Particle } from './types';

export class Player {
  public x: number;
  public y: number;
  public width: number = 80;
  public height: number = 40;
  public health: number;
  public shieldActive: boolean = false;
  public shieldAngle: number = 0;
  public reflectCount: number = 0;
  public isCharged: boolean = false;
  public chargeTimer: number = 0;
  public chargedBeam: ChargedBeam | null = null;
  public engineParticles: Particle[] = [];

  private keys: Set<string> = new Set();
  private canvasWidth: number;
  private canvasHeight: number;
  private particleTimer: number = 0;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.x = canvasWidth * 0.2;
    this.y = canvasHeight * 0.5;
    this.health = CONFIG.PLAYER_MAX_HEALTH;
  }

  public handleKeyDown(key: string): void {
    this.keys.add(key.toLowerCase());
    if (key === ' ') {
      this.shieldActive = true;
    }
  }

  public handleKeyUp(key: string): void {
    this.keys.delete(key.toLowerCase());
    if (key === ' ') {
      this.shieldActive = false;
    }
  }

  public handleMouseClick(_mouseX: number, _mouseY: number): void {
    if (this.isCharged && !this.chargedBeam) {
      this.fireChargedBeam();
    }
  }

  private fireChargedBeam(): void {
    this.chargedBeam = {
      x: this.x + this.width / 2,
      y: this.y,
      vx: CONFIG.CHARGED_BEAM_SPEED,
      width: CONFIG.CHARGED_BEAM_WIDTH,
      active: true,
    };
    this.isCharged = false;
    this.chargeTimer = 0;
    this.reflectCount = 0;
  }

  public update(deltaTime: number, bullets: Bullet[], onReflect: (bullet: Bullet) => void): Particle[] {
    this.updatePosition(deltaTime);
    this.updateShield(deltaTime);
    this.updateCharge(deltaTime);
    this.updateChargedBeam(deltaTime);
    this.updateEngineParticles(deltaTime);
    this.addEngineParticles(deltaTime);
    const reflectParticles = this.checkShieldCollisions(bullets, onReflect);
    return reflectParticles;
  }

  private updatePosition(deltaTime: number): void {
    const speed = CONFIG.PLAYER_SPEED * deltaTime;
    let dx = 0;
    let dy = 0;

    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= speed;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += speed;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= speed;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += speed;

    if (dx !== 0 && dy !== 0) {
      const factor = 1 / Math.sqrt(2);
      dx *= factor;
      dy *= factor;
    }

    this.x = Math.max(this.width / 2, Math.min(this.canvasWidth * 0.5 - this.width / 2, this.x + dx));
    this.y = Math.max(this.height / 2 + 20, Math.min(this.canvasHeight - this.height / 2 - 20, this.y + dy));
  }

  private updateShield(deltaTime: number): void {
    if (this.shieldActive) {
      this.shieldAngle += (CONFIG.SHIELD_ROTATION_SPEED * Math.PI / 180) * deltaTime;
      if (this.shieldAngle > Math.PI * 2) {
        this.shieldAngle -= Math.PI * 2;
      }
    }
  }

  private updateCharge(deltaTime: number): void {
    if (this.isCharged) {
      this.chargeTimer -= deltaTime * 1000;
      if (this.chargeTimer <= 0) {
        this.isCharged = false;
        this.chargeTimer = 0;
        this.reflectCount = 0;
      }
    }
  }

  private updateChargedBeam(deltaTime: number): void {
    if (this.chargedBeam && this.chargedBeam.active) {
      this.chargedBeam.x += this.chargedBeam.vx * deltaTime;
      if (this.chargedBeam.x > this.canvasWidth + 100) {
        this.chargedBeam.active = false;
        this.chargedBeam = null;
      }
    }
  }

  private updateEngineParticles(deltaTime: number): void {
    for (let i = this.engineParticles.length - 1; i >= 0; i--) {
      const p = this.engineParticles[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.engineParticles.splice(i, 1);
      }
    }
  }

  private addEngineParticles(deltaTime: number): void {
    this.particleTimer += deltaTime * 1000;
    if (this.particleTimer > 30) {
      this.particleTimer = 0;
      const color = this.isCharged ? '#4A90D9' : '#87CEEB';
      this.engineParticles.push({
        x: this.x - this.width / 2 - 5,
        y: this.y + (Math.random() - 0.5) * 10,
        vx: -80 - Math.random() * 40,
        vy: (Math.random() - 0.5) * 20,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        size: 3 + Math.random() * 3,
        color,
        shape: 'circle',
      });
    }
  }

  private checkShieldCollisions(bullets: Bullet[], onReflect: (bullet: Bullet) => void): Particle[] {
    const particles: Particle[] = [];
    if (!this.shieldActive) return particles;

    const shieldRadius = CONFIG.SHIELD_DIAMETER / 2;
    const shieldCenterX = this.x + this.width / 2;
    const shieldCenterY = this.y;

    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      if (bullet.isReflected) continue;

      const dx = bullet.x - shieldCenterX;
      const dy = bullet.y - shieldCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < shieldRadius + bullet.radius && dist > shieldRadius - bullet.radius - 10) {
        const angleToBullet = Math.atan2(dy, dx);
        const angleDiff = this.normalizeAngle(angleToBullet - this.shieldAngle);

        if (Math.abs(angleDiff) < Math.PI / 2) {
          this.reflectBullet(bullet, shieldCenterX, shieldCenterY, shieldRadius);
          onReflect(bullet);
          particles.push(...this.createReflectParticles(bullet.x, bullet.y));
          this.incrementReflectCount();
        }
      }
    }
    return particles;
  }

  private reflectBullet(bullet: Bullet, cx: number, cy: number, _shieldRadius: number): void {
    const dx = bullet.x - cx;
    const dy = bullet.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / dist;
    const ny = dy / dist;

    const dot = bullet.vx * nx + bullet.vy * ny;
    bullet.vx = bullet.vx - 2 * dot * nx;
    bullet.vy = bullet.vy - 2 * dot * ny;

    const speed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
    const targetSpeed = CONFIG.BULLET_SPEED * 1.2;
    bullet.vx = (bullet.vx / speed) * targetSpeed;
    bullet.vy = (bullet.vy / speed) * targetSpeed;

    bullet.isReflected = true;
    bullet.x += nx * 5;
    bullet.y += ny * 5;
  }

  private createReflectParticles(x: number, y: number): Particle[] {
    const particles: Particle[] = [];
    const count = 5 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5,
        maxLife: 0.5,
        size: 3 + Math.random() * 2,
        color: '#FFFFFF',
        shape: 'circle',
      });
    }
    return particles;
  }

  private incrementReflectCount(): void {
    this.reflectCount++;
    if (this.reflectCount >= CONFIG.REFLECTS_TO_CHARGE && !this.isCharged) {
      this.isCharged = true;
      this.chargeTimer = CONFIG.CHARGE_DURATION;
    }
  }

  public takeDamage(): boolean {
    this.health--;
    return this.health <= 0;
  }

  public getShieldInfo(): { x: number; y: number; radius: number; angle: number; active: boolean } {
    return {
      x: this.x + this.width / 2,
      y: this.y,
      radius: CONFIG.SHIELD_DIAMETER / 2,
      angle: this.shieldAngle,
      active: this.shieldActive,
    };
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.x = Math.min(this.x, width * 0.5 - this.width / 2);
    this.y = Math.min(this.y, height - this.height / 2 - 20);
    this.y = Math.max(this.y, this.height / 2 + 20);
  }

  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }
}
