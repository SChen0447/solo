import { Position, checkWall, getStartPos, isTrap, collectKey, getCollectedKeyCount, getEndPos } from './map';

export interface HistoryStep {
  x: number;
  y: number;
  timestamp: number;
}

export const MOVE_DURATION = 200;
export const MAX_HISTORY_STEPS = 10;
export const REWIND_STEP_INTERVAL = 80;

export type PlayerStatus = 'idle' | 'moving' | 'rewinding' | 'flash';

export interface PlayerState {
  x: number;
  y: number;
  renderX: number;
  renderY: number;
  status: PlayerStatus;
  moveProgress: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  moveStartTime: number;
  history: HistoryStep[];
  rewindIndex: number;
  rewindStepTime: number;
  rewindRenderX: number;
  rewindRenderY: number;
  flashStartTime: number;
}

export function createPlayer(): PlayerState {
  const start = getStartPos();
  return {
    x: start.x,
    y: start.y,
    renderX: start.x,
    renderY: start.y,
    status: 'idle',
    moveProgress: 0,
    fromX: start.x,
    fromY: start.y,
    toX: start.x,
    toY: start.y,
    moveStartTime: 0,
    history: [],
    rewindIndex: 0,
    rewindStepTime: 0,
    rewindRenderX: start.x,
    rewindRenderY: start.y,
    flashStartTime: 0
  };
}

export function resetPlayer(player: PlayerState): void {
  const start = getStartPos();
  player.x = start.x;
  player.y = start.y;
  player.renderX = start.x;
  player.renderY = start.y;
  player.status = 'idle';
  player.moveProgress = 0;
  player.fromX = start.x;
  player.fromY = start.y;
  player.toX = start.x;
  player.toY = start.y;
  player.history = [];
  player.rewindIndex = 0;
}

function addHistory(player: PlayerState): void {
  player.history.push({
    x: player.x,
    y: player.y,
    timestamp: performance.now()
  });
  if (player.history.length > MAX_HISTORY_STEPS) {
    player.history.shift();
  }
}

function trimHistory(player: PlayerState): void {
  const now = performance.now();
  const fiveSecondsAgo = now - 5000;
  while (player.history.length > 0 && player.history[0].timestamp < fiveSecondsAgo) {
    player.history.shift();
  }
}

export interface MoveResult {
  moved: boolean;
  hitWall: boolean;
  hitTrap: boolean;
  collectedKey: boolean;
  reachedEnd: boolean;
  allKeysCollected: boolean;
}

export function movePlayer(player: PlayerState, dx: number, dy: number, now: number): MoveResult {
  if (player.status !== 'idle') {
    return { moved: false, hitWall: false, hitTrap: false, collectedKey: false, reachedEnd: false, allKeysCollected: false };
  }

  const newX = player.x + dx;
  const newY = player.y + dy;

  if (checkWall(newX, newY)) {
    player.status = 'flash';
    player.flashStartTime = now;
    return { moved: false, hitWall: true, hitTrap: false, collectedKey: false, reachedEnd: false, allKeysCollected: false };
  }

  player.fromX = player.x;
  player.fromY = player.y;
  player.toX = newX;
  player.toY = newY;
  player.moveStartTime = now;
  player.status = 'moving';
  player.x = newX;
  player.y = newY;

  addHistory(player);
  trimHistory(player);

  const gotKey = collectKey(newX, newY);
  const keysCount = getCollectedKeyCount();
  const endPos = getEndPos();
  const atEnd = newX === endPos.x && newY === endPos.y;
  const hitTrapCell = isTrap(newX, newY);

  return {
    moved: true,
    hitWall: false,
    hitTrap: hitTrapCell,
    collectedKey: gotKey,
    reachedEnd: atEnd && keysCount >= 3,
    allKeysCollected: keysCount >= 3
  };
}

export function updatePlayer(player: PlayerState, now: number): void {
  if (player.status === 'moving') {
    const elapsed = now - player.moveStartTime;
    const progress = Math.min(1, elapsed / MOVE_DURATION);
    player.moveProgress = easeOutQuad(progress);
    player.renderX = player.fromX + (player.toX - player.fromX) * player.moveProgress;
    player.renderY = player.fromY + (player.toY - player.fromY) * player.moveProgress;
    if (progress >= 1) {
      player.status = 'idle';
      player.renderX = player.toX;
      player.renderY = player.toY;
    }
  } else if (player.status === 'rewinding') {
    updateRewind(player, now);
  } else if (player.status === 'flash') {
    if (now - player.flashStartTime > 500) {
      player.status = 'idle';
    }
  }
}

function easeOutQuad(t: number): number {
  return t * (2 - t);
}

export function canTriggerRewind(player: PlayerState, energy: number): boolean {
  if (player.status !== 'idle' && player.status !== 'flash') return false;
  if (energy < 20) return false;
  if (player.history.length < 1) return false;
  return true;
}

export function triggerRewind(player: PlayerState, now: number): boolean {
  if (player.history.length < 1) {
    player.status = 'flash';
    player.flashStartTime = now;
    return false;
  }
  player.status = 'rewinding';
  player.rewindIndex = player.history.length - 1;
  player.rewindStepTime = now;
  player.rewindRenderX = player.x;
  player.rewindRenderY = player.y;
  return true;
}

function updateRewind(player: PlayerState, now: number): void {
  if (player.rewindIndex < 0) {
    finishRewind(player);
    return;
  }

  const target = player.history[player.rewindIndex];
  const elapsed = now - player.rewindStepTime;
  const progress = Math.min(1, elapsed / REWIND_STEP_INTERVAL);
  const prevX = player.rewindIndex < player.history.length - 1
    ? player.history[player.rewindIndex + 1].x
    : player.x;
  const prevY = player.rewindIndex < player.history.length - 1
    ? player.history[player.rewindIndex + 1].y
    : player.y;

  player.rewindRenderX = prevX + (target.x - prevX) * easeOutQuad(progress);
  player.rewindRenderY = prevY + (target.y - prevY) * easeOutQuad(progress);
  player.renderX = player.rewindRenderX;
  player.renderY = player.rewindRenderY;

  if (progress >= 1) {
    player.rewindIndex--;
    player.rewindStepTime = now;
    if (player.rewindIndex < 0) {
      finishRewind(player);
    }
  }
}

function finishRewind(player: PlayerState): void {
  if (player.history.length > 0) {
    const first = player.history[0];
    player.x = first.x;
    player.y = first.y;
    player.renderX = first.x;
    player.renderY = first.y;
  }
  player.history = [];
  player.status = 'idle';
}

export function getRenderPosition(player: PlayerState): { x: number; y: number } {
  return { x: player.renderX, y: player.renderY };
}
