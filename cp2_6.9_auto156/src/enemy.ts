import type { Bullet } from './player';

export type EnemyType = 'small' | 'medium' | 'boss';

export interface Enemy {
  type: EnemyType;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  lives: number;
  maxLives: number;
  color: string;
  lastShotTime: number;
  shotInterval: number;
  score: number;
  bossDir: number;
  canDropPowerup: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface EnemyManagerState {
  enemies: Enemy[];
  particles: Particle[];
  smallSpawnTimer: number;
  mediumSpawnTimer: number;
  bossSpawnTimer: number;
  baseSmallInterval: number;
  baseMediumInterval: number;
  baseBossInterval: number;
  smallInterval: number;
  mediumInterval: number;
  bossInterval: number;
  bulletSpeed: number;
  killsSinceDifficulty: number;
  difficultyLevel: number;
}

export class EnemyManager {
  state: EnemyManagerState;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.state = {
      enemies: [],
      particles: [],
      smallSpawnTimer: 0,
      mediumSpawnTimer: 5000,
      bossSpawnTimer: 30000,
      baseSmallInterval: 5000,
      baseMediumInterval: 10000,
      baseBossInterval: 30000,
      smallInterval: 5000,
      mediumInterval: 10000,
      bossInterval: 30000,
      bulletSpeed: 3,
      killsSinceDifficulty: 0,
      difficultyLevel: 0
    };
  }

  private createEnemy(type: EnemyType): Enemy {
    switch (type) {
      case 'small': {
        const x = 30 + Math.random() * (this.canvasWidth - 60);
        return {
          type: 'small',
          x,
          y: -20,
          width: 20,
          height: 20,
          speed: 2,
          lives: 1,
          maxLives: 1,
          color: '#FF4444',
          lastShotTime: 0,
          shotInterval: 2000,
          score: 10,
          bossDir: 0,
          canDropPowerup: true
        };
      }
      case 'medium': {
        const x = 50 + Math.random() * (this.canvasWidth - 100);
        return {
          type: 'medium',
          x,
          y: -30,
          width: 30,
          height: 30,
          speed: 1.5,
          lives: 3,
          maxLives: 3,
          color: '#9B59B6',
          lastShotTime: 0,
          shotInterval: 3000,
          score: 30,
          bossDir: 0,
          canDropPowerup: true
        };
      }
      case 'boss': {
        return {
          type: 'boss',
          x: this.canvasWidth / 2,
          y: -60,
          width: 80,
          height: 60,
          speed: 1,
          lives: 15,
          maxLives: 15,
          color: '#34495E',
          lastShotTime: 0,
          shotInterval: 2500,
          score: 100,
          bossDir: Math.random() < 0.5 ? 1 : -1,
          canDropPowerup: true
        };
      }
    }
  }

  update(deltaTime: number, currentTime: number, bullets: Bullet[], playerX: number, playerY: number): { type: EnemyType; x: number; y: number }[] {
    const dt = deltaTime / 16.67;
    const spawnedEnemies: { type: EnemyType; x: number; y: number }[] = [];

    this.state.smallSpawnTimer -= deltaTime;
    this.state.mediumSpawnTimer -= deltaTime;
    this.state.bossSpawnTimer -= deltaTime;

    if (this.state.smallSpawnTimer <= 0) {
      const count = 5 + Math.floor(Math.random() * 4);
      for (let i = 0; i < count; i++) {
        const e = this.createEnemy('small');
        e.x = 30 + Math.random() * (this.canvasWidth - 60);
        e.y = -20 - Math.random() * 200;
        this.state.enemies.push(e);
      }
      spawnedEnemies.push({ type: 'small', x: 0, y: 0 });
      this.state.smallSpawnTimer = this.state.smallInterval;
    }

    if (this.state.mediumSpawnTimer <= 0) {
      const count = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        const e = this.createEnemy('medium');
        e.x = 50 + Math.random() * (this.canvasWidth - 100);
        e.y = -30 - Math.random() * 150;
        this.state.enemies.push(e);
      }
      spawnedEnemies.push({ type: 'medium', x: 0, y: 0 });
      this.state.mediumSpawnTimer = this.state.mediumInterval;
    }

    if (this.state.bossSpawnTimer <= 0) {
      const hasBoss = this.state.enemies.some(e => e.type === 'boss');
      if (!hasBoss) {
        this.state.enemies.push(this.createEnemy('boss'));
        spawnedEnemies.push({ type: 'boss', x: 0, y: 0 });
      }
      this.state.bossSpawnTimer = this.state.bossInterval;
    }

