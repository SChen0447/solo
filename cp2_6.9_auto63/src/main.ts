import { GameManager } from './GameManager';

function main(): void {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.remove();
  }

  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const game = new GameManager(canvas);

  window.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
    }
    game.handleKeyDown(e.key);
  });

  window.addEventListener('keyup', (e) => {
    game.handleKeyUp(e.key);
  });

  window.addEventListener('blur', () => {
    game.stop();
  });

  window.addEventListener('focus', () => {
    game.start();
  });

  game.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
