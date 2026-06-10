import { ParticleEngine } from './particles';
import {
  FireworkSystem,
  ThemeName,
  getThemePrimaryColor
} from './fireworks';

const canvas = document.getElementById('fireworks-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
const autoToggle = document.getElementById('auto-toggle') as HTMLInputElement;

const particleEngine = new ParticleEngine();
const fireworkSystem = new FireworkSystem(particleEngine);

let isDragging = false;
let lastDragTime = 0;
let lastX = 0;
let lastY = 0;
let dragTimer: number | null = null;

let autoFireworkEnabled = false;
let autoFireworkTimer: number | null = null;

let frameCount = 0;
let lastFpsCheck = performance.now();
let currentFps = 60;
let lowFpsMode = false;
let frameToggle = false;

let resizeTimer: number | null = null;

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  particleEngine.setCanvasSize(width, height);
}

function debouncedResize(): void {
  if (resizeTimer !== null) {
    clearTimeout(resizeTimer);
  }
  resizeTimer = window.setTimeout(() => {
    resizeCanvas();
    resizeTimer = null;
  }, 100);
}

function getCanvasPosition(e: MouseEvent | Touch): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function handleClick(e: MouseEvent): void {
  if (isDragging) return;
  const pos = getCanvasPosition(e);
  fireworkSystem.spawnFirework(pos.x, pos.y, 1);
}

function handleMouseDown(e: MouseEvent): void {
  isDragging = true;
  const pos = getCanvasPosition(e);
  lastX = pos.x;
  lastY = pos.y;
  lastDragTime = performance.now();

  dragTimer = window.setInterval(() => {
    if (isDragging) {
      fireworkSystem.spawnFirework(lastX, lastY, 0.6);
    }
  }, 200);
}

function handleMouseMove(e: MouseEvent): void {
  if (!isDragging) return;
  const pos = getCanvasPosition(e);
  const now = performance.now();
  const dt = Math.max(1, now - lastDragTime);
  const dx = pos.x - lastX;
  const dy = pos.y - lastY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const speed = dist / (dt / 16.67);

  const dotCount = Math.max(1, Math.floor(dist / 5));
  for (let i = 0; i < dotCount; i++) {
    const t = i / dotCount;
    const x = lastX + dx * t;
    const y = lastY + dy * t;
    const size = 4 + Math.random() * 4 * (1 - t * 0.5);
    fireworkSystem.addTrailDot(x, y, speed, size);
  }

  lastX = pos.x;
  lastY = pos.y;
  lastDragTime = now;
}

function handleMouseUp(): void {
  isDragging = false;
  if (dragTimer !== null) {
    clearInterval(dragTimer);
    dragTimer = null;
  }
}

function handleTouchStart(e: TouchEvent): void {
  e.preventDefault();
  if (e.touches.length === 0) return;
  const touch = e.touches[0];
  isDragging = true;
  const pos = getCanvasPosition(touch);
  lastX = pos.x;
  lastY = pos.y;
  lastDragTime = performance.now();

  dragTimer = window.setInterval(() => {
    if (isDragging) {
      fireworkSystem.spawnFirework(lastX, lastY, 0.6);
    }
  }, 200);
}

function handleTouchMove(e: TouchEvent): void {
  e.preventDefault();
  if (!isDragging || e.touches.length === 0) return;
  const touch = e.touches[0];
  const pos = getCanvasPosition(touch);
  const now = performance.now();
  const dt = Math.max(1, now - lastDragTime);
  const dx = pos.x - lastX;
  const dy = pos.y - lastY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const speed = dist / (dt / 16.67);

  const dotCount = Math.max(1, Math.floor(dist / 5));
  for (let i = 0; i < dotCount; i++) {
    const t = i / dotCount;
    const x = lastX + dx * t;
    const y = lastY + dy * t;
    const size = 4 + Math.random() * 4 * (1 - t * 0.5);
    fireworkSystem.addTrailDot(x, y, speed, size);
  }

  lastX = pos.x;
  lastY = pos.y;
  lastDragTime = now;
}

function handleTouchEnd(e: TouchEvent): void {
  e.preventDefault();
  if (e.touches.length === 0) {
    if (!isDragging && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      const pos = getCanvasPosition(touch);
      fireworkSystem.spawnFirework(pos.x, pos.y, 1);
    }
    isDragging = false;
    if (dragTimer !== null) {
      clearInterval(dragTimer);
      dragTimer = null;
    }
  }
}

function updateControlColors(theme: ThemeName): void {
  const primary = getThemePrimaryColor(theme);

  themeSelect.classList.add('fade-transition');
  clearBtn.classList.add('fade-transition');
  autoToggle.classList.add('fade-transition');

  themeSelect.style.backgroundColor = primary;
  clearBtn.style.backgroundColor = primary;

  if (autoToggle.checked) {
    autoToggle.style.backgroundColor = primary;
  }

  setTimeout(() => {
    themeSelect.classList.remove('fade-transition');
    clearBtn.classList.remove('fade-transition');
    autoToggle.classList.remove('fade-transition');
  }, 500);
}

function handleThemeChange(): void {
  const theme = themeSelect.value as ThemeName;
  fireworkSystem.setTheme(theme);
  updateControlColors(theme);
}

function handleClear(): void {
  particleEngine.clearAll();
}

function handleAutoToggle(): void {
  autoFireworkEnabled = autoToggle.checked;
  const theme = fireworkSystem.getTheme();
  updateControlColors(theme);

  if (autoFireworkEnabled) {
    autoFireworkTimer = window.setInterval(() => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const x = Math.random() * width * 0.8 + width * 0.1;
      const y = Math.random() * height * 0.5 + height * 0.1;
      fireworkSystem.spawnFirework(x, y, 0.8);
    }, 3000);
  } else {
    if (autoFireworkTimer !== null) {
      clearInterval(autoFireworkTimer);
      autoFireworkTimer = null;
    }
  }
}

function animate(): void {
  const now = performance.now();
  frameCount++;

  if (now - lastFpsCheck >= 1000) {
    currentFps = frameCount;
    frameCount = 0;
    lastFpsCheck = now;

    if (currentFps < 50) {
      lowFpsMode = true;
    } else if (currentFps >= 58) {
      lowFpsMode = false;
    }
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  ctx.fillStyle = 'rgba(11, 13, 23, 0.15)';
  ctx.fillRect(0, 0, width, height);

  const skipUpdate = lowFpsMode && frameToggle;
  frameToggle = !frameToggle;

  fireworkSystem.update();
  particleEngine.update(lowFpsMode, skipUpdate);

  particleEngine.render(ctx);
  fireworkSystem.render(ctx);

  requestAnimationFrame(animate);
}

function init(): void {
  resizeCanvas();

  window.addEventListener('resize', debouncedResize);

  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
  canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

  themeSelect.addEventListener('change', handleThemeChange);
  clearBtn.addEventListener('click', handleClear);
  autoToggle.addEventListener('change', handleAutoToggle);

  updateControlColors(fireworkSystem.getTheme());

  animate();
}

init();
