import {
  generateDungeon,
  GeneratedMap,
  MAP_SIZE,
  TILE_SIZE,
} from './mapGenerator';
import {
  createPlayer,
  tryMovePlayer,
  updatePlayerAnimation,
  teleportToStart,
  isPlayerDead,
  allKeysCollected,
  PlayerState,
  Direction,
  INITIAL_HEALTH,
} from './player';
import {
  createRenderState,
  render,
  renderHearts,
  renderKeys,
  renderSteps,
  showOverlay,
  hideOverlay,
  updateGuards,
  triggerDamageFlash,
  triggerExitAnimation,
  RenderState,
} from './renderer';

const CANVAS_WIDTH = MAP_SIZE * TILE_SIZE;
const CANVAS_HEIGHT = MAP_SIZE * TILE_SIZE;

let mapData: GeneratedMap;
let player: PlayerState;
let renderState: RenderState;
let ctx: CanvasRenderingContext2D;
let exitOpen = false;
let gameRunning = true;
let lastFrameTime = 0;
let pressedKeys: Set<string> = new Set();

function initGame(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  mapData = generateDungeon();
  player = createPlayer(mapData.playerStart.x, mapData.playerStart.y);
  renderState = createRenderState(CANVAS_WIDTH, CANVAS_HEIGHT);
  exitOpen = false;
  gameRunning = true;

  hideOverlay();
  updateHUD();
}

function updateHUD(): void {
  const heartsContainer = document.getElementById('hearts')!;
  const keysCount = document.getElementById('keys-count')!;
  const stepsCount = document.getElementById('steps-count')!;

  renderHearts(heartsContainer, player.health, INITIAL_HEALTH);
  renderKeys(keysCount, player.keys);
  renderSteps(stepsCount, player.steps);
}

function handleKeyDown(e: KeyboardEvent): void {
  if (!gameRunning) return;

  const key = e.key.toLowerCase();
  pressedKeys.add(key);

  let direction: Direction | null = null;

  if (key === 'w' || key === 'arrowup') direction = 'up';
  else if (key === 's' || key === 'arrowdown') direction = 'down';
  else if (key === 'a' || key === 'arrowleft') direction = 'left';
  else if (key === 'd' || key === 'arrowright') direction = 'right';

  if (direction) {
    e.preventDefault();
    processMove(direction);
  }
}

function handleKeyUp(e: KeyboardEvent): void {
  pressedKeys.delete(e.key.toLowerCase());
}

function processMove(direction: Direction): void {
  if (!gameRunning) return;

  const currentTime = performance.now();
  const result = tryMovePlayer(player, direction, mapData, currentTime);

  if (result.moved) {
    updateHUD();

    if (result.collectedKey) {
      if (allKeysCollected(player)) {
        exitOpen = true;
        triggerExitAnimation(renderState, currentTime);
      }
    }

    if (result.steppedOnTrap || result.hitGuard) {
      triggerDamageFlash(renderState, currentTime);
      if (result.hitGuard) {
        teleportToStart(player);
      }
      updateHUD();

      if (isPlayerDead(player)) {
        gameRunning = false;
        showOverlay('游戏结束', player.steps, '#EF4444');
        return;
      }
    }

    if (result.reachedExit && exitOpen) {
      gameRunning = false;
      showOverlay('逃脱成功！', player.steps, '#FFD700');
      return;
    }
  }
}

function processContinuousMovement(): void {
  if (!gameRunning || player.isMoving) return;

  const currentTime = performance.now();
  for (const key of pressedKeys) {
    let direction: Direction | null = null;
    if (key === 'w' || key === 'arrowup') direction = 'up';
    else if (key === 's' || key === 'arrowdown') direction = 'down';
    else if (key === 'a' || key === 'arrowleft') direction = 'left';
    else if (key === 'd' || key === 'arrowright') direction = 'right';

    if (direction) {
      processMove(direction);
      break;
    }
  }
}

function gameLoop(timestamp: number): void {
  if (lastFrameTime === 0) lastFrameTime = timestamp;
  const deltaTime = timestamp - lastFrameTime;
  lastFrameTime = timestamp;

  if (gameRunning) {
    processContinuousMovement();
    updatePlayerAnimation(player, deltaTime);

    const currentTime = performance.now();
    const guardHit = updateGuards(mapData, player, currentTime);
    if (guardHit) {
      player.health--;
      triggerDamageFlash(renderState, currentTime);
      teleportToStart(player);
      updateHUD();

      if (isPlayerDead(player)) {
        gameRunning = false;
        showOverlay('游戏结束', player.steps, '#EF4444');
      }
    }

    if (player.x === mapData.exitPosition.x && player.y === mapData.exitPosition.y && exitOpen) {
      gameRunning = false;
      showOverlay('逃脱成功！', player.steps, '#FFD700');
    }
  }

  render(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, mapData, player, timestamp, renderState, exitOpen);

  requestAnimationFrame(gameLoop);
}

function setupRestartButton(): void {
  const restartBtn = document.getElementById('restart-btn')!;
  restartBtn.addEventListener('click', () => {
    initGame();
    lastFrameTime = 0;
  });
}

function main(): void {
  initGame();

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  setupRestartButton();

  requestAnimationFrame(gameLoop);
}

main();
