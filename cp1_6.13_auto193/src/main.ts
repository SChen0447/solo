import { FeatherManager } from './FeatherManager';
import { setupControls } from './controls';

function init(): void {
  const canvas = document.getElementById('scroll-canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const manager = new FeatherManager(canvas);
  setupControls(manager);

  window.addEventListener('beforeunload', () => {
    manager.destroy();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
