import { createInitialState, updatePhysics, resetGame } from './physics';
import type { GameState } from './physics';
import { render } from './renderer';
import type { UIState } from './renderer';
import { createUIState, setupEventHandlers, updateUIState } from './ui';

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let state: GameState;
let uiState: UIState;
let cleanupHandlers: (() => void) | null = null;
let animationId: number | null = null;
let lastTime = 0;

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function getLogicalSize(): { w: number; h: number } {
  return {
    w: window.innerWidth,
    h: window.innerHeight
  };
}

function handleReset(): void {
  const { w } = getLogicalSize();
  state = resetGame(w);
  uiState = createUIState();
  if (cleanupHandlers) {
    cleanupHandlers();
  }
  cleanupHandlers = setupEventHandlers(canvas, state, uiState, { onReset: handleReset });
}

function gameLoop(currentTime: number): void {
  const dt = Math.min((currentTime - lastTime) / 1000, 1 / 30);
  lastTime = currentTime;

  const { w, h } = getLogicalSize();

  updatePhysics(state, dt, w, h);

  updateUIState(uiState, state);

  ctx.clearRect(0, 0, w, h);
  render(ctx, w, h, state, uiState);

  animationId = requestAnimationFrame(gameLoop);
}

function init(): void {
  canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const context = canvas.getContext('2d');
  if (!context) {
    console.error('Failed to get 2D context');
    return;
  }
  ctx = context;

  resizeCanvas();

  const { w } = getLogicalSize();
  state = createInitialState(w);
  uiState = createUIState();

  cleanupHandlers = setupEventHandlers(canvas, state, uiState, { onReset: handleReset });

  window.addEventListener('resize', () => {
    resizeCanvas();
    const { w } = getLogicalSize();
    state.ambientParticles.forEach(p => {
      if (p.x > w) p.x = Math.random() * w;
    });
  });

  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
