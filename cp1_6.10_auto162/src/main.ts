import { CanvasEngine, type EngineParams } from './canvasEngine';
import { UIController } from './uiController';
import type { ThemeId } from './colorTheme';

const initialParams: EngineParams = {
  density: 0.6,
  pulseSpeed: 1.5,
  glowIntensity: 0.7,
  theme: 'nebula'
};

function getCanvasCoords(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
}

function init(): void {
  const canvas = document.getElementById('main-canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    throw new Error('找不到 Canvas 元素');
  }

  const engine = new CanvasEngine(canvas, initialParams);

  let isMouseDown = false;

  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isMouseDown = true;
    const { x, y } = getCanvasCoords(canvas, e.clientX, e.clientY);
    engine.startDrawing(x, y);
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isMouseDown) return;
    const { x, y } = getCanvasCoords(canvas, e.clientX, e.clientY);
    engine.updateDrawing(x, y);
  });

  window.addEventListener('mouseup', () => {
    if (isMouseDown) {
      isMouseDown = false;
      engine.endDrawing();
    }
  });

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length === 0) return;
    isMouseDown = true;
    const touch = e.touches[0];
    const { x, y } = getCanvasCoords(canvas, touch.clientX, touch.clientY);
    engine.startDrawing(x, y);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!isMouseDown || e.touches.length === 0) return;
    const touch = e.touches[0];
    const { x, y } = getCanvasCoords(canvas, touch.clientX, touch.clientY);
    engine.updateDrawing(x, y);
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (isMouseDown) {
      isMouseDown = false;
      engine.endDrawing();
    }
  }, { passive: false });

  new UIController({
    onDensityChange: (value: number) => {
      engine.setParams({ density: value });
    },
    onPulseChange: (value: number) => {
      engine.setParams({ pulseSpeed: value });
    },
    onGlowChange: (value: number) => {
      engine.setParams({ glowIntensity: value });
    },
    onThemeChange: (theme: ThemeId) => {
      engine.setParams({ theme });
    },
    onClear: () => {
      engine.clear();
    }
  });

  engine.start();
}

document.addEventListener('DOMContentLoaded', init);
