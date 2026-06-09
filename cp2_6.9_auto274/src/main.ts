import {
  addSporesAlongPath,
  updateSpores,
  renderSpores,
  type SporeSettings,
} from './growth';
import { addSeed, updateSeeds, renderSeeds } from './seed';
import { createPanel, getSettings, type PanelSettings } from './panel';

const canvas = document.getElementById('lichen-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const warmingOverlay = document.getElementById('warming-overlay') as HTMLDivElement;
const timeButton = document.getElementById('time-button') as HTMLButtonElement;

let canvasWidth = 0;
let canvasHeight = 0;
let lastMouseX = 0;
let lastMouseY = 0;
let isDragging = false;
let dragStartTime = 0;
let animationTime = 0;
let settings: PanelSettings = getSettings();
let timeMultiplier = 1;
let timeBoostEndTime = 0;
let isMobile = window.innerWidth < 768;

function resizeCanvas(): void {
  isMobile = window.innerWidth < 768;

  const aspectRatio = 16 / 9;
  let width = window.innerWidth;
  let height = window.innerHeight;

  if (width / height > aspectRatio) {
    width = height * aspectRatio;
  } else {
    height = width / aspectRatio;
  }

  const dpr = window.devicePixelRatio || 1;
  canvasWidth = width;
  canvasHeight = height;

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawRockBackground(): void {
  ctx.fillStyle = '#3A2E28';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const noiseDensity = 0.15;
  const totalPixels = canvasWidth * canvasHeight;
  const noiseCount = Math.floor(totalPixels * noiseDensity * 0.01);

  for (let i = 0; i < noiseCount; i++) {
    const x = Math.random() * canvasWidth;
    const y = Math.random() * canvasHeight;
    const size = Math.random() * 2 + 0.5;
    const brightness = Math.random();

    if (brightness > 0.5) {
      const alpha = (brightness - 0.5) * 0.12;
      ctx.fillStyle = `rgba(90, 78, 68, ${alpha})`;
    } else {
      const alpha = (0.5 - brightness) * 0.12;
      ctx.fillStyle = `rgba(38, 28, 22, ${alpha})`;
    }

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 8; i++) {
    const x = Math.random() * canvasWidth;
    const y = Math.random() * canvasHeight;
    const radius = 30 + Math.random() * 80;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    const isLight = Math.random() > 0.5;

    if (isLight) {
      gradient.addColorStop(0, 'rgba(74, 62, 52, 0.06)');
      gradient.addColorStop(1, 'rgba(74, 62, 52, 0)');
    } else {
      gradient.addColorStop(0, 'rgba(42, 32, 26, 0.08)');
      gradient.addColorStop(1, 'rgba(42, 32, 26, 0)');
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function handlePointerDown(e: PointerEvent): void {
  if (e.target !== canvas) return;

  const coords = getCanvasCoords(e.clientX, e.clientY);
  lastMouseX = coords.x;
  lastMouseY = coords.y;
  isDragging = true;
  dragStartTime = Date.now();
  canvas.setPointerCapture(e.pointerId);
}

function handlePointerMove(e: PointerEvent): void {
  if (!isDragging) return;

  const coords = getCanvasCoords(e.clientX, e.clientY);
  const minRadius = isMobile ? 8 : 8;
  const maxRadius = isMobile ? 12 : 16;

  addSporesAlongPath(
    lastMouseX,
    lastMouseY,
    coords.x,
    coords.y,
    settings as SporeSettings,
    minRadius,
    maxRadius
  );

  lastMouseX = coords.x;
  lastMouseY = coords.y;
}

function handlePointerUp(e: PointerEvent): void {
  if (!isDragging) return;

  const now = Date.now();
  const dragDuration = now - dragStartTime;
  const coords = getCanvasCoords(e.clientX, e.clientY);
  const dist = Math.sqrt(
    (coords.x - lastMouseX) ** 2 + (coords.y - lastMouseY) ** 2
  );

  if (dragDuration < 200 && dist < 10) {
    addSeed(coords.x, coords.y);
  }

  isDragging = false;
  try {
    canvas.releasePointerCapture(e.pointerId);
  } catch {
    // pointer capture may already be released
  }
}

function handleTimeButtonClick(): void {
  if (Date.now() < timeBoostEndTime) return;

  timeMultiplier = 10;
  timeBoostEndTime = Date.now() + 5000;
  timeButton.classList.add('active');
  warmingOverlay.style.opacity = '0.2';

  setTimeout(() => {
    timeMultiplier = 1;
    timeButton.classList.remove('active');
    warmingOverlay.style.opacity = '0';
  }, 5000);
}

function animate(): void {
  animationTime += 1 / 60;

  drawRockBackground();

  updateSpores(settings as SporeSettings, timeMultiplier, canvasWidth, canvasHeight);
  updateSeeds(timeMultiplier);

  renderSeeds(ctx, animationTime);
  renderSpores(ctx);

  requestAnimationFrame(animate);
}

function init(): void {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  settings = getSettings();
  createPanel((newSettings) => {
    settings = newSettings;
  });

  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('pointercancel', handlePointerUp);
  canvas.addEventListener('pointerleave', handlePointerUp);

  timeButton.addEventListener('click', handleTimeButtonClick);

  animate();
}

init();
