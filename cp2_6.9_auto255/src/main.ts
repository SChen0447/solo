import { CrowdSimulator } from './crowd';
import { UIController } from './ui';

function init(): void {
  const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
  const container = document.getElementById('canvas-container') as HTMLElement;
  if (!canvas || !container) {
    console.error('Required DOM elements not found');
    return;
  }

  function resizeCanvas(): void {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    simulator.resize(canvas.width, canvas.height);
  }

  const simulator = new CrowdSimulator(canvas);
  const ui = new UIController(simulator);

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  let isDragging = false;
  let lastClickTime = 0;
  const doubleClickThreshold = 300;

  canvas.addEventListener('mousedown', (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (e.button === 0) {
      isDragging = true;
      simulator.setPreviewObstacle(x, y);
    }
  });

  canvas.addEventListener('mousemove', (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging) {
      simulator.setPreviewObstacle(x, y);
    }

    if (simulator.guide.active && e.shiftKey) {
      simulator.setGuideTarget(x, y);
    }
  });

  canvas.addEventListener('mouseup', (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const now = performance.now();

    if (isDragging) {
      const timeDiff = now - lastClickTime;
      if (timeDiff < doubleClickThreshold) {
        if (!simulator.removeObstacleAt(x, y)) {
          simulator.togglePedestrianPath(x, y);
        }
      } else {
        simulator.addUserObstacle(x, y);
      }
      lastClickTime = now;
      isDragging = false;
      simulator.setPreviewObstacle(null, null);
    }
  });

  canvas.addEventListener('mouseleave', () => {
    isDragging = false;
    simulator.setPreviewObstacle(null, null);
  });

  canvas.addEventListener('dblclick', (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (!simulator.removeObstacleAt(x, y)) {
      simulator.togglePedestrianPath(x, y);
    }
  });

  canvas.addEventListener('wheel', (e: WheelEvent) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    simulator.setScale(simulator.scale * zoomFactor, x, y);
  }, { passive: false });

  let lastTime = performance.now();

  function animate(now: number): void {
    const dt = now - lastTime;
    lastTime = now;

    simulator.update(dt, now);
    simulator.render(now);
    ui.updateFPS(now);

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
