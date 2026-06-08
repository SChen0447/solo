import {
  Ball,
  Particle,
  createBall,
  launchBall,
  updatePhysics,
  updateParticles,
  isBallOutOfBounds
} from './physics';
import {
  LevelState,
  createLevelState,
  loadLevel,
  checkLightCollisions,
  updateLights,
  updateCompletionAnimation,
  getLitCount,
  getTotalLights,
  getTotalLevels
} from './level';
import {
  TrailPoint,
  render
} from './renderer';

const TARGET_FPS = 60;
const FIXED_DELTA_TIME = 1 / TARGET_FPS;
const MAX_FRAME_TIME = 12 / 1000;
const LAUNCH_POWER = 12;
const TRAIL_LENGTH = 15;

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let canvasWidth: number;
let canvasHeight: number;

let ball: Ball | null = null;
let particles: Particle[] = [];
let trail: TrailPoint[] = [];
let levelState: LevelState;

let isAiming = true;
let mousePos = { x: 0, y: 0 };
let retryCount = 0;

let lastTime = 0;
let accumulator = 0;
let animationId: number;

const levelNumberEl = document.getElementById('level-number');
const lightsCountEl = document.getElementById('lights-count');
const retryCountEl = document.getElementById('retry-count');

function init(): void {
  canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  ctx = canvas.getContext('2d')!;

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  levelState = createLevelState();
  loadLevel(levelState, 1, canvasWidth, canvasHeight);

  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchmove', handleTouchMove);
  canvas.addEventListener('touchstart', handleTouchStart);
  document.addEventListener('keydown', handleKeyDown);

  updateUI();
  lastTime = performance.now();
  gameLoop();
}

function resizeCanvas(): void {
  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  if (levelState) {
    loadLevel(levelState, levelState.currentLevel, canvasWidth, canvasHeight);
  }
}

function handleMouseMove(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  mousePos.x = e.clientX - rect.left;
  mousePos.y = e.clientY - rect.top;
}

function handleMouseDown(e: MouseEvent): void {
  if (e.button === 0) {
    launch();
  }
}

function handleTouchMove(e: TouchEvent): void {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  mousePos.x = touch.clientX - rect.left;
  mousePos.y = touch.clientY - rect.top;
}

function handleTouchStart(e: TouchEvent): void {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  mousePos.x = touch.clientX - rect.left;
  mousePos.y = touch.clientY - rect.top;
  launch();
}

function handleKeyDown(e: KeyboardEvent): void {
  if (e.code === 'Space') {
    e.preventDefault();
    launch();
  }
  if (e.code === 'KeyR') {
    resetBall();
  }
  if (e.code === 'Digit1') {
    loadLevel(levelState, 1, canvasWidth, canvasHeight);
    resetBall();
    updateUI();
  }
  if (e.code === 'Digit2') {
    loadLevel(levelState, 2, canvasWidth, canvasHeight);
    resetBall();
    updateUI();
  }
  if (e.code === 'Digit3') {
    loadLevel(levelState, 3, canvasWidth, canvasHeight);
    resetBall();
    updateUI();
  }
}

function launch(): void {
  if (!isAiming || levelState.isComplete) return;

  const launchPos = levelState.launchPosition;
  const dx = mousePos.x - launchPos.x;
  const dy = mousePos.y - (launchPos.y - 15);
  const angle = Math.atan2(dy, dx);

  ball = createBall(launchPos.x, launchPos.y - 15);
  ball = launchBall(ball, angle, LAUNCH_POWER);

  isAiming = false;
  trail = [];
}

function resetBall(): void {
  ball = null;
  isAiming = true;
  particles = [];
  trail = [];
  retryCount++;
  updateUI();
}

function nextLevel(): void {
  const nextLevelNum = levelState.currentLevel + 1;
  if (nextLevelNum <= getTotalLevels()) {
    loadLevel(levelState, nextLevelNum, canvasWidth, canvasHeight);
    resetBall();
    retryCount = 0;
    updateUI();
  }
}

function updateUI(): void {
  if (levelNumberEl) {
    levelNumberEl.textContent = levelState.currentLevel.toString();
  }
  if (lightsCountEl) {
    lightsCountEl.textContent = `${getLitCount(levelState)}/${getTotalLights(levelState)}`;
  }
  if (retryCountEl) {
    retryCountEl.textContent = retryCount.toString();
  }
}

function gameLoop(): void {
  const currentTime = performance.now();
  let deltaTime = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  if (deltaTime > MAX_FRAME_TIME) {
    deltaTime = MAX_FRAME_TIME;
  }

  accumulator += deltaTime;

  while (accumulator >= FIXED_DELTA_TIME) {
    fixedUpdate(FIXED_DELTA_TIME);
    accumulator -= FIXED_DELTA_TIME;
  }

  const frameStart = performance.now();
  renderFrame();
  const renderTime = performance.now() - frameStart;

  if (renderTime > 12) {
    console.warn(`Frame render time: ${renderTime.toFixed(2)}ms`);
  }

  animationId = requestAnimationFrame(gameLoop);
}

function fixedUpdate(dt: number): void {
  updateLights(levelState, dt);
  updateCompletionAnimation(levelState, dt);

  if (levelState.isComplete && levelState.completionProgress >= 1) {
    setTimeout(() => {
      if (levelState.currentLevel < getTotalLevels()) {
        nextLevel();
      }
    }, 1000);
    return;
  }

  particles = updateParticles(particles, dt);

  if (ball) {
    const physicsResult = updatePhysics(
      ball,
      levelState.obstacles,
      dt,
      canvasWidth,
      canvasHeight
    );
    ball = physicsResult.ball;
    particles.push(...physicsResult.particles);

    const litChanged = checkLightCollisions(levelState, ball);
    if (litChanged) {
      updateUI();
    }

    updateTrail(ball);

    if (isBallOutOfBounds(ball, canvasHeight)) {
      resetBall();
    }
  }
}

function updateTrail(ball: Ball): void {
  trail.unshift({
    x: ball.position.x,
    y: ball.position.y,
    alpha: 1
  });

  if (trail.length > TRAIL_LENGTH) {
    trail.pop();
  }

  for (let i = 0; i < trail.length; i++) {
    trail[i].alpha = 1 - i / TRAIL_LENGTH;
  }
}

function renderFrame(): void {
  render(
    ctx,
    canvasWidth,
    canvasHeight,
    ball,
    trail,
    levelState,
    particles,
    isAiming,
    mousePos,
    levelState.launchPosition
  );
}

window.addEventListener('DOMContentLoaded', init);
