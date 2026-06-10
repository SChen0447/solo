import { v4 as uuidv4 } from 'uuid';
import {
  Position,
  ShadowMonster,
  TileType,
  TILE_SIZE,
  MONSTER_PATROL_DURATION,
  MONSTER_CHASE_DURATION,
  VISIBILITY_TRANSITION_TIME,
} from './types';
import { MapGenerator } from './MapGenerator';

export class EntityManager {
  public monsters: ShadowMonster[] = [];
  private tiles: TileType[][];
  private mapSize: number;
  private mapGenerator: MapGenerator;
  private pathCalcThrottle: number = 0;
  private readonly PATH_CALC_INTERVAL = 200;

  constructor(tiles: TileType[][], mapSize: number, mapGenerator: MapGenerator) {
    this.tiles = tiles;
    this.mapSize = mapSize;
    this.mapGenerator = mapGenerator;
  }

  public reset(tiles: TileType[][], mapSize: number, spawnPositions: Position[]): void {
    this.tiles = tiles;
    this.mapSize = mapSize;
    this.monsters = [];
    for (const spawn of spawnPositions) {
      this.spawnMonster(spawn);
    }
  }

  private spawnMonster(position: Position): void {
    const path = this.mapGenerator.generatePatrolPath(this.tiles, position, this.mapSize);
    this.monsters.push({
      id: uuidv4(),
      position: { ...position },
      renderPosition: {
        x: position.x * TILE_SIZE + TILE_SIZE / 2,
        y: position.y * TILE_SIZE + TILE_SIZE / 2,
      },
      path,
      pathIndex: 0,
      state: 'patrol',
      visibility: 0,
      moveTimer: 0,
      pulseTimer: 0,
      pulseActive: false,
    });
  }

  public update(
    deltaTime: number,
    playerPos: Position,
    playerRenderPos: Position,
    playerLightRadius: number
  ): void {
    this.pathCalcThrottle += deltaTime;

    for (const monster of this.monsters) {
      this.updateVisibility(monster, playerRenderPos, playerLightRadius, deltaTime);
      this.updateMonsterState(monster, playerPos);

      const moveInterval = monster.state === 'chase' ? MONSTER_CHASE_DURATION : MONSTER_PATROL_DURATION;
      monster.moveTimer += deltaTime;

      if (monster.moveTimer >= moveInterval) {
        monster.moveTimer = 0;
        this.moveMonster(monster, playerPos);
      }

      this.updateRenderPosition(monster, moveInterval);

      if (monster.state === 'chase') {
        monster.pulseTimer += deltaTime;
        if (monster.pulseTimer >= 800) {
          monster.pulseTimer = 0;
          monster.pulseActive = true;
        } else if (monster.pulseTimer >= 800) {
          monster.pulseActive = false;
        }
      } else {
        monster.pulseActive = false;
        monster.pulseTimer = 0;
      }
    }
  }

  private updateVisibility(
    monster: ShadowMonster,
    playerRenderPos: Position,
    playerLightRadius: number,
    deltaTime: number
  ): void {
    const dx = monster.renderPosition.x - playerRenderPos.x;
    const dy = monster.renderPosition.y - playerRenderPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const isInLight = dist <= playerLightRadius;
    const transitionSpeed = 1000 / VISIBILITY_TRANSITION_TIME;

    if (isInLight) {
      monster.visibility = Math.min(1, monster.visibility + (deltaTime / 1000) * transitionSpeed * 2);
    } else {
      monster.visibility = Math.max(0, monster.visibility - (deltaTime / 1000) * transitionSpeed * 2);
    }
  }

  private updateMonsterState(monster: ShadowMonster, playerPos: Position): void {
    const dist = Math.abs(monster.position.x - playerPos.x) + Math.abs(monster.position.y - playerPos.y);

    if (monster.state === 'patrol' && dist <= 3) {
      monster.state = 'chase';
    } else if (monster.state === 'chase' && dist > 6) {
      monster.state = 'patrol';
      monster.pathIndex = 0;
    }
  }

  private moveMonster(monster: ShadowMonster, playerPos: Position): void {
    if (monster.state === 'chase') {
      this.chaseMove(monster, playerPos);
    } else {
      this.patrolMove(monster);
    }
  }

  private chaseMove(monster: ShadowMonster, playerPos: Position): void {
    const dx = playerPos.x - monster.position.x;
    const dy = playerPos.y - monster.position.y;
    const candidates: { x: number; y: number; priority: number }[] = [];

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx !== 0) candidates.push({ x: monster.position.x + Math.sign(dx), y: monster.position.y, priority: 2 });
      if (dy !== 0) candidates.push({ x: monster.position.x, y: monster.position.y + Math.sign(dy), priority: 1 });
    } else {
      if (dy !== 0) candidates.push({ x: monster.position.x, y: monster.position.y + Math.sign(dy), priority: 2 });
      if (dx !== 0) candidates.push({ x: monster.position.x + Math.sign(dx), y: monster.position.y, priority: 1 });
    }

    candidates.sort((a, b) => b.priority - a.priority);

    for (const c of candidates) {
      if (this.mapGenerator.isWalkable(this.tiles, c.x, c.y)) {
        monster.position = { x: c.x, y: c.y };
        return;
      }
    }
  }

  private patrolMove(monster: ShadowMonster): void {
    if (monster.path.length === 0) return;

    monster.pathIndex = (monster.pathIndex + 1) % monster.path.length;
    const nextPos = monster.path[monster.pathIndex];

    if (this.mapGenerator.isWalkable(this.tiles, nextPos.x, nextPos.y)) {
      monster.position = { ...nextPos };
    } else {
      const dirs = [
        { x: 0, y: -1 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
      ].sort(() => Math.random() - 0.5);

      for (const d of dirs) {
        const nx = monster.position.x + d.x;
        const ny = monster.position.y + d.y;
        if (this.mapGenerator.isWalkable(this.tiles, nx, ny)) {
          monster.position = { x: nx, y: ny };
          break;
        }
      }
    }
  }

  private updateRenderPosition(monster: ShadowMonster, moveInterval: number): void {
    const targetX = monster.position.x * TILE_SIZE + TILE_SIZE / 2;
    const targetY = monster.position.y * TILE_SIZE + TILE_SIZE / 2;
    const progress = Math.min(monster.moveTimer / moveInterval, 1);
    const easeProgress = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    const fromX = monster.renderPosition.x;
    const fromY = monster.renderPosition.y;

    monster.renderPosition.x = fromX + (targetX - fromX) * easeProgress * 0.3;
    monster.renderPosition.y = fromY + (targetY - fromY) * easeProgress * 0.3;

    if (progress >= 0.95) {
      monster.renderPosition.x = targetX;
      monster.renderPosition.y = targetY;
    }
  }

  public checkCollision(playerGridPos: Position): ShadowMonster | null {
    for (const monster of this.monsters) {
      if (monster.position.x === playerGridPos.x && monster.position.y === playerGridPos.y) {
        return monster;
      }
    }
    return null;
  }
}
