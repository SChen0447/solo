import { Game } from './Game';

function init(): void {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
  if (!canvas) {
    throw new Error('Canvas element not found');
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context');
  }

  const game = new Game(canvas, ctx);
  game.start();
}

init();
