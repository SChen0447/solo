import { CultureDish } from './dish';
import { UI } from './ui';

const CANVAS_SIZE = 800;
const CELL_SIZE = 8;
const MAX_GENERATIONS_PER_FRAME = 5;

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style.display = 'block';
  canvas.style.imageRendering = 'pixelated';
  return canvas;
}

function main(): void {
  const container = document.getElementById('app');
  if (!container) {
    console.error('App container not found');
    return;
  }

  const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  const dish = new CultureDish(canvas, CELL_SIZE);

  let speed = 1;
  let accumulatedSteps = 0;
  let lastTime = performance.now();

  const ui = new UI({
    container,
    dish,
    onSpeedChange: (s: number) => {
      speed = s;
    },
  });

  dish.setStatsCallback((stats) => {
    ui.updateStats(stats);
  });

  ui.updateStats(dish.getStats());

  function frame(now: number): void {
    const dt = now - lastTime;
    lastTime = now;

    accumulatedSteps += speed * (dt / 1000) * 60;
    const stepsToRun = Math.min(
      Math.floor(accumulatedSteps),
      MAX_GENERATIONS_PER_FRAME
    );

    if (stepsToRun > 0) {
      dish.step(stepsToRun);
      accumulatedSteps -= stepsToRun;
    }

    dish.render();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

document.addEventListener('DOMContentLoaded', main);
