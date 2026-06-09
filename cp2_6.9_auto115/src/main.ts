import { WaterRenderer, WaterParams } from './water';
import { ControlPanel } from './controls';
import { FPSMonitor } from './utils';

const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;
const SMALL_HEIGHT = 500;

const canvas = document.getElementById('waterCanvas') as HTMLCanvasElement;
const controlsContainer = document.getElementById('controls') as HTMLElement;

if (!canvas) {
  throw new Error('Canvas element not found');
}
if (!controlsContainer) {
  throw new Error('Controls container not found');
}

const renderer = new WaterRenderer(canvas);
const fpsMonitor = new FPSMonitor();

new ControlPanel(controlsContainer, (params: Partial<WaterParams>) => {
  renderer.setParams(params);
});

let lastRippleTime = 0;
const RIPPLE_THROTTLE = 30;

function getCanvasCoords(e: MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  const now = performance.now();
  if (now - lastRippleTime >= RIPPLE_THROTTLE) {
    const coords = getCanvasCoords(e);
    renderer.createRipple(coords.x, coords.y);
    lastRippleTime = now;
  }
});

canvas.addEventListener('mouseenter', (e: MouseEvent) => {
  const coords = getCanvasCoords(e);
  renderer.createRipple(coords.x, coords.y);
});

canvas.addEventListener('click', (e: MouseEvent) => {
  const coords = getCanvasCoords(e);
  renderer.createRipple(coords.x, coords.y);
});

function updateCanvasSize(): void {
  const vh = window.innerHeight;
  let targetHeight = BASE_HEIGHT;
  let targetWidth = BASE_WIDTH;

  if (vh < 700) {
    targetHeight = SMALL_HEIGHT;
    targetWidth = BASE_WIDTH * (SMALL_HEIGHT / BASE_HEIGHT);
  }

  const maxWidth = Math.min(window.innerWidth - 40, 1200);
  if (targetWidth > maxWidth) {
    const ratio = maxWidth / targetWidth;
    targetWidth = maxWidth;
    targetHeight = targetHeight * ratio;
  }

  canvas.style.width = targetWidth + 'px';
  canvas.style.height = targetHeight + 'px';

  controlsContainer.style.maxWidth = targetWidth + 'px';

  renderer.resize(BASE_WIDTH, BASE_HEIGHT);
}

window.addEventListener('resize', updateCanvasSize);
updateCanvasSize();

function animate(timestamp: number): void {
  fpsMonitor.tick(timestamp);
  renderer.render(timestamp);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
