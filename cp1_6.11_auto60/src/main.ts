import { GameManager } from './GameManager';

function init(): void {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas element not found');
  }

  const gameManager = new GameManager(canvas);
  gameManager.start();

  window.addEventListener('resize', () => {
    gameManager.resize();
  });
}

document.addEventListener('DOMContentLoaded', init);
