import { v4 as uuidv4 } from 'uuid';
import {
  Enemy, EnemyType, EnemyConfig, Vec2, GridPos,
  Projectile, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT,
  BASE_POS, SPAWN_POSITIONS, GameState
} from './types';
import { MapGenerator } from './MapGenerator';
import { TowerManager } from './TowerManager';

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  [EnemyType.SOLDIER]: {
    name: '普通士兵',
    type: EnemyType.SOLDIER,
    color: '#8b4513',
    hp: 50,
    speed: 60,
    reward: 10,
    size: 14
  },
  [EnemyType.KNIGHT]: {
    name: '重甲骑士',
    type: EnemyType.KNIGHT,
    color: '#555555',
    hp: 180,
    speed: 35,
    reward: 25,
    size: 18
  },
  [EnemyType.SCOUT]: {
    name: '快速斥候',
    type: EnemyType.SCOUT,
    color: '#ff9800',
    hp: 30,
    speed: 110,
    reward: 15,
    size: 11
  },
  [EnemyType.BOSS]: {
    name: 'Boss巨魔',
    type: EnemyType.BOSS,
    color: '#4a148c',
    hp: 800,
    speed: 30,
    reward: 150,
    size: 26
  }
};

interface PathNode {
  pos: GridPos;
  g: number;
  f: number;
  parent: PathNode | null;
}

export class EnemyManager {
  public enemies: Enemy[] = [];
  private spawnQueue: { type: EnemyType; spawnPos: GridPos; delay: number }[] = [];
  private waveSpawnTimer: number = 0;
  private pathfindCache: Map<string, { path: Vec2[]; timestamp: number }> = new Map();
  private pathfindCooldown: Map<string, number> = new Map();

  public spawnWave(wave: number): number {
    this.spawnQueue = [];
    const baseCount = 5 + wave * 2;

    for (let i = 0; i < baseCount; i++) {
      let type = EnemyType.SOLDIER;
      const rand = Math.random();

      if (wave >= 3 && rand < 0.2) type = EnemyType.SCOUT;
      if (wave >= 5 && rand >= 0.2 && rand < 0.35) type = EnemyType.KNIGHT;
      if (wave >= 10 && wave % 5 === 0 && i === 0) type = EnemyType.BOSS;

      const spawnPos = SPAWN_POSITIONS[i % SPAWN_POSITIONS.length];
      this.spawnQueue.push({
        type,
        spawnPos,
        delay: i * 0.8
      });
    }

    this.waveSpawnTimer = 0;
    return this.spawnQueue.length;
  }

  public update(
    deltaTime: number,
    mapGenerator: MapGenerator,
    towerManager: TowerManager,
    state: GameState
  ): void {
    this.waveSpawnTimer += deltaTime;
    while (this.spawnQueue.length > 0 && this.spawnQueue[0].delay <= this.waveSpawnTimer) {
      const spawn = this.spawnQueue.shift()!;
      this.spawnEnemy(spawn.type, spawn.spawnPos, mapGenerator, towerManager, state.wave);
    }

    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.reachedBase) continue;

      if (enemy.slowTimer > 0) {
        enemy.slowTimer -= deltaTime;
        if (enemy.slowTimer <= 0) {
          enemy.slowMultiplier = 1;
        }
      }

      this.requestPath(enemy, mapGenerator, towerManager);
      this.moveEnemy(enemy, deltaTime, mapGenerator);

