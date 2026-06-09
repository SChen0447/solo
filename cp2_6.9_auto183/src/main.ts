import { PotteryController } from './controller';
import { PotteryRenderer } from './renderer';
import { UIManager } from './ui';

let lastTime = 0;
let animationId = 0;

function main(): void {
  const canvas = document.getElementById('pottery-canvas') as HTMLCanvasElement;
  const container = document.getElementById('canvas-container') as HTMLElement;

  if (!canvas || !container) {
    console.error('Failed to find required DOM elements');
    return;
  }

  const controller = new PotteryController();
  const renderer = new PotteryRenderer(canvas);
  const ui = new UIManager(controller, canvas, container);

  ui.init();

  function resizeCanvas(): void {
    const size = ui.getCanvasSize();
    renderer.resize(size.width, size.height);
  }

  resizeCanvas();
  canvas.addEventListener('canvas-resize', resizeCanvas as EventListener);

  function getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  canvas.addEventListener('mousedown', (e: MouseEvent) => {
    const coords = getCanvasCoords(e);
    controller.onMouseDown(coords.x, coords.y);
  });

  canvas.addEventListener('mousemove', (e: MouseEvent) => {
    const coords = getCanvasCoords(e);
    controller.onMouseMove(coords.x, coords.y, ui.getCanvasSize());
  });

  canvas.addEventListener('mouseup', (e: MouseEvent) => {
    const coords = getCanvasCoords(e);
    controller.onMouseUp(coords.x, coords.y, ui.getCanvasSize());
  });

  canvas.addEventListener('mouseleave', (e: MouseEvent) => {
    const coords = getCanvasCoords(e);
    controller.onMouseUp(coords.x, coords.y, ui.getCanvasSize());
  });

  canvas.addEventListener('wheel', (e: WheelEvent) => {
    e.preventDefault();
    controller.onWheel(e.deltaY);
  }, { passive: false });

  canvas.addEventListener('touchstart', (e: TouchEvent) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      const coords = getCanvasCoords(touch);
      controller.onMouseDown(coords.x, coords.y);
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e: TouchEvent) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      const coords = getCanvasCoords(touch);
      controller.onMouseMove(coords.x, coords.y, ui.getCanvasSize());
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e: TouchEvent) => {
    const touch = e.changedTouches[0];
    if (touch) {
      const coords = getCanvasCoords(touch);
      controller.onMouseUp(coords.x, coords.y, ui.getCanvasSize());
    }
  });

  function render(time: number): void {
    const deltaTime = lastTime ? time - lastTime : 16;
    lastTime = time;

    controller.update(deltaTime);
    renderer.render(controller.getShapeData());

    animationId = requestAnimationFrame(render);
  }

  animationId = requestAnimationFrame(render);

  window.addEventListener('beforeunload', () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    ui.destroy();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
