import { CollageManager } from './collage';
import { UIController } from './ui';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement | null;
  const loadingOverlay = document.getElementById('loadingOverlay');

  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  try {
    const collage = new CollageManager(canvas);
    const ui = new UIController(collage, canvas);

    ui.resizeCanvas();
    window.addEventListener('resize', () => {
      ui.resizeCanvas();
      collage.requestRedraw();
    });

    setTimeout(() => {
      if (loadingOverlay) {
        loadingOverlay.classList.add('fade-out');
        setTimeout(() => {
          loadingOverlay.remove();
        }, 500);
      }
    }, 300);

    (window as any).__collage = collage;
    (window as any).__ui = ui;
  } catch (err) {
    console.error('Failed to initialize app:', err);
    if (loadingOverlay) {
      loadingOverlay.innerHTML = '<div style="color:#e94560;font-size:14px">初始化失败，请刷新重试</div>';
    }
  }
});
