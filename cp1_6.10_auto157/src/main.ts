import { Renderer } from './renderer';
import {
  Ball,
  Magnet,
  Blade,
  Particle,
  Level,
  Vector2,
  CELL_SIZE,
  LERP_ALPHA,
  MAGNET_SIZE,
  BALL_RADIUS,
  BLADE_LENGTH,
  BLADE_WIDTH,
  createLevels,
  computeMagneticForce,
  checkWallCollision,
  checkBladeCollision,
  checkEndArea,
  clampToBounds,
  createHeartParticles,
  updateParticles,
  lerp,
  dist,
} from './physics';

const levels = createLevels();

let currentLevelIdx = 0;
let level: Level;
let ball: Ball;
let magnets: Magnet[] = [];
let blades: Blade[] = [];
let particles: Particle[] = [];
let timer: number = 0;
let steps: number = 0;
let isComplete: boolean = false;
let frameCount: number = 0;

let draggingMagnet: Magnet | null = null;
let dragOffset: Vector2 = { x: 0, y: 0 };

let renderer: Renderer;
let canvas: HTMLCanvasElement;
let timerEl: HTMLElement;
let stepsEl: HTMLElement;
let replayBtn: HTMLButtonElement;
let levelSelect: HTMLSelectElement;

let lastBallState: { x: number; y: number; vx: number; vy: number } = { x: 0, y: 0, vx: 0, vy: 0 };

function initGame(): void {
  canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  timerEl = document.getElementById('timer') as HTMLElement;
  stepsEl = document.getElementById('steps') as HTMLElement;
  replayBtn = document.getElementById('replay-btn') as HTMLButtonElement;
  levelSelect = document.getElementById('level-select') as HTMLSelectElement;

  renderer = new Renderer(canvas);

  replayBtn.addEventListener('click', () => loadLevel(currentLevelIdx));
  levelSelect.addEventListener('change', (e) => {
    const idx = parseInt((e.target as HTMLSelectElement).value, 10);
    loadLevel(idx);
  });

  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', onMouseUp);

  loadLevel(0);
}

function loadLevel(idx: number): void {
  currentLevelIdx = idx;
  level = levels[idx];
  levelSelect.value = String(idx);

  ball = {
    pos: {
      x: level.start.x * CELL_SIZE + CELL_SIZE / 2,
      y: level.start.y * CELL_SIZE + CELL_SIZE / 2,
    },
    vel: { x: 0, y: 0 },
    targetVel: { x: 0, y: 0 },
    radius: BALL_RADIUS,
  };

  magnets = [
    {
      pos: { x: 2 * CELL_SIZE + CELL_SIZE / 2, y: 13 * CELL_SIZE + CELL_SIZE / 2 },
      type: 'N',
      size: MAGNET_SIZE,
      isDragging: false,
    },
    {
      pos: { x: 13 * CELL_SIZE + CELL_SIZE / 2, y: 2 * CELL_SIZE + CELL_SIZE / 2 },
      type: 'S',
      size: MAGNET_SIZE,
      isDragging: false,
    },
  ];

  blades = level.bladeConfigs.map((config) => ({
    center: { ...config.center },
    angle: Math.random() * Math.PI * 2,
    angularVel: config.angularVel,
    length: BLADE_LENGTH,
    width: BLADE_WIDTH,
    count: 3,
  }));

  particles = [];
  timer = 0;
  steps = 0;
  isComplete = false;
  frameCount = 0;
  lastBallState = { x: ball.pos.x, y: ball.pos.y, vx: 0, vy: 0 };
  draggingMagnet = null;
  canvas.style.cursor = 'default';
}

function onMouseDown(e: MouseEvent): void {
  if (isComplete) return;
  const mousePos = getMousePos(e);

  for (const magnet of magnets) {
    const half = magnet.size / 2;
    if (
      mousePos.x >= magnet.pos.x - half &&
      mousePos.x <= magnet.pos.x + half &&
      mousePos.y >= magnet.pos.y - half &&
      mousePos.y <= magnet.pos.y + half
    ) {
      draggingMagnet = magnet;
      magnet.isDragging = true;
      dragOffset = {
        x: magnet.pos.x - mousePos.x,
        y: magnet.pos.y - mousePos.y,
      };
      canvas.style.cursor = 'grabbing';
      break;
    }
  }
}

