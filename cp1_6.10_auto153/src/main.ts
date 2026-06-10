import { CalligraphyEngine, EngineConfig } from './CalligraphyEngine';
import { UIManager } from './UIManager';

const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element not found');
}

const initialConfig: EngineConfig = {
  brushSize: 12,
  inkOpacity: 0.8,
  diffusionSpeed: 1.0
};

const engine = new CalligraphyEngine(canvas, initialConfig);

const uiManager = new UIManager({
  onBrushSizeChange: (value: number) => {
    engine.setConfig({ brushSize: value });
  },
  onInkOpacityChange: (value: number) => {
    engine.setConfig({ inkOpacity: value });
  },
  onDiffusionSpeedChange: (value: number) => {
    engine.setConfig({ diffusionSpeed: value });
  },
  onClear: () => {
    engine.clear();
  },
  onToggleFullscreen: () => {
    toggleFullscreen();
  }
});

function getCanvasCoordinates(e: MouseEvent | Touch): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function handlePointerDown(e: MouseEvent): void {
  e.preventDefault();
  const { x, y } = getCanvasCoordinates(e);
  engine.startStroke(x, y);
}

function handlePointerMove(e: MouseEvent): void {
  e.preventDefault();
  const { x, y } = getCanvasCoordinates(e);
  engine.continueStroke(x, y);
}

function handlePointerUp(): void {
  engine.endStroke();
}

function handleTouchStart(e: TouchEvent): void {
  e.preventDefault();
  if (e.touches.length > 0) {
    const { x, y } = getCanvasCoordinates(e.touches[0]);
    engine.startStroke(x, y);
  }
}

function handleTouchMove(e: TouchEvent): void {
  e.preventDefault();
  if (e.touches.length > 0) {
    const { x, y } = getCanvasCoordinates(e.touches[0]);
    engine.continueStroke(x, y);
  }
}

function handleTouchEnd(): void {
  engine.endStroke();
}

canvas.addEventListener('mousedown', handlePointerDown);
canvas.addEventListener('mousemove', handlePointerMove);
canvas.addEventListener('mouseup', handlePointerUp);
canvas.addEventListener('mouseleave', handlePointerUp);

canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd);
canvas.addEventListener('touchcancel', handleTouchEnd);

function toggleFullscreen(): void {
  const container = document.getElementById('app');
  if (!container) return;

  if (!document.fullscreenElement) {
    container.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

let resizeTimeout: number | null = null;
window.addEventListener('resize', () => {
  if (resizeTimeout !== null) {
    window.clearTimeout(resizeTimeout);
  }
  resizeTimeout = window.setTimeout(() => {
    engine.resize();
  }, 100);
});

let lastCounterUpdate = 0;

function animate(now: number): void {
  engine.update(now);
  engine.render();

  if (now - lastCounterUpdate > 200) {
    uiManager.updateParticleCount(engine.getParticleCount());
    lastCounterUpdate = now;
  }

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
