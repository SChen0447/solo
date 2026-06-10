export interface Bullet {
  x: number;
  y: number;
  vy: number;
}

export class Player {
  x: number;
  y: number;
  speed: number;
  hasShield: boolean;
  shieldBlink: number;
  weaponUpgraded: boolean;
  shieldUpgraded: boolean;
  shootCooldown: number;
  isDead: boolean;
  deathTimer: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.x = canvasWidth / 2;
    this.y = canvasHeight - 60;
    this.speed = 4;
    this.hasShield = false;
    this.shieldBlink = 0;
    this.weaponUpgraded = false;
    this.shieldUpgraded = false;
    this.shootCooldown = 0;
    this.isDead = false;
    this.deathTimer = 0;
  }

  moveLeft(): void {
    this.x -= this.speed;
    if (this.x < 16) this.x = 16;
  }

  moveRight(canvasWidth: number): void {
    this.x += this.speed;
    if (this.x > canvasWidth - 16) this.x = canvasWidth - 16;
  }

  moveTo(targetX: number, canvasWidth: number): void {
    const diff = targetX - this.x;
    if (Math.abs(diff) < this.speed) {
      this.x = targetX;
    } else {
      this.x += diff > 0 ? this.speed : -this.speed;
    }
    if (this.x < 16) this.x = 16;
    if (this.x > canvasWidth - 16) this.x = canvasWidth - 16;
  }

  tryShoot(bullets: Bullet[]): void {
    if (this.shootCooldown > 0) {
      this.shootCooldown--;
      return;
    }
    bullets.push({
      x: this.x,
      y: this.y - 16,
      vy: -10,
    });
    this.shootCooldown = 1;
  }

  upgradeWeapon(): void {
    this.weaponUpgraded = true;
  }

  upgradeShield(): void {
    this.shieldUpgraded = true;
    this.hasShield = true;
  }

  consumeShield(): void {
    this.hasShield = false;
    this.shieldBlink = 36;
  }

  updateShieldBlink(): void {
    if (this.shieldBlink > 0) this.shieldBlink--;
  }

  die(): void {
    this.isDead = true;
    this.deathTimer = 30;
  }

  updateDeath(): boolean {
    if (this.isDead) {
      this.deathTimer--;
      return this.deathTimer <= 0;
    }
    return false;
  }
}