function onMouseMove(e: MouseEvent): void {
  const mousePos = getMousePos(e);

  if (draggingMagnet) {
    draggingMagnet.pos.x = mousePos.x + dragOffset.x;
    draggingMagnet.pos.y = mousePos.y + dragOffset.y;

    const half = draggingMagnet.size / 2;
    draggingMagnet.pos.x = Math.max(half, Math.min(450 - half, draggingMagnet.pos.x));
    draggingMagnet.pos.y = Math.max(half, Math.min(450 - half, draggingMagnet.pos.y));
    return;
  }

  let hovering = false;
  for (const magnet of magnets) {
    const half = magnet.size / 2;
    if (
      mousePos.x >= magnet.pos.x - half &&
      mousePos.x <= magnet.pos.x + half &&
      mousePos.y >= magnet.pos.y - half &&
      mousePos.y <= magnet.pos.y + half
    ) {
      hovering = true;
      break;
    }
  }
  canvas.style.cursor = hovering ? 'grab' : 'default';
}

function onMouseUp(): void {
  if (draggingMagnet) {
    draggingMagnet.isDragging = false;
    draggingMagnet = null;
  }
  canvas.style.cursor = 'default';
}

function getMousePos(e: MouseEvent): Vector2 {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

function updatePhysics(): void {
  if (isComplete) {
    particles = updateParticles(particles);
    return;
  }

  frameCount++;
  if (frameCount % 60 === 0) {
    timer++;
    updateTimerDisplay();
  }

  const force = computeMagneticForce(ball, magnets);
  ball.targetVel.x = force.x;
  ball.targetVel.y = force.y;

  ball.vel.x = lerp(ball.vel.x, ball.targetVel.x, LERP_ALPHA);
  ball.vel.y = lerp(ball.vel.y, ball.targetVel.y, LERP_ALPHA);

  const speedSq = ball.vel.x * ball.vel.x + ball.vel.y * ball.vel.y;
  if (speedSq > 0.01) {
    ball.pos.x += ball.vel.x;
    ball.pos.y += ball.vel.y;
  }

  clampToBounds(ball);

  const wallResult = checkWallCollision(ball, level.walls);
  if (wallResult.collided) {
    const vDotN = ball.vel.x * wallResult.normal.x + ball.vel.y * wallResult.normal.y;
    if (vDotN < 0) {
      ball.vel.x -= 2 * vDotN * wallResult.normal.x * 0.8;
      ball.vel.y -= 2 * vDotN * wallResult.normal.y * 0.8;
    }
  }

  for (const blade of blades) {
    blade.angle += blade.angularVel;
    checkBladeCollision(ball, blade);
  }

  const stateChanged =
    Math.abs(ball.pos.x - lastBallState.x) > 0.5 ||
    Math.abs(ball.pos.y - lastBallState.y) > 0.5 ||
    Math.abs(ball.vel.x - lastBallState.vx) > 0.1 ||
    Math.abs(ball.vel.y - lastBallState.vy) > 0.1;

  if (stateChanged) {
    steps++;
    updateStepsDisplay();
    lastBallState = {
      x: ball.pos.x,
      y: ball.pos.y,
      vx: ball.vel.x,
      vy: ball.vel.y,
    };
  }

  if (checkEndArea(ball, level.endArea)) {
    triggerComplete();
  }

  particles = updateParticles(particles);
}

function triggerComplete(): void {
  isComplete = true;
  const endCenter = {
    x: (level.endArea.x + level.endArea.w / 2) * CELL_SIZE,
    y: (level.endArea.y + level.endArea.h / 2) * CELL_SIZE,
  };
  particles = createHeartParticles(endCenter, 20);
}

function render(): void {
  renderer.clear();
  renderer.drawGrid();
  renderer.drawEndArea(level.endArea);
  renderer.drawWalls(level.walls);

  for (const magnet of magnets) {
    renderer.drawForceField(magnet);
  }

  renderer.drawForceLines(ball, magnets);

  for (const blade of blades) {
    renderer.drawBlade(blade);
  }

  renderer.drawBall(ball);

  for (const magnet of magnets) {
    renderer.drawMagnet(magnet);
  }

  renderer.drawParticles(particles);
}

function updateTimerDisplay(): void {
  const mins = Math.floor(timer / 60).toString().padStart(2, '0');
  const secs = (timer % 60).toString().padStart(2, '0');
  timerEl.textContent = `${mins}:${secs}`;
}

function updateStepsDisplay(): void {
  stepsEl.textContent = `步数: ${steps}`;
}

function gameLoop(): void {
  updatePhysics();
  render();
  requestAnimationFrame(gameLoop);
}

document.addEventListener('DOMContentLoaded', () => {
  initGame();
  gameLoop();
});
