import { BoidManager } from './BoidManager';

const CANVAS_HEIGHT = 800;
const MIN_CANVAS_WIDTH = 600;
const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let manager: BoidManager;
let efficiencyElement: HTMLElement;
let lastTime = 0;
let accumulator = 0;
let isDragging = false;

function init(): void {
  canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  efficiencyElement = document.getElementById('efficiencyValue') as HTMLElement;

  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  ctx = canvas.getContext('2d')!;
  if (!ctx) {
    console.error('Canvas 2D context not available');
    return;
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const wrapper = canvas.parentElement;
  const logicalWidth = wrapper ? Math.max(MIN_CANVAS_WIDTH, wrapper.clientWidth) : MIN_CANVAS_WIDTH;
  manager = new BoidManager(logicalWidth, CANVAS_HEIGHT);

  setupMouseEvents();

  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function resizeCanvas(): void {
  const wrapper = canvas.parentElement;
  if (!wrapper) return;

  const wrapperWidth = wrapper.clientWidth;
  const width = Math.max(MIN_CANVAS_WIDTH, wrapperWidth);

  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = CANVAS_HEIGHT * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${CANVAS_HEIGHT}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (manager) {
    manager.resize(width, CANVAS_HEIGHT);
  }
}

function getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function setupMouseEvents(): void {
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    const coords = getCanvasCoords(e);
    manager.addScareSource(coords.x, coords.y);
  });

  canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const coords = getCanvasCoords(e);
      manager.addScareSource(coords.x, coords.y);
    }
  });

  canvas.addEventListener('mouseup', () => {
    isDragging = false;
  });

  canvas.addEventListener('mouseleave', () => {
    isDragging = false;
  });

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isDragging = true;
    if (e.touches.length > 0) {
      const coords = getCanvasCoords(e.touches[0]);
      manager.addScareSource(coords.x, coords.y);
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (isDragging && e.touches.length > 0) {
      const coords = getCanvasCoords(e.touches[0]);
      manager.addScareSource(coords.x, coords.y);
    }
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    isDragging = false;
  });
}

function gameLoop(currentTime: number): void {
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;
  accumulator += deltaTime;

  while (accumulator >= FRAME_INTERVAL) {
    manager.update(FRAME_INTERVAL / 1000);
    accumulator -= FRAME_INTERVAL;
  }

  render();
  updateEfficiencyDisplay();

  requestAnimationFrame(gameLoop);
}

function render(): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  manager.draw(ctx);
}

function updateEfficiencyDisplay(): void {
  if (!efficiencyElement) return;

  const efficiency = manager.getEfficiency();
  efficiencyElement.textContent = `${Math.round(efficiency)}%`;

  let color: string;
  if (efficiency > 80) {
    color = '#4CD964';
  } else if (efficiency >= 50) {
    color = '#FFCC00';
  } else {
    color = '#FF3B30';
  }
  efficiencyElement.style.color = color;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
