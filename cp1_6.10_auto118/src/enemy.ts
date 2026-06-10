import { PathPoint, GRID_COLS, CELL_WIDTH, GRID_OFFSET_Y } from './grid';

export type EnemyType = 'basic' | 'slow';

export interface Enemy {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  baseSpeed: number;
  pathIndex: number;
  path: PathPoint[];
  slowEffect: { active: boolean; duration: number; factor: number };
  type: EnemyType;
  reward: number;
  alive: boolean;
  reachedEnd: boolean;
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

export class EnemyManager {
  private enemies: Enemy[] = [];
  private particles: Particle[] = [];
  private nextId = 1;
  private wave = 0;
  private enemiesToSpawn = 0;
  private spawnTimer = 0;
  private spawnInterval = 0;

  getEnemies(): Enemy[] {
    return this.enemies.filter(e => e.alive);
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  getWave(): number {
    return this.wave;
  }

  getEnemiesToSpawn(): number {
    return this.enemiesToSpawn;
  }

  startWave(waveNum: number): void {
    this.wave = waveNum;
    this.enemiesToSpawn = 5 + Math.floor(Math.random() * 8);
    this.spawnInterval = 800;
    this.spawnTimer = 0;
  }

  spawnEnemy(path: PathPoint[]): void {
    if (!path || path.length === 0) return;

    const startPt = path[0];
    const isSlowType = Math.random() < 0.3;
    const type: EnemyType = isSlowType ? 'slow' : 'basic';
    const baseHp = type === 'basic' ? 50 : 80;
    const hpBonus = (this.wave - 1) * 10;
    const maxHp = baseHp + hpBonus;

    const baseReward = type === 'basic' ? 10 : 15;
    const waveBonus = Math.max(0, (this.wave - 1) * 5);

    const enemy: Enemy = {
      id: this.nextId++,
      x: -20,
      y: startPt.y,
      hp: maxHp,
      maxHp,
      baseSpeed: type === 'basic' ? 1.5 : 1.0,
      pathIndex: 0,
      path,
      slowEffect: { active: false, duration: 0, factor: 1 },
      type,
      reward: baseReward + waveBonus,
      alive: true,
      reachedEnd: false,
    };
    this.enemies.push(enemy);
  }

  applySlow(enemyId: number, factor: number, duration: number): void {
    const enemy = this.enemies.find(e => e.id === enemyId);
    if (enemy && enemy.alive) {
      enemy.slowEffect = { active: true, duration, factor };
    }
  }

  damageEnemy(enemyId: number, damage: number): number {
    const enemy = this.enemies.find(e => e.id === enemyId);
    if (!enemy || !enemy.alive) return 0;

    enemy.hp -= damage;
    if (enemy.hp <= 0) {
      enemy.hp = 0;
      enemy.alive = false;
      this.spawnDeathParticles(enemy.x, enemy.y);
      return enemy.reward;
    }
    return 0;
  }

  private spawnDeathParticles(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      const speed = 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3,
        maxLife: 0.3,
        size: 6,
        color: '#ffffff',
      });
    }
  }

  update(deltaMs: number, currentPath: PathPoint[] | null): { livesLost: number; goldEarned: number } {
    const delta = deltaMs / 1000;
    let livesLost = 0;
    let goldEarned = 0;

    if (this.enemiesToSpawn > 0 && currentPath) {
      this.spawnTimer += deltaMs;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnEnemy(currentPath);
        this.enemiesToSpawn--;
        this.spawnTimer = 0;
      }
    }

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      if (currentPath && enemy.pathIndex < currentPath.length) {
        enemy.path = currentPath;
      }

      if (enemy.slowEffect.active) {
        enemy.slowEffect.duration -= delta;
        if (enemy.slowEffect.duration <= 0) {
          enemy.slowEffect.active = false;
          enemy.slowEffect.factor = 1;
        }
      }

      const speed = enemy.baseSpeed * (enemy.slowEffect.active ? enemy.slowEffect.factor : 1);
      const speedPx = speed * 60 * delta;

      if (enemy.x < 0) {
        enemy.x += speedPx;
        if (enemy.x >= enemy.path[0].x) {
          enemy.x = enemy.path[0].x;
          enemy.pathIndex = 1;
        }
      } else if (enemy.pathIndex < enemy.path.length) {
        const target = enemy.path[enemy.pathIndex];
        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < speedPx) {
          enemy.x = target.x;
          enemy.y = target.y;
          enemy.pathIndex++;
        } else {
          enemy.x += (dx / dist) * speedPx;
          enemy.y += (dy / dist) * speedPx;
        }
      } else {
        enemy.reachedEnd = true;
        enemy.alive = false;
        livesLost++;
      }

      if (enemy.hp <= 0 && enemy.alive) {
        enemy.alive = false;
        goldEarned += enemy.reward;
        this.spawnDeathParticles(enemy.x, enemy.y);
      }
    }

    this.particles = this.particles.filter(p => {
      p.life -= delta;
      p.x += p.vx;
      p.y += p.vy;
      return p.life > 0;
    });

    this.enemies = this.enemies.filter(e => e.alive || e.hp > 0);
    this.enemies = this.enemies.filter(e => e.alive);

    return { livesLost, goldEarned };
  }

  isWaveActive(): boolean {
    return this.enemiesToSpawn > 0 || this.enemies.some(e => e.alive);
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      ctx.fillStyle = enemy.type === 'basic' ? '#e67e22' : '#3498db';
      ctx.fillRect(enemy.x - 8, enemy.y - 10, 16, 20);

      if (enemy.slowEffect.active) {
        ctx.strokeStyle = 'rgba(52, 152, 219, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, 14, 0, Math.PI * 2);
        ctx.stroke();
      }

      const hpPercent = enemy.hp / enemy.maxHp;
      const barWidth = 30;
      const barHeight = 4;
      const barX = enemy.x - barWidth / 2;
      const barY = enemy.y - 10 - 5 - 4;

      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
    }

    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}
