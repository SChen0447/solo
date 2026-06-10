import { MirrorEngine, MirrorAxis, MirroredPoint } from './mirrorEngine';
import { DrawController, Stroke } from './drawController';
import { Renderer } from './renderer';

function initApp(): void {
  const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const mirrorEngine = new MirrorEngine(canvas.width, canvas.height);
  const renderer = new Renderer(canvas, mirrorEngine);
  const drawController = new DrawController(canvas, mirrorEngine);

  drawController.onDrawCallback((paths: MirroredPoint[][], stroke: Stroke) => {
    renderer.setCurrentStroke(paths, stroke);
  });

  drawController.onStrokeCompleteCallback((stroke: Stroke) => {
    renderer.commitStroke(stroke);
  });

  const brushSizeGroup = document.getElementById('brushSizeGroup');
  if (brushSizeGroup) {
    brushSizeGroup.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('brush-size-btn')) {
        const buttons = brushSizeGroup.querySelectorAll('.brush-size-btn');
        buttons.forEach((btn) => btn.classList.remove('active'));
        target.classList.add('active');
        const size = parseInt(target.dataset.size || '3', 10);
        drawController.setBrushSize(size);
      }
    });
  }

  const colorPalette = document.getElementById('colorPalette');
  if (colorPalette) {
    colorPalette.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('color-swatch')) {
        const swatches = colorPalette.querySelectorAll('.color-swatch');
        swatches.forEach((sw) => sw.classList.remove('active'));
        target.classList.add('active');
        const color = target.dataset.color || '#e94560';
        drawController.setColor(color);
      }
    });
  }

  const gradientToggle = document.getElementById('gradientToggle');
  if (gradientToggle) {
    gradientToggle.addEventListener('click', () => {
      gradientToggle.classList.toggle('active');
      drawController.setGradient(gradientToggle.classList.contains('active'));
    });
  }

  const axisGroup = document.getElementById('axisGroup');
  if (axisGroup) {
    axisGroup.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('axis-btn')) {
        const buttons = axisGroup.querySelectorAll('.axis-btn');
        buttons.forEach((btn) => btn.classList.remove('active'));
        target.classList.add('active');
        const axis = (target.dataset.axis || 'vertical') as MirrorAxis;
        renderer.startAxisTransition();
        mirrorEngine.setAxis(axis);
        renderer.forceRedraw();
      }
    });
  }

  const layerSlider = document.getElementById('layerSlider') as HTMLInputElement;
  const layerValue = document.getElementById('layerValue');
  if (layerSlider && layerValue) {
    layerSlider.addEventListener('input', () => {
      const layers = parseInt(layerSlider.value, 10);
      layerValue.textContent = String(layers);
      renderer.startAxisTransition();
      mirrorEngine.setLayers(layers);
      renderer.forceRedraw();
    });
  }

  const clearBtn = document.getElementById('clearBtn');
  const canvasWrapper = canvas.parentElement;
  if (clearBtn && canvasWrapper) {
    clearBtn.addEventListener('click', () => {
      canvasWrapper.classList.add('fade-out');
      renderer.startClearAnimation();
      setTimeout(() => {
        drawController.clearStrokes();
        renderer.clearImmediately();
        canvasWrapper.classList.remove('fade-out');
      }, 300);
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
