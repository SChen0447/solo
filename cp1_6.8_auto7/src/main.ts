import { Game } from './game';
import { Renderer } from './render';
import { GRID_SIZE, TOWER_CONFIGS } from './types';
import type { TowerType, Tower } from './types';

const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;

let game: Game;
let renderer: Renderer;
let canvas: HTMLCanvasElement;

let lastTime: number = 0;
let deltaTime: number = 0;
let accumulator: number = 0;
let animationId: number = 0;
let fps: number = 0;
let fpsCounter: number = 0;
let fpsTimer: number = 0;

let selectedTowerType: TowerType | null = null;
let selectedTower: Tower | null = null;

function init(): void {
  canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('找不到游戏画布元素');
    return;
  }

  resizeCanvas();

  game = new Game(canvas.width, canvas.height);
  renderer = new Renderer(canvas, game);

  setupEventListeners();
  updateUI();
  gameLoop(performance.now());
}

function resizeCanvas(): void {
  const wrapper = document.getElementById('game-canvas-wrapper');
  if (!wrapper || !canvas) return;

  const wrapperRect = wrapper.getBoundingClientRect();
  const padding = 20;

  let width = wrapperRect.width - padding * 2;
  let height = wrapperRect.height - padding * 2;

  width = Math.floor(width / GRID_SIZE) * GRID_SIZE;
  height = Math.floor(height / GRID_SIZE) * GRID_SIZE;

  width = Math.max(400, Math.min(width, 1200));
  height = Math.max(300, Math.min(height, 700));

  canvas.width = width;
  canvas.height = height;

  if (game) {
    game.resize(width, height);
  }
}

function setupEventListeners(): void {
  window.addEventListener('resize', handleResize);

  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('click', handleCanvasClick);
  canvas.addEventListener('mouseleave', handleMouseLeave);

  const towerCards = document.querySelectorAll('.tower-card');
  towerCards.forEach(card => {
    card.addEventListener('click', () => {
      const type = card.getAttribute('data-type') as TowerType;
      selectTowerType(type);
    });
  });

  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', handleStartGame);
  }

  const nextWaveBtn = document.getElementById('next-wave-btn');
  if (nextWaveBtn) {
    nextWaveBtn.addEventListener('click', handleNextWave);
  }

  const pauseBtn = document.getElementById('pause-btn');
  if (pauseBtn) {
    pauseBtn.addEventListener('click', handlePause);
  }

  const upgradeBtn = document.getElementById('upgrade-btn');
  if (upgradeBtn) {
    upgradeBtn.addEventListener('click', handleUpgrade);
  }

  const sellBtn = document.getElementById('sell-btn');
  if (sellBtn) {
    sellBtn.addEventListener('click', handleSell);
  }

  const restartBtn = document.getElementById('restart-btn');
  if (restartBtn) {
    restartBtn.addEventListener('click', handleRestart);
  }

  document.addEventListener('keydown', handleKeyDown);
}

function handleResize(): void {
  resizeCanvas();
}

function handleMouseMove(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const gridX = Math.floor(x / GRID_SIZE);
  const gridY = Math.floor(y / GRID_SIZE);

  renderer.setHoverPosition(gridX, gridY);
}

function handleCanvasClick(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const gridX = Math.floor(x / GRID_SIZE);
  const gridY = Math.floor(y / GRID_SIZE);

  if (selectedTowerType) {
    const success = game.placeTower(selectedTowerType, gridX, gridY);
    if (success) {
      updateUI();
      updateTowerCardStates();
    }
  } else {
    const tower = game.getTowerAt(gridX, gridY);
    if (tower) {
      selectTower(tower);
    } else {
      deselectTower();
    }
  }
}

function handleMouseLeave(): void {
  renderer.setHoverPosition(-1, -1);
}

function selectTowerType(type: TowerType): void {
  if (selectedTowerType === type) {
    selectedTowerType = null;
    game.state.selectedTowerType = null;
  } else {
    selectedTowerType = type;
    game.state.selectedTowerType = type;
    deselectTower();
  }
  updateTowerCardStates();
}

function selectTower(tower: Tower): void {
  selectedTower = tower;
  game.state.selectedTower = tower;
  selectedTowerType = null;
  game.state.selectedTowerType = null;
  updateTowerCardStates();
  showTowerInfo(tower);
}

function deselectTower(): void {
  selectedTower = null;
  game.state.selectedTower = null;
  hideTowerInfo();
}

function showTowerInfo(tower: Tower): void {
  const infoPanel = document.getElementById('tower-info');
  if (!infoPanel) return;

  infoPanel.style.display = 'block';

  const levelEl = document.getElementById('tower-level');
  const damageEl = document.getElementById('tower-damage');
  const rangeEl = document.getElementById('tower-range');
  const upgradeBtn = document.getElementById('upgrade-btn') as HTMLButtonElement;

  if (levelEl) levelEl.textContent = `${tower.level} 级`;
  if (damageEl) damageEl.textContent = tower.damage.toString();
  if (rangeEl) rangeEl.textContent = tower.range.toString();

  if (upgradeBtn) {
    const upgradeCost = game.getUpgradeCost(tower);
    if (tower.level >= 3) {
      upgradeBtn.textContent = '已满级';
      upgradeBtn.disabled = true;
    } else {
      upgradeBtn.textContent = `升级 (${upgradeCost}金币)`;
      upgradeBtn.disabled = game.state.gold < upgradeCost;
    }
  }
}

