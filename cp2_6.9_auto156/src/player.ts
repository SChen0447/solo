export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  fromPlayer: boolean;
  damage: number;
}

export interface PlayerState {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  baseSpeed: number;
  lives: number;
  maxLives: number;
  lastShotTime: number;
  baseCooldown: number;
  weaponLevel: 'normal' | 'dual';
  weaponUpgradeTimer: number;
  shieldTimer: number;
  speedBoostTimer: number;
  invincibleTimer: number;
  flashTimer: number;
  engineFlame: number;
}

export class Player {
  state: PlayerState;
  private canvasWidth: number;
  private canvasHeight: number;
  private keys: Set<string>;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.keys = new Set();
    this.state = {
      x: canvasWidth / 2,
      y: canvasHeight - 80,
      width: 40,
      height: 30,
      speed: 5,
      baseSpeed: 5,
      lives: 5,
      maxLives: 5,
      lastShotTime: 0,
      baseCooldown: 150,
      weaponLevel: 'normal',
      weaponUpgradeTimer: 0,
      shieldTimer: 0,
      speedBoostTimer: 0,
      invincibleTimer: 0,
      flashTimer: 0,
      engineFlame: 0
    };
    this.setupInput();
  }

  private setupInput() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
        this.keys.add(e.key);
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key);
    });
  }

  update(deltaTime: number, currentTime: number, bullets: Bullet[]): void {
    const dt = deltaTime / 16.67;

    if (this.state.speedBoostTimer > 0) {
      this.state.speedBoostTimer -= deltaTime;
      this.state.speed = this.state.baseSpeed * 2;
      if (this.state.speedBoostTimer <= 0) {
        this.state.speed = this.state.baseSpeed;
      }
    }

    if (this.state.weaponUpgradeTimer > 0) {
      this.state.weaponUpgradeTimer -= deltaTime;
      if (this.state.weaponUpgradeTimer <= 0) {
        this.state.weaponLevel = 'normal';
      }
    }

    if (this.state.shieldTimer > 0) {
      this.state.shieldTimer -= deltaTime;
    }

    if (this.state.invincibleTimer > 0) {
      this.state.invincibleTimer -= deltaTime;
      this.state.flashTimer += deltaTime;
    }

    this.state.engineFlame += deltaTime;

    const moveSpeed = this.state.speed * dt;
    if (this.keys.has('ArrowUp')) {
      this.state.y -= moveSpeed;
    }
    if (this.keys.has('ArrowDown')) {
      this.state.y += moveSpeed;
    }
    if (this.keys.has('ArrowLeft')) {
      this.state.x -= moveSpeed;
    }
    if (this.keys.has('ArrowRight')) {
      this.state.x += moveSpeed;
    }

    const halfW = this.state.width / 2;
    const halfH = this.state.height / 2;
    this.state.x = Math.max(halfW, Math.min(this.canvasWidth - halfW, this.state.x));
    this.state.y = Math.max(halfH, Math.min(this.canvasHeight - halfH, this.state.y));

    if (this.keys.has(' ')) {
      this.shoot(currentTime, bullets);
    }
  }

  private shoot(currentTime: number, bullets: Bullet[]): void {
    const cooldown = this.state.weaponLevel === 'dual' ? this.state.baseCooldown / 2 : this.state.baseCooldown;
    if (currentTime - this.state.lastShotTime >= cooldown) {
      this.state.lastShotTime = currentTime;
      if (this.state.weaponLevel === 'dual') {
        bullets.push({
          x: this.state.x - 10,
          y: this.state.y - this.state.height / 2,
          vx: 0,
          vy: -8,
          radius: 4,
          color: '#FFD700',
          fromPlayer: true,
          damage: 1
        });
        bullets.push({
          x: this.state.x + 10,
          y: this.state.y - this.state.height / 2,
          vx: 0,
          vy: -8,
          radius: 4,
          color: '#FFD700',
          fromPlayer: true,
          damage: 1
        });
      } else {
        bullets.push({
          x: this.state.x,
          y: this.state.y - this.state.height / 2,
          vx: 0,
          vy: -8,
          radius: 4,
          color: '#FFD700',
          fromPlayer: true,
          damage: 1
        });
      }
    }
  }

  takeDamage(): boolean {
    if (this.state.invincibleTimer > 0 || this.state.shieldTimer > 0) {
      return false;
    }
    this.state.lives--;
    this.state.invincibleTimer = 300;
    this.state.flashTimer = 0;
    return true;
  }

  addLife(): void {
    if (this.state.lives < this.state.maxLives) {
      this.state.lives++;
    }
  }

  activateWeaponUpgrade(): void {
    this.state.weaponLevel = 'dual';
    this.state.weaponUpgradeTimer = 5000;
  }

  activateShield(): void {
    this.state.shieldTimer = 3000;
  }

  activateSpeedBoost(): void {
    this.state.speedBoostTimer = 4000;
  }

  hasShield(): boolean {
    return this.state.shieldTimer > 0;
  }

  getBounds() {
    return {
      x: this.state.x - this.state.width / 2,
      y: this.state.y - this.state.height / 2,
      width: this.state.width,
      height: this.state.height
    };
  }

  render(ctx: CanvasRenderingContext2D): void {
    const s = this.state;

    if (s.invincibleTimer > 0) {
      const phase = Math.floor(s.flashTimer / 75) % 2;
      if (phase === 0) {
        ctx.globalAlpha = 0;
      }
    }

    const flameLength = 12 + Math.sin(s.engineFlame * 0.02) * 4;
    const gradient = ctx.createLinearGradient(s.x, s.y + s.height / 2, s.x, s.y + s.height / 2 + flameLength);
    gradient.addColorStop(0, '#00BFFF');
    gradient.addColorStop(1, '#00FF00');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(s.x - 6, s.y + s.height / 2);
    ctx.lineTo(s.x, s.y + s.height / 2 + flameLength);
    ctx.lineTo(s.x + 6, s.y + s.height / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#00BFFF';
    ctx.beginPath();
    ctx.moveTo(s.x, s.y - s.height / 2);
    ctx.lineTo(s.x + s.width / 2, s.y + s.height / 2);
    ctx.lineTo(s.x - s.width / 2, s.y + s.height / 2);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#87CEEB';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
    ctx.fill();

    if (s.shieldTimer > 0) {
      ctx.strokeStyle = `rgba(0, 255, 0, ${0.4 + Math.sin(s.engineFlame * 0.01) * 0.2})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(s.x, s.y, Math.max(s.width, s.height) / 2 + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  reset(): void {
    this.state = {
      x: this.canvasWidth / 2,
      y: this.canvasHeight - 80,
      width: 40,
      height: 30,
      speed: 5,
      baseSpeed: 5,
      lives: 5,
      maxLives: 5,
      lastShotTime: 0,
      baseCooldown: 150,
      weaponLevel: 'normal',
      weaponUpgradeTimer: 0,
      shieldTimer: 0,
      speedBoostTimer: 0,
      invincibleTimer: 0,
      flashTimer: 0,
      engineFlame: 0
    };
  }
}
