import { Game } from './game';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const scanCanvas = document.getElementById('scanlines-canvas') as HTMLCanvasElement;

  if (!canvas || !scanCanvas) {
    console.error('Canvas elements not found');
    return;
  }

  const game = new Game(canvas, scanCanvas);

  window.addEventListener('beforeunload', () => {
    game.saveState();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      game.saveState();
    }
  });

  game.start();
});
