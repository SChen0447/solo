import {
  Enemy, Tower, Projectile, Particle, FloatingText, GameState, Point,
  EnemyType, TowerType, ParticleType,
  TOWER_CONFIGS, ENEMY_CONFIGS,
  GRID_SIZE, WAVE_INTERVAL, INITIAL_GOLD, INITIAL_LIVES,
  MAX_TOWER_LEVEL, UPGRADE_COST_MULTIPLIER, UPGRADE_DAMAGE_MULTIPLIER, UPGRADE_RANGE_MULTIPLIER
} from './types';

let nextEnemyId = 0;
let nextTowerId = 0;
let nextProjectileId = 0;

export class Game {
  public state: GameState;
  public enemies: Enemy[] = [];
  public towers: Tower[] = [];
  public projectiles: Projectile[] = [];
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];
  public path: Point[] = [];
  public gridCols: number = 0;
  public gridRows: number = 0;
  public pathGridCells: Set<string> = new Set();
  public canvasWidth: number = 0;
  public canvasHeight: number = 0;

  private maxParticles: number = 200;
  private maxFloatingTexts: number = 50;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.gridCols = Math.floor(canvasWidth / GRID_SIZE);
    this.gridRows = Math.floor(canvasHeight / GRID_SIZE);

    this.state = {
      gold: INITIAL_GOLD,
      lives: INITIAL_LIVES,
      wave: 0,
      isPlaying: false,
      isPaused: false,
      isGameOver: false,
      waveTimer: 0,
      waveActive: false,
      enemiesToSpawn: 0,
      spawnTimer: 0,
      selectedTowerType: null,
      selectedTower: null,
      totalGoldEarned: 0
    };

    this.generatePath();
    this.calculatePathCells();
  }

  private generatePath(): void {
    const midY = this.canvasHeight / 2;
    const startX = -30;
    const endX = this.canvasWidth + 30;

    this.path = [
      { x: startX, y: midY },
      { x: 80, y: midY },
      { x: 160, y: midY - 80 },
      { x: 280, y: midY - 80 },
      { x: 360, y: midY + 60 },
      { x: 480, y: midY + 60 },
      { x: 560, y: midY - 50 },
      { x: 680, y: midY - 50 },
      { x: 760, y: midY + 70 },
      { x: 880, y: midY + 70 },
      { x: 960, y: midY },
      { x: endX, y: midY }
    ];

    const pathPoints: Point[] = [];
    for (let i = 0; i < this.path.length - 1; i++) {
      const p1 = this.path[i];
      const p2 = this.path[i + 1];
      const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
      const steps = Math.ceil(dist / 10);
      for (let j = 0; j <= steps; j++) {
        const t = j / steps;
        pathPoints.push({
          x: p1.x + (p2.x - p1.x) * t,
          y: p1.y + (p2.y - p1.y) * t
        });
      }
    }
  }

  private calculatePathCells(): void {
    this.pathGridCells.clear();
    for (let i = 0; i < this.path.length - 1; i++) {
      const p1 = this.path[i];
      const p2 = this.path[i + 1];
      const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
      const steps = Math.ceil(dist / (GRID_SIZE * 0.5));
      for (let j = 0; j <= steps; j++) {
        const t = j / steps;
        const x = p1.x + (p2.x - p1.x) * t;
        const y = p1.y + (p2.y - p1.y) * t;
        const gridX = Math.floor(x / GRID_SIZE);
        const gridY = Math.floor(y / GRID_SIZE);
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            this.pathGridCells.add(`${gridX + dx},${gridY + dy}`);
          }
        }
      }
    }
  }

  public isCellPath(gridX: number, gridY: number): boolean {
    return this.pathGridCells.has(`${gridX},${gridY}`);
  }

  public isCellBuildable(gridX: number, gridY: number): boolean {
    if (gridX < 0 || gridX >= this.gridCols || gridY < 0 || gridY >= this.gridRows) {
      return false;
    }
    if (this.isCellPath(gridX, gridY)) {
      return false;
    }
    for (const tower of this.towers) {
      if (tower.gridX === gridX && tower.gridY === gridY) {
        return false;
      }
    }
    return true;
  }

  public startGame(): void {
    if (this.state.isPlaying || this.state.isGameOver) return;
    this.state.isPlaying = true;
    this.state.wave = 0;
    this.startNextWave();
  }

  public startNextWave(): void {
    if (this.state.waveActive || this.state.isGameOver) return;

    this.state.wave++;
    this.state.waveActive = true;
    this.state.waveTimer = 0;

    const baseEnemies = 5 + Math.floor(this.state.wave * 0.8);
    this.state.enemiesToSpawn = Math.min(baseEnemies, 15);
    this.state.spawnTimer = 0;
  }

  public togglePause(): void {
    if (this.state.isGameOver) return;
    this.state.isPaused = !this.state.isPaused;
  }

  public placeTower(type: TowerType, gridX: number, gridY: number): boolean {
    if (!this.isCellBuildable(gridX, gridY)) return false;

    const config = TOWER_CONFIGS[type];
    if (this.state.gold < config.cost) return false;

    const tower: Tower = {
      id: nextTowerId++,
      type,
      gridX,
      gridY,
      x: gridX * GRID_SIZE + GRID_SIZE / 2,
      y: gridY * GRID_SIZE + GRID_SIZE / 2,
      level: 1,
      damage: config.damage,
      range: config.range,
      fireRate: config.fireRate,
      lastFireTime: 0,
      target: null,
      angle: 0,
      isPlacing: true,
      placeAnimProgress: 0,
      cost: config.cost,
      totalCost: config.cost
    };

    this.towers.push(tower);
    this.state.gold -= config.cost;
    return true;
  }

  public upgradeTower(tower: Tower): boolean {
    if (tower.level >= MAX_TOWER_LEVEL) return false;

    const upgradeCost = Math.floor(tower.cost * UPGRADE_COST_MULTIPLIER * tower.level);
    if (this.state.gold < upgradeCost) return false;

    this.state.gold -= upgradeCost;
    tower.level++;
    tower.damage = Math.floor(tower.damage * UPGRADE_DAMAGE_MULTIPLIER);
    tower.range = Math.floor(tower.range * UPGRADE_RANGE_MULTIPLIER);
    tower.totalCost += upgradeCost;
    tower.isPlacing = true;
    tower.placeAnimProgress = 0;

    return true;
  }

  public sellTower(tower: Tower): void {
    const sellValue = Math.floor(tower.totalCost * 0.6);
    this.state.gold += sellValue;
    this.addFloatingText(tower.x, tower.y - 20, `+${sellValue}`, '#d4af37');

    const index = this.towers.findIndex(t => t.id === tower.id);
    if (index !== -1) {
      this.towers.splice(index, 1);
    }

    if (this.state.selectedTower?.id === tower.id) {
      this.state.selectedTower = null;
    }
  }

  public getUpgradeCost(tower: Tower): number {
    if (tower.level >= MAX_TOWER_LEVEL) return 0;
    return Math.floor(tower.cost * UPGRADE_COST_MULTIPLIER * tower.level);
  }

  public getTowerAt(gridX: number, gridY: number): Tower | null {
    for (const tower of this.towers) {
      if (tower.gridX === gridX && tower.gridY === gridY) {
        return tower;
      }
    }
    return null;
  }

  public update(deltaTime: number): void {
    if (this.state.isPaused || this.state.isGameOver) return;

    this.updateWave(deltaTime);
    this.updateEnemies(deltaTime);
    this.updateTowers(deltaTime);
    this.updateProjectiles(deltaTime);
    this.updateParticles(deltaTime);
    this.updateFloatingTexts(deltaTime);
    this.checkGameOver();
  }

  private updateWave(deltaTime: number): void {
    if (!this.state.waveActive && this.state.isPlaying) {
      this.state.waveTimer += deltaTime;
      if (this.state.waveTimer >= WAVE_INTERVAL) {
        this.startNextWave();
      }
      return;
    }

    if (this.state.enemiesToSpawn > 0) {
      this.state.spawnTimer += deltaTime;
      const spawnInterval = 0.8 + Math.random() * 0.6;

      if (this.state.spawnTimer >= spawnInterval) {
        this.spawnEnemy();
        this.state.enemiesToSpawn--;
        this.state.spawnTimer = 0;
      }
    }

    if (this.state.enemiesToSpawn === 0 && this.enemies.length === 0 && this.state.waveActive) {
      this.state.waveActive = false;
      this.state.waveTimer = 0;
    }
  }

  private spawnEnemy(): void {
    const isElite = this.state.wave >= 3 && Math.random() < 0.2 + this.state.wave * 0.02;
    const type: EnemyType = isElite ? 'elite' : 'normal';
    const config = ENEMY_CONFIGS[type];

    const hpMultiplier = 1 + (this.state.wave - 1) * 0.15;
    const speedMultiplier = 1 + (this.state.wave - 1) * 0.05;

    const enemy: Enemy = {
      id: nextEnemyId++,
      type,
      x: this.path[0].x,
      y: this.path[0].y,
      hp: Math.floor(config.hp * hpMultiplier),
      maxHp: Math.floor(config.hp * hpMultiplier),
      speed: config.speed * speedMultiplier,
      baseSpeed: config.speed * speedMultiplier,
      pathIndex: 0,
      pathProgress: 0,
      reward: config.reward,
      isHit: false,
      hitTimer: 0,
      slowEffect: 1,
      slowTimer: 0,
      radius: config.radius
    };

    this.enemies.push(enemy);
  }

  private updateEnemies(deltaTime: number): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      if (enemy.hitTimer > 0) {
        enemy.hitTimer -= deltaTime;
        enemy.isHit = enemy.hitTimer > 0;
      }

      if (enemy.slowTimer > 0) {
        enemy.slowTimer -= deltaTime;
        if (enemy.slowTimer <= 0) {
          enemy.slowEffect = 1;
        }
      }

      const speed = enemy.baseSpeed * enemy.slowEffect * deltaTime;
      this.moveEnemyAlongPath(enemy, speed);

      if (enemy.pathIndex >= this.path.length - 1) {
        this.state.lives -= enemy.type === 'elite' ? 10 : 5;
        this.enemies.splice(i, 1);
        continue;
      }

      if (enemy.hp <= 0) {
        this.onEnemyDeath(enemy);
        this.enemies.splice(i, 1);
      }
    }
  }

  private moveEnemyAlongPath(enemy: Enemy, distance: number): void {
    let remainingDist = distance;

    while (remainingDist > 0 && enemy.pathIndex < this.path.length - 1) {
      const p1 = this.path[enemy.pathIndex];
      const p2 = this.path[enemy.pathIndex + 1];
      const segmentDist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
      const remainingOnSegment = segmentDist * (1 - enemy.pathProgress);

      if (remainingDist >= remainingOnSegment) {
        remainingDist -= remainingOnSegment;
        enemy.pathIndex++;
        enemy.pathProgress = 0;
      } else {
        enemy.pathProgress += remainingDist / segmentDist;
        remainingDist = 0;
      }
    }

    if (enemy.pathIndex < this.path.length - 1) {
      const p1 = this.path[enemy.pathIndex];
      const p2 = this.path[enemy.pathIndex + 1];
      enemy.x = p1.x + (p2.x - p1.x) * enemy.pathProgress;
      enemy.y = p1.y + (p2.y - p1.y) * enemy.pathProgress;
    } else if (this.path.length > 0) {
      enemy.x = this.path[this.path.length - 1].x;
      enemy.y = this.path[this.path.length - 1].y;
    }
  }

  private onEnemyDeath(enemy: Enemy): void {
    this.state.gold += enemy.reward;
    this.state.totalGoldEarned += enemy.reward;
    this.addFloatingText(enemy.x, enemy.y - 20, `+${enemy.reward}`, '#d4af37');
    this.spawnDeathParticles(enemy.x, enemy.y, enemy.type);
  }

  private spawnDeathParticles(x: number, y: number, type: EnemyType): void {
    const color = type === 'elite' ? '#6a0dad' : '#8b4513';
    const count = type === 'elite' ? 20 : 12;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 80;
      const particle: Particle = {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
        color,
        size: 3 + Math.random() * 4,
        type: 'death',
        alpha: 1
      };
      this.addParticle(particle);
    }

    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 40;
      const particle: Particle = {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8 + Math.random() * 0.5,
        maxLife: 1.3,
        color: '#555',
        size: 4 + Math.random() * 5,
        type: 'dust',
        alpha: 0.7
      };
      this.addParticle(particle);
    }
  }

  private updateTowers(deltaTime: number): void {
    const currentTime = performance.now() / 1000;

    for (const tower of this.towers) {
      if (tower.isPlacing) {
        tower.placeAnimProgress += deltaTime * 3;
        if (tower.placeAnimProgress >= 1) {
          tower.placeAnimProgress = 1;
          tower.isPlacing = false;
        }
      }

      const target = this.findTarget(tower);
      tower.target = target;

      if (target) {
        const dx = target.x - tower.x;
        const dy = target.y - tower.y;
        tower.angle = Math.atan2(dy, dx);

        const fireInterval = 1 / tower.fireRate;
        if (currentTime - tower.lastFireTime >= fireInterval) {
          this.fireProjectile(tower, target);
          tower.lastFireTime = currentTime;
        }
      }
    }
  }

  private findTarget(tower: Tower): Enemy | null {
    let bestTarget: Enemy | null = null;
    let bestProgress = -1;

    for (const enemy of this.enemies) {
      const dx = enemy.x - tower.x;
      const dy = enemy.y - tower.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= tower.range) {
        const progress = enemy.pathIndex + enemy.pathProgress;
        if (progress > bestProgress) {
          bestProgress = progress;
          bestTarget = enemy;
        }
      }
    }

    return bestTarget;
  }

  private fireProjectile(tower: Tower, target: Enemy): void {
    const config = TOWER_CONFIGS[tower.type];

    const projectile: Projectile = {
      id: nextProjectileId++,
      type: tower.type,
      x: tower.x,
      y: tower.y,
      targetX: target.x,
      targetY: target.y,
      speed: config.projectileSpeed,
      damage: tower.damage,
      targetId: target.id,
      splashRadius: config.splashRadius,
      slowEffect: config.slowEffect,
      slowDuration: config.slowDuration,
      active: true
    };

    this.projectiles.push(projectile);
  }

  private updateProjectiles(deltaTime: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];

      if (!proj.active) {
        this.projectiles.splice(i, 1);
        continue;
      }

      const target = this.enemies.find(e => e.id === proj.targetId);
      if (target) {
        proj.targetX = target.x;
        proj.targetY = target.y;
      }

      const dx = proj.targetX - proj.x;
      const dy = proj.targetY - proj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 10) {
        this.onProjectileHit(proj, target);
        proj.active = false;
        continue;
      }

      const moveDist = proj.speed * deltaTime;
      if (moveDist >= dist) {
        proj.x = proj.targetX;
        proj.y = proj.targetY;
        this.onProjectileHit(proj, target);
        proj.active = false;
      } else {
        proj.x += (dx / dist) * moveDist;
        proj.y += (dy / dist) * moveDist;
      }

      if (proj.x < -50 || proj.x > this.canvasWidth + 50 ||
          proj.y < -50 || proj.y > this.canvasHeight + 50) {
        proj.active = false;
      }
    }
  }

  private onProjectileHit(proj: Projectile, target: Enemy | undefined): void {
    if (proj.type === 'splash' && proj.splashRadius) {
      this.spawnExplosionParticles(proj.x, proj.y);
      for (const enemy of this.enemies) {
        const dx = enemy.x - proj.x;
        const dy = enemy.y - proj.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= proj.splashRadius) {
          const damageMultiplier = 1 - (dist / proj.splashRadius) * 0.5;
          this.damageEnemy(enemy, proj.damage * damageMultiplier);
        }
      }
    } else if (target) {
      this.damageEnemy(target, proj.damage);
      this.spawnHitParticles(proj.x, proj.y);

      if (proj.slowEffect && proj.slowDuration) {
        target.slowEffect = proj.slowEffect;
        target.slowTimer = proj.slowDuration;
      }
    }
  }

  private damageEnemy(enemy: Enemy, damage: number): void {
    enemy.hp -= damage;
    enemy.isHit = true;
    enemy.hitTimer = 0.1;
  }

  private spawnHitParticles(x: number, y: number): void {
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 60;
      const particle: Particle = {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.2 + Math.random() * 0.2,
        maxLife: 0.4,
        color: '#ffcc00',
        size: 2 + Math.random() * 2,
        type: 'hit',
        alpha: 1
      };
      this.addParticle(particle);
    }
  }

  private spawnExplosionParticles(x: number, y: number): void {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 100;
      const particle: Particle = {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        color: i % 2 === 0 ? '#ff6600' : '#ffcc00',
        size: 4 + Math.random() * 5,
        type: 'explosion',
        alpha: 1
      };
      this.addParticle(particle);
    }
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.vy += 100 * deltaTime;
      p.life -= deltaTime;
      p.alpha = Math.max(0, p.life / p.maxLife);

      if (p.type === 'dust') {
        p.size += deltaTime * 10;
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private addParticle(particle: Particle): void {
    if (this.particles.length >= this.maxParticles) {
      this.particles.shift();
    }
    this.particles.push(particle);
  }

  private updateFloatingTexts(deltaTime: number): void {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * deltaTime;
      ft.life -= deltaTime;
      ft.alpha = Math.max(0, ft.life / ft.maxLife);

      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  public addFloatingText(x: number, y: number, text: string, color: string): void {
    if (this.floatingTexts.length >= this.maxFloatingTexts) {
      this.floatingTexts.shift();
    }

    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      life: 1.0,
      maxLife: 1.0,
      vy: -40,
      alpha: 1
    });
  }

  private checkGameOver(): void {
    if (this.state.lives <= 0 && !this.state.isGameOver) {
      this.state.lives = 0;
      this.state.isGameOver = true;
      this.state.isPlaying = false;
    }
  }

  public reset(): void {
    nextEnemyId = 0;
    nextTowerId = 0;
    nextProjectileId = 0;

    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];

    this.state = {
      gold: INITIAL_GOLD,
      lives: INITIAL_LIVES,
      wave: 0,
      isPlaying: false,
      isPaused: false,
      isGameOver: false,
      waveTimer: 0,
      waveActive: false,
      enemiesToSpawn: 0,
      spawnTimer: 0,
      selectedTowerType: null,
      selectedTower: null,
      totalGoldEarned: 0
    };

    this.generatePath();
    this.calculatePathCells();
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.gridCols = Math.floor(width / GRID_SIZE);
    this.gridRows = Math.floor(height / GRID_SIZE);
    this.generatePath();
    this.calculatePathCells();
  }
}
