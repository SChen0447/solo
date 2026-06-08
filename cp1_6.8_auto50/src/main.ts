import { GameEngine } from './gameEngine';
import { Renderer } from './renderer';
import { AudioManager } from './audioManager';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element not found');
}

const engine = new GameEngine();
const renderer = new Renderer(canvas, engine);
const audio = new AudioManager();

let lastTime = 0;
let animationId = 0;

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  renderer.resize(window.innerWidth, window.innerHeight, dpr);
}

function getCanvasPoint(clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function handlePointerDown(e: PointerEvent): void {
  e.preventDefault();
  const pt = getCanvasPoint(e.clientX, e.clientY);

  if (engine.state.isGameOver) {
    if (renderer.isPointOnRestartButton(pt.x, pt.y)) {
      engine.restart();
    }
    return;
  }

  audio.init();
  engine.startDrawing(pt.x, pt.y);
  canvas.setPointerCapture(e.pointerId);
}

function handlePointerMove(e: PointerEvent): void {
  if (!engine.isDrawingActive()) return;
  e.preventDefault();
  const pt = getCanvasPoint(e.clientX, e.clientY);
  engine.continueDrawing(pt.x, pt.y);
}

function handlePointerUp(e: PointerEvent): void {
  if (!engine.isDrawingActive()) return;
  e.preventDefault();

  const rune = engine.endDrawing();

  if (rune) {
    audio.playExplosion();
    setTimeout(() => {
      audio.playSuccess();
    }, 300);

    setTimeout(() => {
      const colors: Record<string, number> = {
        red: 523.25,
        blue: 659.25,
        green: 783.99,
        purple: 440,
        gold: 880,
      };
      const dominantColor = getDominantColor();
      if (dominantColor) {
        audio.playFluteScale(colors[dominantColor] || 523.25);
      }
    }, 600);
  } else if (!engine.state.isGameOver && engine.state.drawsLeft > 0) {
    audio.playFail();
  }

  canvas.releasePointerCapture(e.pointerId);
}

function getDominantColor(): string | null {
  const slots = engine.state.elementSlots;
  let maxColor: number = 0;
  let dominant: string | null = null;
  for (const [color, count] of Object.entries(slots)) {
    if (count > maxColor) {
      maxColor = count;
      dominant = color;
    }
  }
  return dominant;
}

function gameLoop(currentTime: number): void {
  const dt = Math.min(0.05, (currentTime - lastTime) / 1000);
  lastTime = currentTime;

  engine.update(dt);
  renderer.render();

  animationId = requestAnimationFrame(gameLoop);
}

function init(): void {
  resize();
  window.addEventListener('resize', resize);

  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('pointercancel', handlePointerUp);
  canvas.addEventListener('pointerleave', handlePointerUp);

  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);
}

init();
