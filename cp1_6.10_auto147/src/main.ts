import { IllusionRenderer } from './illusionRenderer';
import { UIController } from './uiController';
import type { IllusionType, IllusionParams } from './illusionRenderer';

function init(): void {
  const canvas = document.getElementById('illusionCanvas') as HTMLCanvasElement | null;
  const fpsCounter = document.getElementById('fpsCounter');

  if (!canvas || !fpsCounter) {
    console.error('页面元素缺失');
    return;
  }

  const renderer = new IllusionRenderer(canvas);

  let renderScheduled = false;
  const scheduleRender = (illusion: IllusionType, params: IllusionParams) => {
    if (!renderScheduled) {
      renderScheduled = true;
      requestAnimationFrame(() => {
        renderer.render(illusion, params);
        renderScheduled = false;
      });
    }
  };

  const uiController = new UIController(
    (illusionType: IllusionType, params: IllusionParams) => {
      scheduleRender(illusionType, params);
    },
    (_illusionType: IllusionType) => {
    }
  );

  scheduleRender(uiController.getCurrentIllusion(), uiController.getCurrentParams());
  renderer.start();

  const updateFps = () => {
    const fps = renderer.getFps();
    fpsCounter.textContent = `${fps} FPS`;
    fpsCounter.className = 'fps-counter ' + (fps >= 50 ? 'fps-good' : fps >= 30 ? 'fps-ok' : 'fps-low');
  };
  setInterval(updateFps, 500);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
