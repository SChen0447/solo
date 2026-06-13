import { Bullet, Particle, CONFIG } from './types';

export class Enemy {
  public x: number;
  public y: number;
  public diameter: number;
  public health: number;
  public pulsePhase: number = 0;
  public bullets: Bullet[] = [];

  private canvasWidth: number;
  private canvasHeight: number;
  private fireTimer: number = 0;
  private bulletIdCounter: number = 0;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.diameter = CONFIG.CRYSTAL_DIAMETER;
    this.x = canvasWidth * 0.85;
    this.y = canvasHeight * 0.5;
    this.health = CONFIG.CRYSTAL_MAX_HEALTH;
    this.fireTimer = CONFIG.FIRE_INTERVAL;
  }

  public update(deltaTime: number, playerX: number, playerY: number): Particle[] {
    this.pulsePhase += deltaTime * 2;
    if (this.pulsePhase > Math.PI * 2) {
      this.pulsePhase -= Math.PI * 2;
    }

    this.fireTimer -= deltaTime * 1000;
    if (this.fireTimer <= 0) {
      this.fireBullet(playerX, playerY);
      this.fireTimer = CONFIG.FIRE_INTERVAL;
    }

    const hitParticles = this.updateBullets(deltaTime);
    return hitParticles;
  }

  private fireBullet(playerX: number, playerY: number): void {
    const startX = this.x - this.diameter / 2;
    const startY = this.y;

    const dx = playerX - startX;
    const dy = playerY - startY;

    const baseSpeed = CONFIG.BULLET_SPEED;
    const angle = Math.atan2(dy, dx);
    const wobbleAngle = (Math.random() - 0.5) * 0.3;

    const finalAngle = angle + wobbleAngle;

    const bullet: Bullet = {
      id: this.bulletIdCounter++,
      x: startX,
      y: startY,
      vx: Math.cos(finalAngle) * baseSpeed,
      vy: Math.sin(finalAngle) * baseSpeed,
      radius: CONFIG.BULLET_RADIUS,
      isReflected: false,
      trail: [],
    };

    this.bullets.push(bullet);
  }

  private updateBullets(deltaTime: number): Particle[] {
    const hitParticles: Particle[] = [];

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];

      bullet.trail.push({ x: bullet.x, y: bullet.y });
      if (bullet.trail.length > 15) {
        bullet.trail.shift();
      }

      bullet.x += bullet.vx * deltaTime;
      bullet.y += bullet.vy * deltaTime;

      if (bullet.isReflected) {
        const dx = bullet.x - this.x;
        const dy = bullet.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.diameter / 2 + bullet.radius) {
          hitParticles.push(...this.createHitParticles(bullet.x, bullet.y));
          this.health--;
          this.bullets.splice(i, 1);
          continue;
        }
      }

      if (
        bullet.x < -50 ||
        bullet.x > this.canvasWidth + 50 ||
        bullet.y < -50 ||
        bullet.y > this.canvasHeight + 50
      ) {
        this.bullets.splice(i, 1);
      }
    }

    return hitParticles;
  }

  public checkPlayerCollision(playerX: number, playerY: number, playerWidth: number, playerHeight: number): boolean {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      if (bullet.isReflected) continue;

      const closestX = Math.max(playerX - playerWidth / 2, Math.min(bullet.x, playerX + playerWidth / 2));
      const closestY = Math.max(playerY - playerHeight / 2, Math.min(bullet.y, playerY + playerHeight / 2));
      const dx = bullet.x - closestX;
      const dy = bullet.y - closestY;

      if (dx * dx + dy * dy < bullet.radius * bullet.radius) {
        this.bullets.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  public checkBeamCollision(beamX: number, beamY: number, beamWidth: number): boolean {
    const crystalTop = this.y - this.diameter / 2;
    const crystalBottom = this.y + this.diameter / 2;
    const crystalLeft = this.x - this.diameter / 2;

    if (beamX + beamWidth / 2 >= crystalLeft && beamY >= crystalTop && beamY <= crystalBottom) {
      return true;
    }
    return false;
  }

  private createHitParticles(x: number, y: number): Particle[] {
    const particles: Particle[] = [];
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 150;
      const isYellow = Math.random() > 0.5;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5,
        maxLife: 0.5,
        size: 4 + Math.random() * 4,
        color: isYellow ? '#FFD700' : '#FFFFFF',
        shape: 'square',
      });
    }
    return particles;
  }

  public takeDamage(): Particle[] {
    this.health--;
    return this.createHitParticles(this.x, this.y);
  }

  public getCrystalInfo(): { x: number; y: number; diameter: number; pulsePhase: number; health: number } {
    return {
      x: this.x,
      y: this.y,
      diameter: this.diameter,
      pulsePhase: this.pulsePhase,
      health: this.health,
    };
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.x = width * 0.85;
    this.y = height * 0.5;
  }
}
