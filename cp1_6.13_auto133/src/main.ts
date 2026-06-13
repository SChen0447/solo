import { GameManager } from './GameManager';

function init(): void {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const game = new GameManager(canvas);
  game.run();
}

window.addEventListener('DOMContentLoaded', init);
