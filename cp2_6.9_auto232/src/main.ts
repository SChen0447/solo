import './style.css';
import { createFontEngine } from './fontEngine';
import { setupUIControls } from './uiControls';

const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
const engine = createFontEngine(canvas);

let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

function handleResize() {
  engine.resizeCanvas();
}

function handleMouseDown(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('.control-panel, .text-input')) return;
  isDragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  canvas.classList.add('dragging');
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging) return;
  const dx = e.clientX - lastMouseX;
  const dy = e.clientY - lastMouseY;
  const state = engine.getState();
  engine.setParams({
    positionX: state.params.positionX + dx,
    positionY: state.params.positionY + dy,
  });
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
}

function handleMouseUp() {
  isDragging = false;
  canvas.classList.remove('dragging');
}

function handleTouchStart(e: TouchEvent) {
  if ((e.target as HTMLElement).closest('.control-panel, .text-input')) return;
  if (e.touches.length === 1) {
    isDragging = true;
    lastMouseX = e.touches[0].clientX;
    lastMouseY = e.touches[0].clientY;
    canvas.classList.add('dragging');
  }
}

function handleTouchMove(e: TouchEvent) {
  if (!isDragging || e.touches.length !== 1) return;
  const dx = e.touches[0].clientX - lastMouseX;
  const dy = e.touches[0].clientY - lastMouseY;
  const state = engine.getState();
  engine.setParams({
    positionX: state.params.positionX + dx,
    positionY: state.params.positionY + dy,
  });
  lastMouseX = e.touches[0].clientX;
  lastMouseY = e.touches[0].clientY;
  e.preventDefault();
}

function handleTouchEnd() {
  isDragging = false;
  canvas.classList.remove('dragging');
}

let lastFrameTime = 0;
const TARGET_FPS = 60;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

function animate(currentTime: number) {
  const elapsed = currentTime - lastFrameTime;
  if (elapsed >= FRAME_INTERVAL) {
    lastFrameTime = currentTime - (elapsed % FRAME_INTERVAL);
    engine.renderFrame();
  }
  requestAnimationFrame(animate);
}

function init() {
  engine.resizeCanvas();
  setupUIControls(engine);

  window.addEventListener('resize', handleResize);
  canvas.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: true });

  requestAnimationFrame(animate);
}

init();
