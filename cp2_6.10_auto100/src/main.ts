import { DungeonGenerator } from './dungeon';
import { MapRenderer } from './mapRenderer';
import { AutoMapRenderer } from './autoMap';

const MAP_WIDTH = 24;
const MAP_HEIGHT = 18;
const TILE_SIZE = 32;
const MOVE_COOLDOWN = 200;

const exploredTiles: Set<string> = new Set();

const dungeon = new DungeonGenerator(MAP_WIDTH, MAP_HEIGHT);
dungeon.generate(5 + Math.floor(Math.random() * 4));

const centerRoom = dungeon.getCenterRoom();
let playerX = centerRoom.centerX;
let playerY = centerRoom.centerY;

const mainCanvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
const autoMapCanvas = document.getElementById('autoMapCanvas') as HTMLCanvasElement;
const toggleFogBtn = document.getElementById('toggleFogBtn') as HTMLButtonElement;
const gameTimeEl = document.getElementById('gameTime') as HTMLSpanElement;
const exploreProgressEl = document.getElementById('exploreProgress') as HTMLDivElement;
const explorePercentEl = document.getElementById('explorePercent') as HTMLSpanElement;
const perfMetricEl = document.getElementById('perfMetric') as HTMLSpanElement;

mainCanvas.width = MAP_WIDTH * TILE_SIZE;
mainCanvas.height = MAP_HEIGHT * TILE_SIZE;
autoMapCanvas.width = MAP_WIDTH * 4;
autoMapCanvas.height = MAP_HEIGHT * 4;

const mapRenderer = new MapRenderer(
  mainCanvas,
  dungeon.tiles,
  exploredTiles,
  MAP_WIDTH,
  MAP_HEIGHT,
  playerX,
  playerY
);

const autoMapRenderer = new AutoMapRenderer(
  autoMapCanvas,
  dungeon.tiles,
  exploredTiles,
  MAP_WIDTH,
  MAP_HEIGHT
);

const initialVision = mapRenderer.updateVision();
autoMapRenderer.updateVisible(mapRenderer.getVisibleTiles());
updatePerfMetric(initialVision.computeTime);

const startTime = performance.now();
let lastMoveTime = 0;
let pendingMoves: Array<{ dx: number; dy: number }> = [];

const walkableTotal = dungeon.getWalkableCount();
let lastStatsUpdate = 0;
let lastComputeTime = initialVision.computeTime;

function gameLoop(timestamp: number): void {
  if (!mapRenderer.isTransitioning() && pendingMoves.length > 0) {
    if (timestamp - lastMoveTime >= MOVE_COOLDOWN) {
      const move = pendingMoves.shift()!;
      tryMove(move.dx, move.dy);
      lastMoveTime = timestamp;
    }
  }

  mapRenderer.render();

  if (timestamp - lastStatsUpdate >= 200) {
    updateStats(timestamp);
    lastStatsUpdate = timestamp;
  }

  requestAnimationFrame(gameLoop);
}

function tryMove(dx: number, dy: number): void {
  const newX = playerX + dx;
  const newY = playerY + dy;

  if (!dungeon.isWalkable(newX, newY)) return;

  playerX = newX;
  playerY = newY;
  mapRenderer.setPlayerPosition(playerX, playerY, true);

  const result = mapRenderer.updateVision();
  lastComputeTime = result.computeTime;
  updatePerfMetric(result.computeTime);
  autoMapRenderer.updateVisible(mapRenderer.getVisibleTiles());
}

function updateStats(timestamp: number): void {
  const elapsed = Math.floor((timestamp - startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  gameTimeEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const exploredCount = mapRenderer.getExploredCount();
  const percent = Math.min(100, Math.round((exploredCount / walkableTotal) * 100));
  exploreProgressEl.style.width = `${percent}%`;
  explorePercentEl.textContent = `${percent}%`;
}

function updatePerfMetric(time: number): void {
  perfMetricEl.textContent = `${time.toFixed(1)}ms`;
  perfMetricEl.classList.remove('perf-good', 'perf-mid', 'perf-bad');
  if (time < 4) {
    perfMetricEl.classList.add('perf-good');
  } else if (time <= 6) {
    perfMetricEl.classList.add('perf-mid');
  } else {
    perfMetricEl.classList.add('perf-bad');
  }
}

function handleKeyDown(e: KeyboardEvent): void {
  let dx = 0, dy = 0;
  switch (e.key.toLowerCase()) {
    case 'w':
    case 'arrowup':
      dy = -1;
      break;
    case 's':
    case 'arrowdown':
      dy = 1;
      break;
    case 'a':
    case 'arrowleft':
      dx = -1;
      break;
    case 'd':
    case 'arrowright':
      dx = 1;
      break;
    default:
      return;
  }

  e.preventDefault();

  if (mapRenderer.isTransitioning()) {
    pendingMoves.push({ dx, dy });
    return;
  }

  const now = performance.now();
  if (now - lastMoveTime >= MOVE_COOLDOWN) {
    tryMove(dx, dy);
    lastMoveTime = now;
  }
}

toggleFogBtn.addEventListener('click', () => {
  const newState = !mapRenderer.isFogEnabled();
  mapRenderer.startFogTransition(newState);
  toggleFogBtn.textContent = newState ? '切换迷雾显示' : '切换迷雾显示';
});

document.addEventListener('keydown', handleKeyDown);

requestAnimationFrame(gameLoop);
