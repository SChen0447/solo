export interface PlayerBullet {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  active: boolean;
}

export interface EngineParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export class Player {
  public x: number;
  public y: number;
  public readonly width: number = 16;
  public readonly height: number = 16;
  public speed: number = 200;
  public lives: number = 3;
  public score: number = 0;

  public invincible: boolean = false;
  public invincibleTimer: number = 0;
  public invincibleDuration: number = 1;
  public blinkFrequency: number = 8;
  public visible: boolean = true;

  public shootCooldown: number = 0;
  public shootInterval: number = 0.2;

  public bullets: PlayerBullet[] = [];
  public engineParticles: EngineParticle[] = [];

  private keys: Set<string> = new Set();
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.x = canvasWidth / 2 - this.width / 2;
    this.y = canvasHeight - 80;
    this.setupInput();
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      this.keys.add(e.key.toLowerCase());
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.keys.delete(e.key.toLowerCase());
    });
  }

  public update(dt: number): void {
    let dx = 0;
    let dy = 0;

    if (this.keys.has('arrowleft') || this.keys.has('a')) dx -= 1;
    if (this.keys.has('arrowright') || this.keys.has('d')) dx += 1;
    if (this.keys.has('arrowup') || this.keys.has('w')) dy -= 1;
    if (this.keys.has('arrowdown') || this.keys.has('s')) dy += 1;

    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    this.x += dx * this.speed * dt;
    this.y += dy * this.speed * dt;

    this.x = Math.max(0, Math.min(this.canvasWidth - this.width, this.x));
    this.y = Math.max(0, Math.min(this.canvasHeight - this.height, this.y));

    this.shootCooldown -= dt;
    if ((this.keys.has(' ') || this.keys.has('space')) && this.shootCooldown <= 0) {
      this.shoot();
      this.shootCooldown = this.shootInterval;
    }

    this.updateBullets(dt);
    this.updateEngineParticles(dt);
    this.spawnEngineParticles(dt);

    if (this.invincible) {
      this.invincibleTimer -= dt;
      this.visible = Math.floor(this.invincibleTimer * this.blinkFrequency) % 2 === 0;
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
        this.visible = true;
      }
    }
  }

  private shoot(): void {
    this.bullets.push({
      x: this.x + this.width / 2 - 2.5,
      y: this.y - 10,
      width: 5,
      height: 10,
      speed: 500,
      active: true
    });
  }

  private updateBullets(dt: number): void {
    for (const bullet of this.bullets) {
      bullet.y -= bullet.speed * dt;
      if (bullet.y < -bullet.height) {
        bullet.active = false;
      }
    }
    this.bullets = this.bullets.filter(b => b.active);
  }

  private spawnEngineParticles(dt: number): void {
    if (Math.random() < 0.6) {
      this.engineParticles.push({
        x: this.x + this.width / 2 + (Math.random() - 0.5) * 4,
        y: this.y + this.height,
        vx: (Math.random() - 0.5) * 20,
        vy: 80 + Math.random() * 60,
        life: 0.3,
        maxLife: 0.3,
        size: 2 + Math.random() * 2
      });
    }
  }

  private updateEngineParticles(dt: number): void {
    for (const p of this.engineParticles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.engineParticles = this.engineParticles.filter(p => p.life > 0);
  }

  public hit(): void {
    if (this.invincible) return;
    this.lives--;
    this.invincible = true;
    this.invincibleTimer = this.invincibleDuration;
  }

  public getCollisionBox(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x + 2,
      y: this.y + 2,
      width: this.width - 4,
      height: this.height - 4
    };
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.engineParticles) {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
    }

    if (!this.visible) return;

    const px = Math.floor(this.x);
    const py = Math.floor(this.y);

    ctx.fillStyle = '#4488ff';
    ctx.beginPath();
    ctx.moveTo(px + this.width / 2, py);
    ctx.lineTo(px + this.width, py + this.height);
    ctx.lineTo(px, py + this.height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#88ccff';
    ctx.beginPath();
    ctx.moveTo(px + this.width / 2, py + 3);
    ctx.lineTo(px + this.width - 3, py + this.height - 2);
    ctx.lineTo(px + 3, py + this.height - 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + this.width / 2 - 1, py + 6, 2, 4);
  }

  public renderBullets(ctx: CanvasRenderingContext2D): void {
    for (const bullet of this.bullets) {
      ctx.fillStyle = '#ffff00';
      ctx.shadowColor = '#ffff00';
      ctx.shadowBlur = 8;
      ctx.fillRect(Math.floor(bullet.x), Math.floor(bullet.y), bullet.width, bullet.height);
      ctx.shadowBlur = 0;
    }
  }

  public reset(): void {
    this.x = this.canvasWidth / 2 - this.width / 2;
    this.y = this.canvasHeight - 80;
    this.lives = 3;
    this.score = 0;
    this.invincible = false;
    this.visible = true;
    this.bullets = [];
    this.engineParticles = [];
  }
}
