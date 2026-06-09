import { Sundial } from './sundial.js';

function init(): void {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.classList.add('hidden');
    setTimeout(() => {
      loading.remove();
    }, 600);
  }

  const container = document.getElementById('sundialContainer') as HTMLElement;
  const shadowMask = document.getElementById('shadowMask') as HTMLElement;
  const romanNumerals = document.getElementById('romanNumerals') as HTMLElement;
  const timeDisplay = document.getElementById('timeDisplay') as HTMLElement;
  const canvas = document.getElementById('particleCanvas') as HTMLCanvasElement;

  if (!container || !shadowMask || !romanNumerals || !timeDisplay || !canvas) {
    console.error('无法找到必要的DOM元素');
    return;
  }

  const sundial = new Sundial(
    container,
    shadowMask,
    romanNumerals,
    timeDisplay,
    canvas
  );

  let lastTime = performance.now();
  let animationFrameId: number;

  function animate(currentTime: number): void {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    sundial.update();
    sundial.render();

    animationFrameId = requestAnimationFrame(animate);
  }

  animationFrameId = requestAnimationFrame(animate);

  window.addEventListener('beforeunload', () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
