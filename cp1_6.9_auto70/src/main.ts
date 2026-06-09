import { Kaleidoscope } from './kaleidoscope';
import { initUI, updateFpsDisplay } from './ui';
import { saveCanvasAsPNG } from './save';

function bootstrap(): void {
  const canvas = document.getElementById('kaleidoscope-canvas') as HTMLCanvasElement | null;
  const controlPanel = document.getElementById('control-panel') as HTMLElement | null;
  const saveBtn = document.getElementById('save-btn') as HTMLButtonElement | null;
  const fpsCounter = document.getElementById('fps-counter') as HTMLElement | null;

  if (!canvas || !controlPanel || !saveBtn) {
    console.error('必要的 DOM 元素未找到');
    return;
  }

  const kaleidoscope = new Kaleidoscope(canvas);

  initUI(controlPanel, kaleidoscope);

  if (fpsCounter) {
    kaleidoscope.setFpsCallback((fps) => updateFpsDisplay(fpsCounter, fps));
  }

  saveBtn.addEventListener('click', () => {
    saveCanvasAsPNG(canvas);
  });

  kaleidoscope.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