    const remainingEnemies: Enemy[] = [];
    for (const enemy of this.state.enemies) {
      if (enemy.type === 'boss') {
        if (enemy.y < 80) {
          enemy.y += enemy.speed * dt;
        } else {
          enemy.x += enemy.bossDir * 1.5 * dt;
          if (enemy.x < enemy.width / 2 + 10) {
            enemy.x = enemy.width / 2 + 10;
            enemy.bossDir = 1;
          }
          if (enemy.x > this.canvasWidth - enemy.width / 2 - 10) {
            enemy.x = this.canvasWidth - enemy.width / 2 - 10;
            enemy.bossDir = -1;
          }
        }
      } else {
        enemy.y += enemy.speed * dt;
      }

      if (enemy.y < this.canvasHeight + 50) {
        if (currentTime - enemy.lastShotTime >= enemy.shotInterval) {
          enemy.lastShotTime = currentTime;
          this.enemyShoot(enemy, bullets, playerX, playerY);
        }
        remainingEnemies.push(enemy);
      }
    }
    this.state.enemies = remainingEnemies;

    this.state.particles = this.state.particles.filter(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= deltaTime;
      return p.life > 0;
    });

    return spawnedEnemies;
  }

  private enemyShoot(enemy: Enemy, bullets: Bullet[], playerX: number, playerY: number): void {
    const bs = this.state.bulletSpeed;
    switch (enemy.type) {
      case 'small': {
        bullets.push({
          x: enemy.x,
          y: enemy.y + enemy.height / 2,
          vx: 0,
          vy: bs,
          radius: 4,
          color: '#FF4444',
          fromPlayer: false,
          damage: 1
        });
        break;
      }
      case 'medium': {
        for (let i = -1; i <= 1; i++) {
          bullets.push({
            x: enemy.x,
            y: enemy.y + enemy.height / 2,
            vx: i * 1,
            vy: bs,
            radius: 5,
            color: '#9B59B6',
            fromPlayer: false,
            damage: 1
          });
        }
        break;
      }
      case 'boss': {
        const dx = playerX - enemy.x;
        const dy = playerY - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const angle = Math.atan2(dy, dx);
        for (let i = -2; i <= 2; i++) {
          const a = angle + i * 0.25;
          bullets.push({
            x: enemy.x,
            y: enemy.y + enemy.height / 2,
            vx: Math.cos(a) * bs,
            vy: Math.sin(a) * bs,
            radius: 6,
            color: '#FFA500',
            fromPlayer: false,
            damage: 1
          });
        }
        break;
      }
    }
  }

  createExplosion(x: number, y: number, color: string): void {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 2,
        color,
        life: 400,
        maxLife: 400
      });
    }
  }

  registerKill(enemyType: EnemyType): void {
    this.state.killsSinceDifficulty++;
    if (this.state.killsSinceDifficulty >= 15) {
      this.state.killsSinceDifficulty = 0;
      this.state.difficultyLevel++;
      const speedFactor = Math.min(0.5, this.state.difficultyLevel * 0.1);
      this.state.smallInterval = this.state.baseSmallInterval * (1 - speedFactor);
      this.state.mediumInterval = this.state.baseMediumInterval * (1 - speedFactor);
      this.state.bossInterval = this.state.baseBossInterval * (1 - speedFactor);
      this.state.bulletSpeed = Math.min(6, 3 + this.state.difficultyLevel * 0.5);
    }
  }

  removeEnemy(enemy: Enemy): void {
    const idx = this.state.enemies.indexOf(enemy);
    if (idx !== -1) {
      this.state.enemies.splice(idx, 1);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.state.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const enemy of this.state.enemies) {
      this.drawEnemy(ctx, enemy);
    }
  }

  private drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy): void {
    ctx.fillStyle = enemy.color;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;

    if (enemy.type === 'small') {
      this.drawHexagon(ctx, enemy.x, enemy.y, enemy.width / 2);
    } else if (enemy.type === 'medium') {
      this.drawDiamond(ctx, enemy.x, enemy.y, enemy.width / 2, enemy.height / 2);
    } else {
      this.drawBossHexagon(ctx, enemy.x, enemy.y, enemy.width / 2, enemy.height / 2);
      const barW = enemy.width;
      const barH = 4;
      const barX = enemy.x - barW / 2;
      const barY = enemy.y - enemy.height / 2 - 10;
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#FF4444';
      ctx.fillRect(barX, barY, barW * (enemy.lives / enemy.maxLives), barH);
    }
  }

  private drawHexagon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private drawDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, hw: number, hh: number): void {
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private drawBossHexagon(ctx: CanvasRenderingContext2D, cx: number, cy: number, hw: number, hh: number): void {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const x = cx + Math.cos(a) * hw;
      const y = cy + Math.sin(a) * hh;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FF6B6B';
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  reset(): void {
    this.state = {
      enemies: [],
      particles: [],
      smallSpawnTimer: 0,
      mediumSpawnTimer: 5000,
      bossSpawnTimer: 30000,
      baseSmallInterval: 5000,
      baseMediumInterval: 10000,
      baseBossInterval: 30000,
      smallInterval: 5000,
      mediumInterval: 10000,
      bossInterval: 30000,
      bulletSpeed: 3,
      killsSinceDifficulty: 0,
      difficultyLevel: 0
    };
  }
}
