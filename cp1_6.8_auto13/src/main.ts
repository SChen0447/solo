import {
  BASE_PLANTS,
  crossBreed,
  canSurvive,
  getRandomEnvironment,
  EnvironmentChallenge,
  EnvironmentType
} from './genes';

import {
  PlantInstance,
  UIState,
  createPlantFromDef,
  createOffspringPlant,
  createUIState,
  initStarParticles,
  initDnaParticles,
  updateCardPositions,
  handleMouseMove,
  handleClick,
  getSelectedPlants,
  updateUI,
  renderGarden,
  showPopup
} from './plants';

interface GameState {
  round: number;
  score: number;
  survivedCount: number;
  consecutiveFailures: number;
  isGameOver: boolean;
  plants: PlantInstance[];
  environment: EnvironmentChallenge;
  offspringQueue: PlantInstance[];
}

const MAX_PLANTS = 20;
const MAX_CONSECUTIVE_FAILURES = 3;
const POINTS_SURVIVE = 10;
const POINTS_FAIL = -5;

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let gameState: GameState;
let uiState: UIState;
let lastTime = 0;
let animationId: number;
let isMobile = false;

function init(): void {
  canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  ctx = canvas.getContext('2d')!;

  resizeCanvas();
  window.addEventListener('resize', onResize);

  isMobile = window.innerWidth < 768;

  gameState = createInitialGameState();
  uiState = createUIState();
  uiState.starParticles = initStarParticles(60, canvas.width, canvas.height);
  uiState.dnaParticles = initDnaParticles();

  updateCardPositions(uiState, gameState.plants, canvas.width, canvas.height, isMobile);

  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('click', onClick);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });

  const restartBtn = document.getElementById('restart-btn');
  if (restartBtn) {
    restartBtn.addEventListener('click', restartGame);
  }

  updateStatusDisplay();
  updateEnvironmentDisplay();

  lastTime = performance.now();
  gameLoop(lastTime);
}

function createInitialGameState(): GameState {
  const plants: PlantInstance[] = BASE_PLANTS.map((def, index) =>
    createPlantFromDef(def, index)
  );

  return {
    round: 1,
    score: 0,
    survivedCount: 0,
    consecutiveFailures: 0,
    isGameOver: false,
    plants,
    environment: getRandomEnvironment(),
    offspringQueue: []
  };
}

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';

  ctx.scale(dpr, dpr);

  if (uiState && gameState) {
    isMobile = window.innerWidth < 768;
    uiState.starParticles = initStarParticles(60, window.innerWidth, window.innerHeight);
    updateCardPositions(uiState, gameState.plants, window.innerWidth, window.innerHeight, isMobile);
  }
}

function onResize(): void {
  resizeCanvas();
}

function onMouseMove(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  handleMouseMove(uiState, x, y);
}

function onClick(e: MouseEvent): void {
  if (gameState.isGameOver) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const action = handleClick(uiState, x, y);

  if (action === 'cross') {
    performCrossBreed();
  } else if (action === 'nextRound') {
    goToNextRound();
  }
}

function onTouchStart(e: TouchEvent): void {
  e.preventDefault();
  if (e.touches.length > 0) {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    handleMouseMove(uiState, x, y);
  }
}

function onTouchMove(e: TouchEvent): void {
  e.preventDefault();
  if (e.touches.length > 0) {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    handleMouseMove(uiState, x, y);
  }
}

function performCrossBreed(): void {
  if (uiState.selectedCards.length !== 2) return;
  if (uiState.isCrossAnimating) return;
  if (gameState.plants.length >= MAX_PLANTS) {
    showPopup(uiState, '花园已满！最多20株植物', 2);
    return;
  }

  const selected = getSelectedPlants(uiState);
  if (selected.length !== 2) return;

  const [parent1, parent2] = selected;
  const offspringGenotype = crossBreed(parent1.genotype, parent2.genotype);
  const offspring = createOffspringPlant(
    offspringGenotype,
    parent1.name,
    parent2.name,
    0
  );

  uiState.isCrossAnimating = true;
  uiState.crossAnimProgress = 0;
  gameState.offspringQueue.push(offspring);

  setTimeout(() => {
    completeCrossAnimation();
  }, 3000);
}

