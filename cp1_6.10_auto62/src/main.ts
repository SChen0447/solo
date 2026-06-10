import { Game } from './game';

function bootstrap(): void {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const game = new Game(canvas);

  let lastTime = performance.now();
  let rafId: number;

  function loop(currentTime: number): void {
    const deltaTime = Math.min(currentTime - lastTime, 50);
    lastTime = currentTime;

    game.update(deltaTime);
    game.render();

    rafId = requestAnimationFrame(loop);
  }

  rafId = requestAnimationFrame(loop);

  window.addEventListener('beforeunload', () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
