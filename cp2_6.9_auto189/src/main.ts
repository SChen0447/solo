import { CANVAS_WIDTH, CANVAS_HEIGHT } from './config';
import { Ecosystem } from './ecosystem';
import { UIController } from './ui';

function main(): void {
  const canvas = document.getElementById('sim-canvas') as HTMLCanvasElement;
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Canvas 2D context unavailable');
    return;
  }

  const ecosystem = new Ecosystem(ctx);
  const ui = new UIController(ecosystem);

  let lastTime = performance.now();
  let frameCount = 0;
  let fps = 60;
  let fpsAccumulator = 0;

  function loop(now: number): void {
    const delta = now - lastTime;
    lastTime = now;
    frameCount++;
    fpsAccumulator += delta;
    if (fpsAccumulator >= 500) {
      fps = (frameCount * 1000) / fpsAccumulator;
      frameCount = 0;
      fpsAccumulator = 0;
    }

    ecosystem.update();
    ecosystem.render();
    ui.update(fps);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
