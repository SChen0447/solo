import { OrigamiModel } from './origamiModel';
import { OrigamiRenderer } from './renderer';
import './style.css';

function bootstrap(): void {
  const stageEl = document.getElementById('origami-stage');
  const progressEl = document.getElementById('progress-value');
  const toggleBtn = document.getElementById('toggle-button');
  const toggleText = document.getElementById('toggle-text');

  if (!stageEl || !progressEl || !toggleBtn || !toggleText) {
    console.error('Missing required DOM elements');
    return;
  }

  const model = new OrigamiModel();

  const renderer = new OrigamiRenderer(model, stageEl, {
    onProgressUpdate: (percent: string) => {
      progressEl.textContent = percent;
    },
    onFoldStateChange: (isFolded: boolean) => {
      toggleText.textContent = isFolded ? '展开' : '折叠';
    }
  });

  toggleBtn.addEventListener('click', () => {
    renderer.toggleFold();
  });

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
      renderer.toggleFold();
    }
  });

  renderer.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