function hideTowerInfo(): void {
  const infoPanel = document.getElementById('tower-info');
  if (infoPanel) {
    infoPanel.style.display = 'none';
  }
}

function updateTowerCardStates(): void {
  const towerCards = document.querySelectorAll('.tower-card');
  towerCards.forEach(card => {
    const type = card.getAttribute('data-type') as TowerType;
    const config = TOWER_CONFIGS[type];

    card.classList.remove('selected', 'disabled');

    if (selectedTowerType === type) {
      card.classList.add('selected');
    }

    if (game.state.gold < config.cost) {
      card.classList.add('disabled');
    }
  });
}

function handleStartGame(): void {
  game.startGame();
  updateUI();
}

function handleNextWave(): void {
  game.startNextWave();
  updateUI();
}

function handlePause(): void {
  game.togglePause();
  const pauseBtn = document.getElementById('pause-btn');
  if (pauseBtn) {
    pauseBtn.textContent = game.state.isPaused ? '继续' : '暂停';
  }
}

function handleUpgrade(): void {
  if (!selectedTower) return;

  const success = game.upgradeTower(selectedTower);
  if (success) {
    showTowerInfo(selectedTower);
    updateUI();
    updateTowerCardStates();
  }
}

function handleSell(): void {
  if (!selectedTower) return;

  game.sellTower(selectedTower);
  deselectTower();
  updateUI();
  updateTowerCardStates();
}

function handleRestart(): void {
  game.reset();
  selectedTowerType = null;
  selectedTower = null;

  const overlay = document.getElementById('game-over-overlay');
  if (overlay) {
    overlay.classList.remove('visible');
  }

  const pauseBtn = document.getElementById('pause-btn');
  if (pauseBtn) {
    pauseBtn.textContent = '暂停';
  }

  updateUI();
  updateTowerCardStates();
  hideTowerInfo();
}

function handleKeyDown(e: KeyboardEvent): void {
  switch (e.key) {
    case '1':
      selectTowerType('arrow');
      break;
    case '2':
      selectTowerType('slow');
      break;
    case '3':
      selectTowerType('splash');
      break;
    case 'Escape':
      selectedTowerType = null;
      game.state.selectedTowerType = null;
      deselectTower();
      updateTowerCardStates();
      break;
    case ' ':
      e.preventDefault();
      if (game.state.isGameOver) {
        handleRestart();
      } else if (!game.state.isPlaying) {
        handleStartGame();
      } else if (!game.state.waveActive) {
        handleNextWave();
      }
      break;
    case 'p':
    case 'P':
      handlePause();
      break;
  }
}

function updateUI(): void {
  const waveDisplay = document.getElementById('wave-display');
  const livesDisplay = document.getElementById('lives-display');
  const goldDisplay = document.getElementById('gold-display');
  const healthBar = document.getElementById('health-bar');
  const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
  const nextWaveBtn = document.getElementById('next-wave-btn') as HTMLButtonElement;

  if (waveDisplay) waveDisplay.textContent = game.state.wave.toString();
  if (livesDisplay) livesDisplay.textContent = Math.max(0, game.state.lives).toString();
  if (goldDisplay) goldDisplay.textContent = game.state.gold.toString();

  if (healthBar) {
    const hpPercent = Math.max(0, game.state.lives / 100 * 100);
    healthBar.style.width = `${hpPercent}%`;
  }

  if (startBtn) {
    startBtn.disabled = game.state.isPlaying || game.state.isGameOver;
  }

  if (nextWaveBtn) {
    nextWaveBtn.disabled = game.state.waveActive || game.state.isGameOver || !game.state.isPlaying;
  }

  if (game.state.isGameOver) {
    showGameOver();
  }

  if (selectedTower) {
    showTowerInfo(selectedTower);
  }
}

function showGameOver(): void {
  const overlay = document.getElementById('game-over-overlay');
  if (overlay && !overlay.classList.contains('visible')) {
    overlay.classList.add('visible');
  }

  const finalWave = document.getElementById('final-wave');
  const finalGold = document.getElementById('final-gold');

  if (finalWave) finalWave.textContent = game.state.wave.toString();
  if (finalGold) finalGold.textContent = game.state.totalGoldEarned.toString();
}

function gameLoop(currentTime: number): void {
  deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  if (deltaTime > 100) {
    deltaTime = 100;
  }

  accumulator += deltaTime;

  while (accumulator >= FRAME_TIME) {
    const dt = FRAME_TIME / 1000;
    game.update(dt);
    accumulator -= FRAME_TIME;
  }

  renderer.render();

  fpsCounter++;
  fpsTimer += deltaTime;
  if (fpsTimer >= 1000) {
    fps = fpsCounter;
    fpsCounter = 0;
    fpsTimer = 0;
  }

  updateUI();

  animationId = requestAnimationFrame(gameLoop);
}

window.addEventListener('DOMContentLoaded', init);
