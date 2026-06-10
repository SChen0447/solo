import { generateMaze, canMove, isDeadEnd, type MazeData } from './maze';
import { Renderer, type RenderState, type TrailPoint } from './renderer';

const MAZE_SIZE = 15;
const MOVE_SPEED_CELLS_PER_SEC = 3;
const MOVE_DURATION_MS = 1000 / MOVE_SPEED_CELLS_PER_SEC;
const BOUNCE_BACK_DISTANCE = 0.1;
const TRAIL_FADE_RATE = 0.02;
const MAX_TRAIL_LENGTH = 50;

type Direction = 'up' | 'down' | 'left' | 'right';

interface GameState {
  maze: MazeData;
  playerGridX: number;
  playerGridY: number;
  isMoving: boolean;
  moveFromX: number;
  moveFromY: number;
  moveToX: number;
  moveToY: number;
  moveStartTime: number;
  steps: number;
  startTime: number;
  elapsedTime: number;
  won: boolean;
  hitFlash: boolean;
  hitFlashEndTime: number;
  bounceBack: boolean;
  bounceBackFromX: number;
  bounceBackFromY: number;
  bounceBackToX: number;
  bounceBackToY: number;
  bounceBackStartTime: number;
  deadEndFlashEndTime: number;
  trail: TrailPoint[];
}

let renderer: Renderer;
let gameState: GameState;
let animationFrameId: number;
let lastFrameTime: number = 0;

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const timerEl = document.getElementById('timer') as HTMLElement;
const stepCountEl = document.getElementById('step-count') as HTMLElement;
const winOverlay = document.getElementById('win-overlay') as HTMLElement;
const winStatsEl = document.getElementById('win-stats') as HTMLElement;
const restartBtn = document.getElementById('restart-btn') as HTMLButtonElement;

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function initGame(): void {
  const maze = generateMaze(MAZE_SIZE, MAZE_SIZE);

  gameState = {
    maze,
    playerGridX: maze.start.x,
    playerGridY: maze.start.y,
    isMoving: false,
    moveFromX: maze.start.x,
    moveFromY: maze.start.y,
    moveToX: maze.start.x,
    moveToY: maze.start.y,
    moveStartTime: 0,
    steps: 0,
    startTime: performance.now(),
    elapsedTime: 0,
    won: false,
    hitFlash: false,
    hitFlashEndTime: 0,
    bounceBack: false,
    bounceBackFromX: 0,
    bounceBackFromY: 0,
    bounceBackToX: 0,
    bounceBackToY: 0,
    bounceBackStartTime: 0,
    deadEndFlashEndTime: 0,
    trail: []
  };

  if (renderer) {
    renderer.setMaze(maze);
  } else {
    renderer = new Renderer(canvas, maze);
  }

  winOverlay.classList.remove('visible');
  updateUI();
}

function updateUI(): void {
  stepCountEl.textContent = gameState.steps.toString();
  if (!gameState.won) {
    timerEl.textContent = formatTime(gameState.elapsedTime);
  }
}

function getDirectionDelta(direction: Direction): { dx: number; dy: number } {
  switch (direction) {
    case 'up': return { dx: 0, dy: -1 };
    case 'down': return { dx: 0, dy: 1 };
    case 'left': return { dx: -1, dy: 0 };
    case 'right': return { dx: 1, dy: 0 };
  }
}

function tryMove(direction: Direction): void {
  if (gameState.isMoving || gameState.bounceBack || gameState.won) return;

  const { dx, dy } = getDirectionDelta(direction);
  const newX = gameState.playerGridX + dx;
  const newY = gameState.playerGridY + dy;

  if (newX < 0 || newX >= gameState.maze.width || newY < 0 || newY >= gameState.maze.height) {
    triggerWallHit(direction);
    return;
  }

  if (!canMove(gameState.maze.grid, gameState.playerGridX, gameState.playerGridY, direction)) {
    triggerWallHit(direction);
    return;
  }

  gameState.isMoving = true;
  gameState.moveFromX = gameState.playerGridX;
  gameState.moveFromY = gameState.playerGridY;
  gameState.moveToX = newX;
  gameState.moveToY = newY;
  gameState.moveStartTime = performance.now();

  gameState.steps++;
  updateUI();

  addTrailPoint(gameState.playerGridX, gameState.playerGridY);
}

function triggerWallHit(direction: Direction): void {
  const { dx, dy } = getDirectionDelta(direction);

  gameState.bounceBack = true;
  gameState.bounceBackFromX = gameState.playerGridX;
  gameState.bounceBackFromY = gameState.playerGridY;
  gameState.bounceBackToX = gameState.playerGridX - dx * BOUNCE_BACK_DISTANCE;
  gameState.bounceBackToY = gameState.playerGridY - dy * BOUNCE_BACK_DISTANCE;
  gameState.bounceBackStartTime = performance.now();

  gameState.hitFlash = true;
  gameState.hitFlashEndTime = performance.now() + 300;
}

function addTrailPoint(x: number, y: number): void {
  gameState.trail.push({ x: x + 0.5, y: y + 0.5, alpha: 1 });
  if (gameState.trail.length > MAX_TRAIL_LENGTH) {
    gameState.trail.shift();
  }
}

