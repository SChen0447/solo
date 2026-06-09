import { MaterialType, getMaterialColor, getSpreadProgress, ParticleData } from './particle';
import { Grid } from './grid';

const CELL_SIZE = 4;
const MIN_CANVAS_WIDTH = 800;
const MIN_CANVAS_HEIGHT = 600;
const ERASE_RADIUS = 15;
const SPREAD_RADIUS = 2;
const DEFAULT_PARTICLES_PER_FRAME = 5;
const LOW_FPS_THRESHOLD = 30;

const canvas: HTMLCanvasElement = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx: CanvasRenderingContext2D = canvas.getContext('2d')!;

const particleCountEl: HTMLElement = document.getElementById('particleCount')!;
const fpsEl: HTMLElement = document.getElementById('fps')!;
const gravitySlider: HTMLInputElement = document.getElementById('gravitySlider') as HTMLInputElement;
const gravityValue: HTMLElement = document.getElementById('gravityValue')!;
const clearBtn: HTMLButtonElement = document.getElementById('clearBtn') as HTMLButtonElement;
const pauseBtn: HTMLButtonElement = document.getElementById('pauseBtn') as HTMLButtonElement;
const sandBtn: HTMLButtonElement = document.getElementById('sandBtn') as HTMLButtonElement;
const waterBtn: HTMLButtonElement = document.getElementById('waterBtn') as HTMLButtonElement;
const stoneBtn: HTMLButtonElement = document.getElementById('stoneBtn') as HTMLButtonElement;
const eraseBtn: HTMLButtonElement = document.getElementById('eraseBtn') as HTMLButtonElement;

let grid: Grid;
let currentMaterial: MaterialType = MaterialType.SAND;
let isErasing: boolean = false;
let isPaused: boolean = false;
let particlesPerFrame: number = DEFAULT_PARTICLES_PER_FRAME;
let isMouseDown: boolean = false;
let isRightMouseDown: boolean = false;
let mouseX: number = 0;
let mouseY: number = 0;
let lastMouseX: number = 0;
let lastMouseY: number = 0;

let lastFrameTime: number = performance.now();
let frameCount: number = 0;
let fpsUpdateTime: number = performance.now();
let currentFPS: number = 60;

function resizeCanvas(): void {
  const maxWidth = Math.max(window.innerWidth - 32, MIN_CANVAS_WIDTH);
  const maxHeight = Math.max(window.innerHeight - 200, MIN_CANVAS_HEIGHT);
  canvas.width = Math.floor(maxWidth / CELL_SIZE) * CELL_SIZE;
  canvas.height = Math.floor(maxHeight / CELL_SIZE) * CELL_SIZE;
  grid = new Grid(canvas.width, canvas.height, CELL_SIZE);
}

function setActiveButton(): void {
  const buttons = [sandBtn, waterBtn, stoneBtn, eraseBtn];
  buttons.forEach(b => b.classList.remove('active'));
  if (isErasing) {
    eraseBtn.classList.add('active');
  } else {
    switch (currentMaterial) {
      case MaterialType.SAND:
        sandBtn.classList.add('active');
        break;
      case MaterialType.WATER:
        waterBtn.classList.add('active');
        break;
      case MaterialType.STONE:
        stoneBtn.classList.add('active');
        break;
    }
  }
}

function placeParticles(): void {
  if (isErasing || isRightMouseDown) {
    grid.removeParticlesInRadius(mouseX, mouseY, ERASE_RADIUS);
    return;
  }

  const dx = mouseX - lastMouseX;
  const dy = mouseY - lastMouseY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(1, Math.min(particlesPerFrame, Math.ceil(dist / 2)));

  for (let i = 0; i < steps; i++) {
    const t = steps === 1 ? 1 : i / (steps - 1);
    const ix = lastMouseX + dx * t;
    const iy = lastMouseY + dy * t;

    for (let j = 0; j < Math.ceil(particlesPerFrame / steps); j++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * SPREAD_RADIUS * CELL_SIZE;
      const px = ix + Math.cos(angle) * r;
      const py = iy + Math.sin(angle) * r;
      grid.addParticle(px, py, currentMaterial);
    }
  }

  lastMouseX = mouseX;
  lastMouseY = mouseY;
}

function render(): void {
  ctx.fillStyle = '#2d2d2d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const particles = grid.getAllParticles();
  const now = performance.now();
  const cellSize = grid.getCellSize();

  for (const particle of particles) {
    drawParticle(particle, now, cellSize);
  }

  if (isMouseDown || isRightMouseDown) {
    drawCursor();
  }
}

