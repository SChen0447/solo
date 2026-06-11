import { PlayerState, createPlayer, resetPlayer, movePlayer, updatePlayer, canTriggerRewind, triggerRewind } from './player';
import { GameStats, resizeCanvas, render, getVirtualButtons, isVictoryButtonClicked } from './renderer';
import { getCollectedKeyCount, resetMapState } from './map';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let player: PlayerState;
let stats: GameStats;
let lastTime = 0;
let gameStartTime = 0;
let running = true;
let lastEnergyRecover = 0;

function initGame(): void {
  player = createPlayer();
  stats = {
    steps: 0,
    time: 0,
    energy: 100,
    keysCollected: 0,
    isRewinding: false,
    victory: false,
    victoryTime: 0,
    lastEnergyRecoverTime: 0,
    showEnergyPulse: false,
    energyPulseTime: 0
  };
  gameStartTime = performance.now();
  lastEnergyRecover = gameStartTime;
  resetMapState();
}

function handleKeyDown(e: KeyboardEvent): void {
  if (stats.victory) return;
  if (player.status === 'rewinding') return;

  const now = performance.now();
  let dx = 0;
  let dy = 0;

  switch (e.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      dy = -1;
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      dy = 1;
      break;
    case 'ArrowLeft':
    case 'a':
    case 'A':
      dx = -1;
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      dx = 1;
      break;
    case 'r':
    case 'R':
      tryManualRewind(now);
      return;
    default:
      return;
  }

  e.preventDefault();
  attemptMove(dx, dy, now);
}

function tryManualRewind(now: number): void {
  if (canTriggerRewind(player, stats.energy)) {
    if (triggerRewind(player, now)) {
      stats.energy -= 20;
      stats.isRewinding = true;
    }
  }
}

function attemptMove(dx: number, dy: number, now: number): void {
  const result = movePlayer(player, dx, dy, now);

  if (result.moved) {
    stats.steps++;
    stats.keysCollected = getCollectedKeyCount();

    if (result.hitTrap) {
      tryAutoRewind(now);
    }
    if (result.reachedEnd) {
      stats.victory = true;
      stats.victoryTime = now;
    }
  } else if (result.hitWall) {
    tryAutoRewind(now);
  }
}

function tryAutoRewind(now: number): void {
  if (canTriggerRewind(player, stats.energy)) {
    setTimeout(() => {
      if (triggerRewind(player, performance.now())) {
        stats.energy -= 20;
        stats.isRewinding = true;
      }
    }, 300);
  }
}

function handleTouchStart(e: TouchEvent): void {
  e.preventDefault();
  if (stats.victory) {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const mx = touch.clientX - rect.left;
    const my = touch.clientY - rect.top;
    if (isVictoryButtonClicked(mx, my, stats)) {
      initGame();
    }
    return;
  }
  if (player.status === 'rewinding') return;

  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const mx = touch.clientX - rect.left;
  const my = touch.clientY - rect.top;

  const buttons = getVirtualButtons();
  for (const btn of buttons) {
    if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
      const now = performance.now();
      switch (btn.dir) {
        case 'up': attemptMove(0, -1, now); break;
        case 'down': attemptMove(0, 1, now); break;
        case 'left': attemptMove(-1, 0, now); break;
        case 'right': attemptMove(1, 0, now); break;
      }
      return;
    }
  }
}

function handleClick(e: MouseEvent): void {
  if (stats.victory) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (isVictoryButtonClicked(mx, my, stats)) {
      initGame();
    }
  }
}

function gameLoop(timestamp: number): void {
  if (!running) return;

  const now = timestamp;
  const dt = now - lastTime;
  lastTime = now;

  if (!stats.victory) {
    stats.time = (now - gameStartTime) / 1000;
  }

  if (!stats.victory && now - lastEnergyRecover >= 3000 && stats.energy < 100) {
    stats.energy = Math.min(100, stats.energy + 5);
    lastEnergyRecover = now;
    stats.showEnergyPulse = true;
    stats.energyPulseTime = now;
  }

  updatePlayer(player, now);

  if (stats.isRewinding && player.status !== 'rewinding') {
    stats.isRewinding = false;
  }

  render(ctx, player, stats, now);

  requestAnimationFrame(gameLoop);
}

function handleResize(): void {
  resizeCanvas(canvas);
}

window.addEventListener('keydown', handleKeyDown);
window.addEventListener('resize', handleResize);
canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('click', handleClick);

initGame();
handleResize();
requestAnimationFrame((t) => {
  lastTime = t;
  gameLoop(t);
});
