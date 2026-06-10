export type EnemyType = 'tracker' | 'snake' | 'kamikaze';

export interface EnemyBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  active: boolean;
  isHoming?: boolean;
  homingStrength?: number;
  speed?: number;
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface EnemyConfig {
  type: EnemyType;
  color: string;
  accentColor: string;
  size: number;
  baseSpeed: number;
  hp: number;
}

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  tracker: {
    type: 'tracker',
    color: '#ff3344',
    accentColor: '#ff8899',
    size: 20,
    baseSpeed: 80,
    hp: 1
  },
  snake: {
    type: 'snake',
    color: '#33ff66',
    accentColor: '#88ffaa',
    size: 24,
    baseSpeed: 60,
    hp: 1
  },
  kamikaze: {
    type: 'kamikaze',
    color: '#ff8833',
    accentColor: '#ffcc88',
    size: 18,
    baseSpeed: 150,
    hp: 1
  }
};

export class Enemy {
  public x: number;
  public y: number;
  public type: EnemyType;
  public config: EnemyConfig;
  public active: boolean = true;
  public hp: number;

  public shootTimer: number = 0;
  public shootInterval: number = 0;

  public snakePhase: number = 0;
  public snakeAmplitude: number = 80;
  public snakeFrequency: number = 2;
  public baseX: number;

  public kamikazeSpeed: number = 150;
  public kamikazeTriggered: boolean = false;

  public flashTimer: number = 0;

  constructor(x: number, y: number, type: EnemyType) {
    this.x = x;
    this.y = y;
    this.baseX = x;
    this.type = type;
    this.config = ENEMY_CONFIGS[type];
    this.hp = this.config.hp;

    if (type === 'tracker') {
      this.shootInterval = 1.5;
    } else if (type === 'snake') {
      this.shootInterval = 0.8;
    }
    this.shootTimer = Math.random() * this.shootInterval;
  }

  public update(dt: number, playerX: number, playerY: number): EnemyBullet[] {
    const bullets: EnemyBullet[] = [];

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
    }

    switch (this.type) {
      case 'tracker':
        this.updateTracker(dt, playerX, playerY);
        break;
      case 'snake':
        this.updateSnake(dt);
        break;
      case 'kamikaze':
        this.updateKamikaze(dt, playerX, playerY);
        break;
    }

    if (this.type !== 'kamikaze') {
      this.shootTimer -= dt;
      if (this.shootTimer <= 0) {
        const newBullets = this.shoot(playerX, playerY);
        bullets.push(...newBullets);
        this.shootTimer = this.shootInterval;
      }
    }

