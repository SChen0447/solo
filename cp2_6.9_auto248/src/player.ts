import { TileType, TILE_SIZE, isWalkable, GeneratedMap, Guard } from './mapGenerator';

export interface PlayerState {
  x: number;
  y: number;
  renderX: number;
  renderY: number;
  targetRenderX: number;
  targetRenderY: number;
  health: number;
  keys: number;
  steps: number;
  lastMoveTime: number;
  startX: number;
  startY: number;
  isMoving: boolean;
  moveProgress: number;
}

export const MOVE_INTERVAL = 150;
export const INITIAL_HEALTH = 3;
export const TOTAL_KEYS = 3;
export const PLAYER_SIZE = 8;

export function createPlayer(startX: number, startY: number): PlayerState {
  return {
    x: startX,
    y: startY,
    renderX: startX * TILE_SIZE + (TILE_SIZE - PLAYER_SIZE) / 2,
    renderY: startY * TILE_SIZE + (TILE_SIZE - PLAYER_SIZE) / 2,
    targetRenderX: startX * TILE_SIZE + (TILE_SIZE - PLAYER_SIZE) / 2,
    targetRenderY: startY * TILE_SIZE + (TILE_SIZE - PLAYER_SIZE) / 2,
    health: INITIAL_HEALTH,
    keys: 0,
    steps: 0,
    lastMoveTime: 0,
    startX,
    startY,
    isMoving: false,
    moveProgress: 1,
  };
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface MoveResult {
  moved: boolean;
  collectedKey: boolean;
  steppedOnTrap: boolean;
  reachedExit: boolean;
  hitGuard: boolean;
}

export function tryMovePlayer(
  player: PlayerState,
  direction: Direction,
  mapData: GeneratedMap,
  currentTime: number
): MoveResult {
  const result: MoveResult = {
    moved: false,
    collectedKey: false,
    steppedOnTrap: false,
    reachedExit: false,
    hitGuard: false,
  };

  if (player.isMoving) return result;
  if (currentTime - player.lastMoveTime < MOVE_INTERVAL) return result;

  let dx = 0;
  let dy = 0;

  switch (direction) {
    case 'up':
      dy = -1;
      break;
    case 'down':
      dy = 1;
      break;
    case 'left':
      dx = -1;
      break;
    case 'right':
      dx = 1;
      break;
  }

  const newX = player.x + dx;
  const newY = player.y + dy;

  if (!isWalkable(mapData.map, newX, newY)) {
    return result;
  }

  result.moved = true;
  player.x = newX;
  player.y = newY;
  player.steps++;
  player.lastMoveTime = currentTime;
  player.isMoving = true;
  player.moveProgress = 0;
  player.targetRenderX = newX * TILE_SIZE + (TILE_SIZE - PLAYER_SIZE) / 2;
  player.targetRenderY = newY * TILE_SIZE + (TILE_SIZE - PLAYER_SIZE) / 2;

  const tile = mapData.map[newY][newX];

  if (tile === TileType.KEY) {
    result.collectedKey = true;
    player.keys++;
    mapData.map[newY][newX] = TileType.FLOOR;
    const keyIdx = mapData.keyPositions.findIndex((k) => k.x === newX && k.y === newY);
    if (keyIdx !== -1) {
      mapData.keyPositions.splice(keyIdx, 1);
    }
  }

  if (tile === TileType.TRAP) {
    result.steppedOnTrap = true;
    player.health--;
  }

  if (tile === TileType.EXIT) {
    result.reachedExit = true;
  }

  for (const guard of mapData.guards) {
    if (guard.x === newX && guard.y === newY) {
      result.hitGuard = true;
      player.health--;
      break;
    }
  }

  return result;
}

export function updatePlayerAnimation(player: PlayerState, deltaTime: number): void {
  if (player.isMoving) {
    player.moveProgress += deltaTime / MOVE_INTERVAL;
    if (player.moveProgress >= 1) {
      player.moveProgress = 1;
      player.isMoving = false;
      player.renderX = player.targetRenderX;
      player.renderY = player.targetRenderY;
    } else {
      const startX = player.targetRenderX - (player.targetRenderX - (player.x === Math.round(player.renderX / TILE_SIZE) ? player.renderX : player.renderX));
      const startY = player.targetRenderY - (player.targetRenderY - (player.y === Math.round(player.renderY / TILE_SIZE) ? player.renderY : player.renderY));
      player.renderX = player.renderX + (player.targetRenderX - player.renderX) * (deltaTime / MOVE_INTERVAL);
      player.renderY = player.renderY + (player.targetRenderY - player.renderY) * (deltaTime / MOVE_INTERVAL);
    }
  }
}

export function teleportToStart(player: PlayerState): void {
  player.x = player.startX;
  player.y = player.startY;
  player.renderX = player.startX * TILE_SIZE + (TILE_SIZE - PLAYER_SIZE) / 2;
  player.renderY = player.startY * TILE_SIZE + (TILE_SIZE - PLAYER_SIZE) / 2;
  player.targetRenderX = player.renderX;
  player.targetRenderY = player.renderY;
  player.isMoving = false;
  player.moveProgress = 1;
}

export function checkGuardCollision(player: PlayerState, guards: Guard[]): boolean {
  for (const guard of guards) {
    const dx = Math.abs(player.x - guard.x);
    const dy = Math.abs(player.y - guard.y);
    if (dx <= 0 && dy <= 0) {
      return true;
    }
  }
  return false;
}

export function isPlayerDead(player: PlayerState): boolean {
  return player.health <= 0;
}

export function allKeysCollected(player: PlayerState): boolean {
  return player.keys >= TOTAL_KEYS;
}