function drawParticle(particle: ParticleData, now: number, cellSize: number): void {
  const color = getMaterialColor(particle.material);
  const spread = getSpreadProgress(particle, now);
  const size = cellSize * (0.6 + 0.4 * spread);
  const offset = (cellSize - size) / 2;

  ctx.fillStyle = color;
  ctx.fillRect(
    particle.x * cellSize + offset,
    particle.y * cellSize + offset,
    size,
    size
  );
}

function drawCursor(): void {
  const radius = isErasing || isRightMouseDown ? ERASE_RADIUS : SPREAD_RADIUS * CELL_SIZE;
  ctx.beginPath();
  ctx.arc(mouseX, mouseY, radius, 0, Math.PI * 2);
  ctx.strokeStyle = isErasing || isRightMouseDown ? 'rgba(231, 76, 60, 0.6)' : 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function updateFPS(): void {
  frameCount++;
  const now = performance.now();
  if (now - fpsUpdateTime >= 500) {
    currentFPS = Math.round((frameCount * 1000) / (now - fpsUpdateTime));
    frameCount = 0;
    fpsUpdateTime = now;

    if (currentFPS < LOW_FPS_THRESHOLD) {
      particlesPerFrame = Math.max(1, particlesPerFrame - 1);
      fpsEl.style.color = '#f1c40f';
    } else if (currentFPS >= LOW_FPS_THRESHOLD + 10 && particlesPerFrame < DEFAULT_PARTICLES_PER_FRAME) {
      particlesPerFrame = Math.min(DEFAULT_PARTICLES_PER_FRAME, particlesPerFrame + 1);
      fpsEl.style.color = '#ffffff';
    } else {
      fpsEl.style.color = '#ffffff';
    }
  }
  lastFrameTime = now;
}

function updateUI(): void {
  particleCountEl.textContent = `粒子: ${grid.getParticleCount()}`;
  fpsEl.textContent = `FPS: ${currentFPS}`;
}

function gameLoop(): void {
  if (isMouseDown || isRightMouseDown) {
    placeParticles();
  }

  if (!isPaused) {
    grid.update();
  }

  render();
  updateFPS();
  updateUI();

  requestAnimationFrame(gameLoop);
}

function getCanvasCoords(e: MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function handleMouseDown(e: MouseEvent): void {
  if (e.button === 2) {
    isRightMouseDown = true;
    const coords = getCanvasCoords(e);
    mouseX = coords.x;
    mouseY = coords.y;
    lastMouseX = coords.x;
    lastMouseY = coords.y;
    e.preventDefault();
    return;
  }
  if (e.button !== 0) return;
  isMouseDown = true;
  const coords = getCanvasCoords(e);
  mouseX = coords.x;
  mouseY = coords.y;
  lastMouseX = coords.x;
  lastMouseY = coords.y;
}

function handleMouseMove(e: MouseEvent): void {
  const coords = getCanvasCoords(e);
  mouseX = coords.x;
  mouseY = coords.y;
}

function handleMouseUp(e: MouseEvent): void {
  if (e.button === 2) {
    isRightMouseDown = false;
    return;
  }
  if (e.button !== 0) return;
  isMouseDown = false;
}

function handleContextMenu(e: MouseEvent): void {
  e.preventDefault();
}

function handleMouseLeave(): void {
  isMouseDown = false;
  isRightMouseDown = false;
}

function initEventListeners(): void {
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mouseleave', handleMouseLeave);
  canvas.addEventListener('contextmenu', handleContextMenu);

  sandBtn.addEventListener('click', () => {
    currentMaterial = MaterialType.SAND;
    isErasing = false;
    setActiveButton();
  });
  waterBtn.addEventListener('click', () => {
    currentMaterial = MaterialType.WATER;
    isErasing = false;
    setActiveButton();
  });
  stoneBtn.addEventListener('click', () => {
    currentMaterial = MaterialType.STONE;
    isErasing = false;
    setActiveButton();
  });
  eraseBtn.addEventListener('click', () => {
    isErasing = !isErasing;
    setActiveButton();
  });

  gravitySlider.addEventListener('input', (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    grid.setGravityAngle(value);
    gravityValue.textContent = `${value}°`;
  });

  clearBtn.addEventListener('click', () => {
    grid.clear();
  });

  pauseBtn.addEventListener('click', () => {
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? '▶ 继续' : '⏸ 暂停';
  });

  window.addEventListener('resize', resizeCanvas);
}

function init(): void {
  resizeCanvas();
  setActiveButton();
  initEventListeners();
  gameLoop();
}

init();