    return bullets;
  }

  private updateTracker(dt: number, playerX: number, playerY: number): void {
    this.y += this.config.baseSpeed * dt;

    const targetX = playerX - this.x;
    if (Math.abs(targetX) > 5) {
      this.x += Math.sign(targetX) * 40 * dt;
    }
  }

  private updateSnake(dt: number): void {
    this.y += this.config.baseSpeed * dt;
    this.snakePhase += dt * this.snakeFrequency;
    this.x = this.baseX + Math.sin(this.snakePhase) * this.snakeAmplitude;
  }

  private updateKamikaze(dt: number, playerX: number, playerY: number): void {
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 250 && !this.kamikazeTriggered) {
      this.kamikazeTriggered = true;
      this.kamikazeSpeed = 400;
    }

    if (distance > 0) {
      this.x += (dx / distance) * this.kamikazeSpeed * dt;
      this.y += (dy / distance) * this.kamikazeSpeed * dt;
    }
  }

  private shoot(playerX: number, playerY: number): EnemyBullet[] {
    const bullets: EnemyBullet[] = [];
    const centerX = this.x;
    const centerY = this.y + this.config.size / 2;

    if (this.type === 'tracker') {
      const dx = playerX - centerX;
      const dy = playerY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      bullets.push({
        x: centerX - 3,
        y: centerY,
        vx: (dx / dist) * 180,
        vy: (dy / dist) * 180,
        width: 6,
        height: 6,
        active: true,
        isHoming: true,
        homingStrength: 80,
        speed: 180,
        color: '#ff6677'
      });
    } else if (this.type === 'snake') {
      const dx = playerX - centerX;
      const dy = playerY - centerY;
      const baseAngle = Math.atan2(dy, dx);
      const spread = 0.25;

      for (let i = -1; i <= 1; i++) {
        const angle = baseAngle + i * spread;
        bullets.push({
          x: centerX - 3,
          y: centerY,
          vx: Math.cos(angle) * 220,
          vy: Math.sin(angle) * 220,
          width: 6,
          height: 6,
          active: true,
          color: '#66ff88'
        });
      }
    }

    return bullets;
  }

  public hit(): void {
    this.hp--;
    this.flashTimer = 0.1;
    if (this.hp <= 0) {
      this.active = false;
    }
  }

  public getCollisionBox(): { x: number; y: number; width: number; height: number } {
    const s = this.config.size;
    return {
      x: this.x - s / 2 + 2,
      y: this.y - s / 2 + 2,
      width: s - 4,
      height: s - 4
    };
  }

  public isOffScreen(canvasHeight: number): boolean {
    return this.y - this.config.size > canvasHeight + 50 ||
           this.x < -100 || this.x > 900;
  }

  public createExplosionParticles(): Particle[] {
    const particles: Particle[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.3;
      const speed = 80 + Math.random() * 120;
      particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6,
        maxLife: 0.6,
        size: 4,
        color: this.config.color
      });
    }
    return particles;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const cx = Math.floor(this.x);
    const cy = Math.floor(this.y);
    const s = this.config.size;

    if (this.flashTimer > 0) {
      ctx.fillStyle = '#ffffff';
      this.drawShape(ctx, cx, cy, s);
      return;
    }

    if (this.type === 'kamikaze' && this.kamikazeTriggered) {
      const glow = Math.sin(Date.now() * 0.02) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(255, 50, 50, ${glow * 0.4})`;
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = this.config.color;
    this.drawShape(ctx, cx, cy, s);

    ctx.fillStyle = this.config.accentColor;
    this.drawInnerShape(ctx, cx, cy, s);
  }

  private drawShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
    switch (this.type) {
      case 'tracker':
        ctx.beginPath();
        ctx.moveTo(cx, cy - s / 2);
        ctx.lineTo(cx + s / 2, cy);
        ctx.lineTo(cx, cy + s / 2);
        ctx.lineTo(cx - s / 2, cy);
        ctx.closePath();
        ctx.fill();
        break;
      case 'snake':
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const px = cx + Math.cos(angle) * s / 2;
          const py = cy + Math.sin(angle) * s / 2;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        break;
      case 'kamikaze':
        ctx.beginPath();
        ctx.arc(cx, cy, s / 2, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  }

  private drawInnerShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
    const inner = s * 0.4;
    switch (this.type) {
      case 'tracker':
        ctx.beginPath();
        ctx.moveTo(cx, cy - inner);
        ctx.lineTo(cx + inner, cy);
        ctx.lineTo(cx, cy + inner);
        ctx.lineTo(cx - inner, cy);
        ctx.closePath();
        ctx.fill();
        break;
      case 'snake':
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const px = cx + Math.cos(angle) * inner;
          const py = cy + Math.sin(angle) * inner;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        break;
      case 'kamikaze':
        ctx.beginPath();
        ctx.arc(cx, cy, inner * 0.6, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  }
}

export function updateEnemyBullets(
  bullets: EnemyBullet[],
  dt: number,
  playerX: number,
  playerY: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  for (const b of bullets) {
    if (b.isHoming && b.homingStrength && b.speed) {
      const dx = playerX - b.x;
      const dy = playerY - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const targetVx = (dx / dist) * b.speed;
      const targetVy = (dy / dist) * b.speed;
      b.vx += (targetVx - b.vx) * Math.min(1, b.homingStrength * dt / b.speed);
      b.vy += (targetVy - b.vy) * Math.min(1, b.homingStrength * dt / b.speed);
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    if (b.x < -50 || b.x > canvasWidth + 50 || b.y < -50 || b.y > canvasHeight + 50) {
      b.active = false;
    }
  }
}

export function renderEnemyBullets(ctx: CanvasRenderingContext2D, bullets: EnemyBullet[]): void {
  for (const b of bullets) {
    ctx.fillStyle = b.color;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 6;
    ctx.fillRect(Math.floor(b.x), Math.floor(b.y), b.width, b.height);
    ctx.shadowBlur = 0;
  }
}

export function updateParticles(particles: Particle[], dt: number): void {
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    p.vx *= 0.98;
    p.vy *= 0.98;
  }
}

export function renderParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    const size = Math.max(1, p.size * alpha);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.floor(p.x - size / 2), Math.floor(p.y - size / 2), size, size);
  }
  ctx.globalAlpha = 1;
}

export function pickEnemyType(): EnemyType {
  const r = Math.random();
  if (r < 0.4) return 'tracker';
  if (r < 0.75) return 'snake';
  return 'kamikaze';
}
