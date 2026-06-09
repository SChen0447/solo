import './style.css';
import { KaleidoscopeGenerator, type KaleidoscopeParams } from './generator';
import { UIController } from './uiController';
import { ExportManager } from './exportManager';

const CANVAS_SIZE = 800;

function initApp(): void {
  const canvas = document.getElementById(
    'kaleidoscopeCanvas'
  ) as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;

  const fpsDisplay = document.getElementById('fpsDisplay');

  const uiController = new UIController(document, {
    onParamsChange: (params) => {
      generator.setParams(params);
    },
    onExport: () => {
      ExportManager.exportPng(canvas, (target) => {
        generator.renderToCanvas(target);
      }, 2);
    }
  });

  const initialParams: KaleidoscopeParams = uiController.getCurrentParams();
  const generator = new KaleidoscopeGenerator(canvas, initialParams);

  if (fpsDisplay) {
    generator.setOnFpsUpdate((fps) => {
      fpsDisplay.textContent = `${fps} FPS`;
    });
  }

  generator.start();
}

document.addEventListener('DOMContentLoaded', initApp);