function updateTrail(): void {
  for (let i = gameState.trail.length - 1; i >= 0; i--) {
    gameState.trail[i].alpha -= TRAIL_FADE_RATE;
    if (gameState.trail[i].alpha <= 0) {
      gameState.trail.splice(i, 1);
    }
  }
}

function checkDeadEnd(): void {
  if (isDeadEnd(gameState.maze.grid, gameState.playerGridX, gameState.playerGridY)) {
    gameState.deadEndFlashEndTime = performance.now() + 600;
  }
}

function checkWin(): void {
  if (
    gameState.playerGridX === gameState.maze.end.x &&
    gameState.playerGridY === gameState.maze.end.y
  ) {
    gameState.won = true;
    const finalTime = gameState.elapsedTime;
    const finalSteps = gameState.steps;

    winStatsEl.textContent = `用时 ${formatTime(finalTime)}，共走了 ${finalSteps} 步`;
    winOverlay.classList.add('visible');
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function updateGame(currentTime: number): void {
  const dt = currentTime - lastFrameTime;
  lastFrameTime = currentTime;

  if (!gameState.won) {
    gameState.elapsedTime = currentTime - gameState.startTime;
  }

  if (gameState.isMoving) {
    const elapsed = currentTime - gameState.moveStartTime;
    const t = Math.min(elapsed / MOVE_DURATION_MS, 1);
    const easedT = easeOutCubic(t);

    gameState.playerGridX =
      gameState.moveFromX + (gameState.moveToX - gameState.moveFromX) * easedT;
    gameState.playerGridY =
      gameState.moveFromY + (gameState.moveToY - gameState.moveFromY) * easedT;

    if (t >= 1) {
      gameState.isMoving = false;
      gameState.playerGridX = gameState.moveToX;
      gameState.playerGridY = gameState.moveToY;

      addTrailPoint(gameState.playerGridX, gameState.playerGridY);
      checkDeadEnd();
      checkWin();
    }
  }

  if (gameState.bounceBack) {
    const bounceDuration = 150;
    const elapsed = currentTime - gameState.bounceBackStartTime;
    const t = Math.min(elapsed / bounceDuration, 1);

    if (t < 0.5) {
      const forwardT = t * 2;
      gameState.playerGridX =
        gameState.bounceBackFromX + (gameState.bounceBackToX - gameState.bounceBackFromX) * forwardT;
      gameState.playerGridY =
        gameState.bounceBackFromY + (gameState.bounceBackToY - gameState.bounceBackFromY) * forwardT;
    } else {
      const backT = (t - 0.5) * 2;
      gameState.playerGridX =
        gameState.bounceBackToX + (gameState.bounceBackFromX - gameState.bounceBackToX) * backT;
      gameState.playerGridY =
        gameState.bounceBackToY + (gameState.bounceBackFromY - gameState.bounceBackToY) * backT;
    }

    if (t >= 1) {
      gameState.bounceBack = false;
      gameState.playerGridX = gameState.bounceBackFromX;
      gameState.playerGridY = gameState.bounceBackFromY;
    }
  }

  if (gameState.hitFlash && currentTime >= gameState.hitFlashEndTime) {
    gameState.hitFlash = false;
  }

  updateTrail();
  updateUI();
}

function getBounceOffset(currentTime: number): number {
  if (!gameState.isMoving && !gameState.bounceBack) return 0;
  const t = (currentTime % 300) / 300;
  return Math.sin(t * Math.PI * 2) * 0.3;
}

function render(currentTime: number): void {
  const renderState: RenderState = {
    playerX: gameState.playerGridX,
    playerY: gameState.playerGridY,
    bounceOffset: getBounceOffset(currentTime),
    isHitFlash: gameState.hitFlash,
    hitFlashTimer: gameState.hitFlash ? gameState.hitFlashEndTime - currentTime : 0,
    deadEndFlashTimer: Math.max(0, gameState.deadEndFlashEndTime - currentTime),
    time: currentTime,
    trail: gameState.trail
  };

  renderer.render(renderState);
}

function gameLoop(currentTime: number): void {
  updateGame(currentTime);
  render(currentTime);
  animationFrameId = requestAnimationFrame(gameLoop);
}

function handleKeyDown(e: KeyboardEvent): void {
  if (e.repeat) return;

  const key = e.key.toLowerCase();

  if (key === 'r') {
    initGame();
    return;
  }

  let direction: Direction | null = null;
  if (key === 'w' || key === 'arrowup') direction = 'up';
  else if (key === 's' || key === 'arrowdown') direction = 'down';
  else if (key === 'a' || key === 'arrowleft') direction = 'left';
  else if (key === 'd' || key === 'arrowright') direction = 'right';

  if (direction) {
    e.preventDefault();
    tryMove(direction);
  }
}

function handleResize(): void {
  if (renderer) {
    renderer.resize();
  }
}

restartBtn.addEventListener('click', () => {
  initGame();
});

window.addEventListener('keydown', handleKeyDown);
window.addEventListener('resize', handleResize);

initGame();
lastFrameTime = performance.now();
animationFrameId = requestAnimationFrame(gameLoop);
