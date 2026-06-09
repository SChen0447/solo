import { StoneCanvas } from './stoneCanvas';
import { UIController } from './uiController';

const defaultOptions = {
  inkColor: '#333333',
  force: 1.0,
  brushSize: 12
};

function initApp(): void {
  const canvas = document.getElementById('stoneCanvas') as HTMLCanvasElement;
  const controlPanel = document.getElementById('controlPanel') as HTMLElement;

  if (!canvas || !controlPanel) {
    console.error('Required DOM elements not found');
    return;
  }

  const stoneCanvas = new StoneCanvas(canvas, defaultOptions);

  const uiController = new UIController(controlPanel, defaultOptions, {
    onOptionsChange: (options) => {
      stoneCanvas.updateOptions(options);
    },
    onReset: async () => {
      await stoneCanvas.reset();
    }
  });

  let resizeTimeout: number | null = null;
  window.addEventListener('resize', () => {
    if (resizeTimeout !== null) {
      clearTimeout(resizeTimeout);
    }
    resizeTimeout = window.setTimeout(() => {
      stoneCanvas.resize();
    }, 150);
  });

  window.addEventListener('beforeunload', () => {
    stoneCanvas.destroy();
    uiController.destroy();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
