import { Board, BOARD_PIXEL } from './board';
import { updatePhysics, DEFAULT_PHYSICS_CONFIG, type PhysicsConfig } from './physics';
import { Renderer } from './renderer';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
if (!canvas) {
  throw new Error('Canvas element #game-canvas not found');
}

const toolbar = document.getElementById('toolbar') as HTMLDivElement | null;
const gravitySlider = document.getElementById('gravity') as HTMLInputElement | null;
const repulsionSlider = document.getElementById('repulsion') as HTMLInputElement | null;
const dampingSlider = document.getElementById('damping') as HTMLInputElement | null;
const gravityVal = document.getElementById('gravity-val') as HTMLSpanElement | null;
const repulsionVal = document.getElementById('repulsion-val') as HTMLSpanElement | null;
const dampingVal = document.getElementById('damping-val') as HTMLSpanElement | null;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement | null;

if (!toolbar || !gravitySlider || !repulsionSlider || !dampingSlider ||
    !gravityVal || !repulsionVal || !dampingVal || !resetBtn) {
  throw new Error('Toolbar elements not found');
}

const gravityValEl: HTMLSpanElement = gravityVal;
const repulsionValEl: HTMLSpanElement = repulsionVal;
const dampingValEl: HTMLSpanElement = dampingVal;

const board = new Board();
const renderer = new Renderer(canvas);

const physicsConfig: PhysicsConfig = { ...DEFAULT_PHYSICS_CONFIG };

function syncBoardOffset(): void {
  const { x, y, size } = renderer.getBoardPosition();
  const scale = size / BOARD_PIXEL;
  board.setBoardOffset(x / scale, y / scale);
}

function updateSliderDisplays(): void {
  gravityValEl.textContent = physicsConfig.gravityStrength.toFixed(1);
  repulsionValEl.textContent = physicsConfig.repulsionStrength.toFixed(1);
  dampingValEl.textContent = physicsConfig.damping.toFixed(3);
}

gravitySlider.addEventListener('input', () => {
  physicsConfig.gravityStrength = parseFloat(gravitySlider.value);
  updateSliderDisplays();
});

repulsionSlider.addEventListener('input', () => {
  physicsConfig.repulsionStrength = parseFloat(repulsionSlider.value);
  updateSliderDisplays();
});

dampingSlider.addEventListener('input', () => {
  physicsConfig.damping = parseFloat(dampingSlider.value);
  updateSliderDisplays();
});

resetBtn.addEventListener('click', () => {
  renderer.triggerResetFade();
});

canvas.addEventListener('click', (e: MouseEvent) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  const { x: bx, y: by, size } = renderer.getBoardPosition();
  const scale = size / BOARD_PIXEL;
  const boardX = (clickX - bx) / scale;
  const boardY = (clickY - by) / scale;

  board.placeStone(boardX, boardY);
});

window.addEventListener('resize', () => {
  renderer.resize();
  syncBoardOffset();
});

syncBoardOffset();
updateSliderDisplays();

function gameLoop(now: number): void {
  const stones = board.getStones();

  if (stones.length > 0) {
    updatePhysics(stones, physicsConfig);
    board.clampStonesToBoard();
    board.checkAndMerge();
    board.cleanupMergeAnimations(now);
  }

  const { shouldClear } = renderer.render(stones, now);
  if (shouldClear) {
    board.clear();
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