      const baseX = BASE_POS.col * TILE_SIZE + TILE_SIZE / 2;
      const baseY = BASE_POS.row * TILE_SIZE + TILE_SIZE / 2;
      const dx = baseX - enemy.pos.x;
      const dy = baseY - enemy.pos.y;
      if (Math.sqrt(dx * dx + dy * dy) < TILE_SIZE * 0.5) {
        enemy.reachedBase = true;
        state.hp = Math.max(0, state.hp - this.getDamage(enemy));
      }
    }

    this.enemies = this.enemies.filter(e => !e.dead && !e.reachedBase);
  }

  private getDamage(enemy: Enemy): number {
    switch (enemy.type) {
      case EnemyType.BOSS: return 5;
      case EnemyType.KNIGHT: return 2;
      default: return 1;
    }
  }

  private spawnEnemy(type: EnemyType, spawnPos: GridPos, mapGenerator: MapGenerator, towerManager: TowerManager, wave: number): void {
    const config = ENEMY_CONFIGS[type];
    const hpMultiplier = 1 + wave * 0.08;

    const enemy: Enemy = {
      id: uuidv4(),
      type,
      pos: {
        x: spawnPos.col * TILE_SIZE + TILE_SIZE / 2,
        y: spawnPos.row * TILE_SIZE + TILE_SIZE / 2
      },
      hp: config.hp * hpMultiplier,
      maxHp: config.hp * hpMultiplier,
      baseSpeed: config.speed,
      slowMultiplier: 1,
      slowTimer: 0,
      path: [],
      pathIndex: 0,
      reward: config.reward,
      size: config.size,
      reachedBase: false,
      dead: false,
      spawnPos
    };

    this.enemies.push(enemy);
    this.requestPath(enemy, mapGenerator, towerManager, true);
  }

  private getPathCacheKey(spawnPos: GridPos, towerManager: TowerManager): string {
    const occupied = Array.from(towerManager.occupiedCells).sort().join('|');
    return `${spawnPos.col},${spawnPos.row}->${BASE_POS.col},${BASE_POS.row}|${occupied}`;
  }

  private requestPath(enemy: Enemy, mapGenerator: MapGenerator, towerManager: TowerManager, force = false): void {
    const key = this.getPathCacheKey(enemy.spawnPos, towerManager);
    const now = performance.now();

    if (!force) {
      const cooldown = this.pathfindCooldown.get(enemy.id) ?? 0;
      if (now - cooldown < 500) return;
    }

    if (!force) {
      const cached = this.pathfindCache.get(key);
      if (cached && now - cached.timestamp < 1000) {
        enemy.path = cached.path;
        this.updatePathIndex(enemy);
        return;
      }
    }

    this.pathfindCooldown.set(enemy.id, now);

    const startCol = Math.floor(enemy.pos.x / TILE_SIZE);
    const startRow = Math.floor(enemy.pos.y / TILE_SIZE);
    const start: GridPos = { col: startCol, row: startRow };

    const path = this.findPathAStar(start, BASE_POS, mapGenerator, towerManager);
    if (path && path.length > 0) {
      const smoothPath: Vec2[] = path.map(p => ({
        x: p.col * TILE_SIZE + TILE_SIZE / 2,
        y: p.row * TILE_SIZE + TILE_SIZE / 2
      }));
      enemy.path = smoothPath;
      this.pathfindCache.set(key, { path: smoothPath, timestamp: now });
      this.updatePathIndex(enemy);
    }
  }

  private updatePathIndex(enemy: Enemy): void {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < enemy.path.length; i++) {
      const dx = enemy.pos.x - enemy.path[i].x;
      const dy = enemy.pos.y - enemy.path[i].y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    enemy.pathIndex = Math.min(bestIdx + 1, enemy.path.length - 1);
  }

  private moveEnemy(enemy: Enemy, deltaTime: number, mapGenerator: MapGenerator): void {
    if (enemy.path.length === 0 || enemy.pathIndex >= enemy.path.length) return;

    const target = enemy.path[enemy.pathIndex];
    const dx = target.x - enemy.pos.x;
    const dy = target.y - enemy.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2) {
      enemy.pathIndex++;
      return;
    }

    const tileCol = Math.floor(enemy.pos.x / TILE_SIZE);
    const tileRow = Math.floor(enemy.pos.y / TILE_SIZE);
    const terrainMult = mapGenerator.getSpeedMultiplier(tileCol, tileRow);

    const speed = enemy.baseSpeed * enemy.slowMultiplier * terrainMult;
    const step = speed * deltaTime;

    enemy.pos.x += (dx / dist) * step;
    enemy.pos.y += (dy / dist) * step;
  }

  private findPathAStar(
    start: GridPos,
    goal: GridPos,
    mapGenerator: MapGenerator,
    towerManager: TowerManager
  ): GridPos[] | null {
    const key = (p: GridPos) => `${p.col},${p.row}`;
    const h = (a: GridPos) => Math.abs(a.col - goal.col) + Math.abs(a.row - goal.row);
    const towerBlocked = towerManager.occupiedCells;

    const open: PathNode[] = [];
    const closed = new Set<string>();
    const nodes = new Map<string, PathNode>();

    const startNode: PathNode = { pos: start, g: 0, f: h(start), parent: null };
    open.push(startNode);
    nodes.set(key(start), startNode);

    let iterations = 0;
    const maxIterations = MAP_WIDTH * MAP_HEIGHT * 4;

    while (open.length > 0 && iterations < maxIterations) {
      iterations++;
      open.sort((a, b) => a.f - b.f);
      const current = open.shift()!;
      const cKey = key(current.pos);

      if (current.pos.col === goal.col && current.pos.row === goal.row) {
        const result: GridPos[] = [];
        let n: PathNode | null = current;
        while (n) {
          result.unshift(n.pos);
          n = n.parent;
        }
        return result;
      }

      closed.add(cKey);

      const neighbors: GridPos[] = [
        { col: current.pos.col + 1, row: current.pos.row },
        { col: current.pos.col - 1, row: current.pos.row },
        { col: current.pos.col, row: current.pos.row + 1 },
        { col: current.pos.col, row: current.pos.row - 1 }
      ];

      for (const nPos of neighbors) {
        if (nPos.col < 0 || nPos.col >= MAP_WIDTH || nPos.row < 0 || nPos.row >= MAP_HEIGHT) continue;
        const nKey = key(nPos);
        if (closed.has(nKey)) continue;
        if (!mapGenerator.isWalkable(nPos.col, nPos.row)) continue;
        if (towerBlocked.has(nKey) && !(nPos.col === goal.col && nPos.row === goal.row)) continue;

        const moveCost = mapGenerator.getCell(nPos.col, nPos.row)?.type === 1 ? 3 : 1;
        const tentativeG = current.g + moveCost;
        const existing = nodes.get(nKey);

        if (!existing || tentativeG < existing.g) {
          const node: PathNode = {
            pos: nPos,
            g: tentativeG,
            f: tentativeG + h(nPos),
            parent: current
          };
          nodes.set(nKey, node);
          if (!existing) open.push(node);
        }
      }
    }

    return null;
  }

  public applyProjectileDamage(projectile: Projectile, state: GameState, _towerManager: TowerManager): boolean {
    if (projectile.splashRadius) {
      for (const enemy of this.enemies) {
        if (enemy.dead || enemy.reachedBase) continue;
        const dx = enemy.pos.x - projectile.targetPos.x;
        const dy = enemy.pos.y - projectile.targetPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= projectile.splashRadius) {
          const falloff = 1 - (dist / projectile.splashRadius) * 0.5;
          this.damageEnemy(enemy, projectile.damage * falloff, state, towerManager);
        }
      }
    } else {
      const target = this.enemies.find(e => e.id === projectile.targetId);
      if (target && !target.dead && !target.reachedBase) {
        this.damageEnemy(target, projectile.damage, state, towerManager);
        if (projectile.slowAmount && projectile.slowDuration) {
          target.slowMultiplier = Math.min(target.slowMultiplier, 1 - projectile.slowAmount);
          target.slowTimer = Math.max(target.slowTimer, projectile.slowDuration);
        }
      }
    }
    return true;
  }

  private damageEnemy(enemy: Enemy, damage: number, state: GameState, _towerManager: TowerManager): void {
    enemy.hp -= damage;
    if (enemy.hp <= 0) {
      enemy.dead = true;
      state.gold += enemy.reward;
    }
  }

  public clearPathCache(): void {
    this.pathfindCache.clear();
  }

  public reset(): void {
    this.enemies = [];
    this.spawnQueue = [];
    this.pathfindCache.clear();
    this.pathfindCooldown.clear();
    this.waveSpawnTimer = 0;
  }

  public getActiveCount(): number {
    return this.enemies.length + this.spawnQueue.length;
  }
}
