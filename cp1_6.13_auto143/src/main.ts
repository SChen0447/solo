import { StageManager } from './stage';
import { InteractionManager } from './interaction';

let stageManager: StageManager | null = null;
let interactionManager: InteractionManager | null = null;

function init(): void {
  const canvas = document.getElementById('stage-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const container = canvas.parentElement;
  if (!container) {
    console.error('Canvas container not found');
    return;
  }

  const stageWidth = container.clientWidth - 60;
  const stageHeight = container.clientHeight - 60;

  canvas.width = stageWidth;
  canvas.height = stageHeight;

  stageManager = new StageManager(canvas);
  stageManager.init(stageWidth, stageHeight);

  (window as any).stageManager = stageManager;

  interactionManager = new InteractionManager(stageManager);

  stageManager.loadScript('baishezhuan', true);

  setupLogoAnimation();

  window.addEventListener('resize', handleResize);
}

function setupLogoAnimation(): void {
  const logoOverlay = document.getElementById('logo-overlay');
  if (!logoOverlay) return;

  setTimeout(() => {
    logoOverlay.classList.add('hidden');
    
    setTimeout(() => {
      if (logoOverlay.parentNode) {
        logoOverlay.parentNode.removeChild(logoOverlay);
      }
    }, 1500);
  }, 3000);
}

function handleResize(): void {
  if (!stageManager) return;

  const canvas = stageManager.getCanvas();
  const container = canvas.parentElement;
  if (!container) return;

  const stageWidth = container.clientWidth - 60;
  const stageHeight = container.clientHeight - 60;

  canvas.width = stageWidth;
  canvas.height = stageHeight;

  stageManager.resize(stageWidth, stageHeight);
}

function destroy(): void {
  window.removeEventListener('resize', handleResize);
  interactionManager?.destroy();
  stageManager?.destroy();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { StageManager, InteractionManager, destroy };
