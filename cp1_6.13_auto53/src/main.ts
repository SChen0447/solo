import { PaintEngine } from './paintEngine.js';
import { UIController } from './uiController.js';
import { EngineConfig } from './sharedTypes.js';

function init(): void {
  const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const config: EngineConfig = {
    canvasWidth: 800,
    canvasHeight: 600,
    paperColor: { r: 245, g: 240, b: 228 },
    targetFPS: 60,
    physicsHz: 60
  };

  const engine = new PaintEngine(canvas, config);
  const ui = new UIController(engine);

  (window as unknown as { __paintApp: { engine: PaintEngine; ui: UIController } }).__paintApp = {
    engine,
    ui
  };

  setTimeout(() => {
    const halo = document.querySelector('.loading-halo');
    if (halo) {
      halo.remove();
    }
  }, 1600);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
