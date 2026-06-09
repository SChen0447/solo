import { ParticleSystem, ColorTheme, MouseState, Settings } from './particleSystem';
import { Renderer } from './renderer';

const CANVAS_BASE_WIDTH = 1000;
const CANVAS_BASE_HEIGHT = 600;

const canvas = document.getElementById('smoke-canvas') as HTMLCanvasElement;
const fpsText = document.getElementById('fps-text') as HTMLSpanElement;
const particleCountText = document.getElementById('particle-count') as HTMLSpanElement;
const densitySlider = document.getElementById('density-slider') as HTMLInputElement;
const densityValue = document.getElementById('density-value') as HTMLSpanElement;
const lifetimeSlider = document.getElementById('lifetime-slider') as HTMLInputElement;
const lifetimeValue = document.getElementById('lifetime-value') as HTMLSpanElement;
const themeSwitcher = document.getElementById('theme-switcher') as HTMLDivElement;

const settings: Settings = {
  maxParticles: 300,
  particleLifetime: 12,
  colorTheme: 'warm'
};

const particleSystem = new ParticleSystem(settings);
const renderer = new Renderer(canvas);

const mouseState: MouseState = {
  x: 0,
  y: 0,
  isInside: false,
  isPressed: false,
  lastX: 0,
  lastY: 0
};

let currentScale = 1;

function getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

canvas.addEventListener('mouseenter', () => {
  mouseState.isInside = true;
});

canvas.addEventListener('mouseleave', () => {
  mouseState.isInside = false;
  mouseState.isPressed = false;
});

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  const coords = getCanvasCoords(e.clientX, e.clientY);
  mouseState.lastX = mouseState.x;
  mouseState.lastY = mouseState.y;
  mouseState.x = coords.x;
  mouseState.y = coords.y;
});

canvas.addEventListener('mousedown', (e: MouseEvent) => {
  if (e.button === 0) {
    mouseState.isPressed = true;
    const coords = getCanvasCoords(e.clientX, e.clientY);
    mouseState.x = coords.x;
    mouseState.y = coords.y;
    mouseState.lastX = coords.x;
    mouseState.lastY = coords.y;
  }
});

canvas.addEventListener('mouseup', (e: MouseEvent) => {
  if (e.button === 0) {
    mouseState.isPressed = false;
  }
});

canvas.addEventListener('contextmenu', (e: MouseEvent) => {
  e.preventDefault();
});

densitySlider.addEventListener('input', () => {
  const value = parseInt(densitySlider.value);
  densityValue.textContent = value.toString();
  particleSystem.setMaxParticles(value);
});

lifetimeSlider.addEventListener('input', () => {
  const value = parseInt(lifetimeSlider.value);
  lifetimeValue.textContent = value.toString();
  particleSystem.setLifetime(value);
});

themeSwitcher.addEventListener('click', (e: Event) => {
  const target = e.target as HTMLElement;
  const themeOption = target.closest('.theme-option') as HTMLDivElement;
  if (!themeOption) return;

  const theme = themeOption.dataset.theme as ColorTheme;
  if (!theme) return;

  document.querySelectorAll('.theme-option').forEach(el => {
    el.classList.remove('active');
  });
  themeOption.classList.add('active');
  particleSystem.setColorTheme(theme);
});

function handleResize(): void {
  const wrapper = document.getElementById('canvas-wrapper') as HTMLDivElement;
  const wrapperWidth = wrapper.clientWidth;
  const newCanvasWidth = wrapperWidth;
  const newScale = newCanvasWidth / CANVAS_BASE_WIDTH;

  const scaleRatio = newScale / currentScale;
  currentScale = newScale;

  renderer.resize(newCanvasWidth, CANVAS_BASE_HEIGHT);
  particleSystem.resize(scaleRatio, 1);
}

window.addEventListener('resize', handleResize);

let lastTime = performance.now();
let frameCount = 0;
let fpsTimer = 0;
let currentFps = 60;

function gameLoop(timestamp: number): void {
  const deltaTime = Math.min(timestamp - lastTime, 50);
  lastTime = timestamp;

  frameCount++;
  fpsTimer += deltaTime;
  if (fpsTimer >= 1000) {
    currentFps = Math.round((frameCount * 1000) / fpsTimer);
    fpsText.textContent = `FPS: ${currentFps}`;
    if (currentFps < 30) {
      fpsText.classList.add('warning');
    } else {
      fpsText.classList.remove('warning');
    }
    particleCountText.textContent = `粒子: ${particleSystem.getParticleCount()}`;
    frameCount = 0;
    fpsTimer = 0;
  }

  particleSystem.update(deltaTime, mouseState);
  renderer.render(particleSystem.getParticles(), particleSystem);

  mouseState.lastX = mouseState.x;
  mouseState.lastY = mouseState.y;

  requestAnimationFrame(gameLoop);
}

handleResize();
requestAnimationFrame(gameLoop);