function completeCrossAnimation(): void {
  uiState.isCrossAnimating = false;
  uiState.crossAnimProgress = 0;
  uiState.selectedCards = [];

  const offspring = gameState.offspringQueue.shift();
  if (offspring) {
    offspring.animProgress = 0;
    offspring.animDelay = 0;
    gameState.plants.push(offspring);

    if (gameState.plants.length > MAX_PLANTS) {
      const basePlants = gameState.plants.filter(p => p.isBase);
      const offspringPlants = gameState.plants.filter(p => !p.isBase);
      if (offspringPlants.length > MAX_PLANTS - 6) {
        offspringPlants.shift();
      }
      gameState.plants = [...basePlants, ...offspringPlants];
    }

    updateCardPositions(uiState, gameState.plants, canvas.width, canvas.height, isMobile);
    showPopup(uiState, '✨ 新品种诞生！', 1.5);
  }
}

function evaluateSurvival(): { survived: number; died: number } {
  let survived = 0;
  let died = 0;

  for (const plant of gameState.plants) {
    if (plant.isBase) continue;

    const survives = canSurvive(plant.genotype, gameState.environment.type);
    plant.survived = survives;

    if (survives) {
      survived++;
    } else {
      died++;
    }
  }

  return { survived, died };
}

function goToNextRound(): void {
  if (gameState.isGameOver) return;

  const { survived, died } = evaluateSurvival();
  const nonBasePlants = gameState.plants.filter(p => !p.isBase);

  if (nonBasePlants.length > 0) {
    if (survived > 0) {
      gameState.score += POINTS_SURVIVE * survived;
      gameState.survivedCount += survived;
    }

    if (died > 0) {
      gameState.score += POINTS_FAIL * died;
    }

    if (nonBasePlants.length > 0 && survived === 0) {
      gameState.consecutiveFailures++;
      showPopup(uiState, `💀 全军覆没！连续失败 ${gameState.consecutiveFailures}/3`, 2);
    } else if (survived > 0) {
      gameState.consecutiveFailures = 0;
      showPopup(uiState, `✨ ${survived} 株植物存活！+${survived * POINTS_SURVIVE}分`, 2);
    }

    gameState.plants = gameState.plants.filter(p => {
      if (p.isBase) return true;
      return p.survived === true;
    });

    for (const plant of gameState.plants) {
      plant.survived = null;
    }

    if (gameState.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      endGame();
      return;
    }
  } else {
    showPopup(uiState, '还没有培育出新植物哦～', 1.5);
  }

  gameState.round++;
  gameState.environment = getRandomEnvironment();

  updateCardPositions(uiState, gameState.plants, canvas.width, canvas.height, isMobile);
  updateStatusDisplay();
  updateEnvironmentDisplay();
}

function endGame(): void {
  gameState.isGameOver = true;

  const overlay = document.getElementById('game-over-overlay');
  const finalScore = document.getElementById('final-score');

  if (overlay) {
    overlay.style.display = 'flex';
  }
  if (finalScore) {
    finalScore.textContent = gameState.score.toString();
  }
}

function restartGame(): void {
  const overlay = document.getElementById('game-over-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }

  gameState = createInitialGameState();
  uiState = createUIState();
  uiState.starParticles = initStarParticles(60, canvas.width, canvas.height);
  uiState.dnaParticles = initDnaParticles();

  updateCardPositions(uiState, gameState.plants, canvas.width, canvas.height, isMobile);
  updateStatusDisplay();
  updateEnvironmentDisplay();
}

function updateStatusDisplay(): void {
  const roundEl = document.getElementById('round-value');
  const scoreEl = document.getElementById('score-value');
  const survivedEl = document.getElementById('survived-value');

  if (roundEl) roundEl.textContent = gameState.round.toString();
  if (scoreEl) scoreEl.textContent = gameState.score.toString();
  if (survivedEl) survivedEl.textContent = gameState.survivedCount.toString();
}

function updateEnvironmentDisplay(): void {
  const envText = document.getElementById('environment-text');
  if (envText) {
    envText.textContent = `${gameState.environment.icon} ${gameState.environment.name} ${gameState.environment.duration}天`;
  }
}

function gameLoop(currentTime: number): void {
  const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
  lastTime = currentTime;

  if (!gameState.isGameOver) {
    updateUI(uiState, deltaTime, gameState.plants);
  }

  render();

  animationId = requestAnimationFrame(gameLoop);
}

function render(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderGarden(ctx, uiState, width, height, gameState.environment, isMobile);

  if (gameState.isGameOver) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}

document.addEventListener('DOMContentLoaded', init);

if (document.readyState !== 'loading') {
  init();
}
