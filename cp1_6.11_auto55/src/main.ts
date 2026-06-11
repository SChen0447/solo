import { Game } from './game';

function init(): void {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const game = new Game(canvas);

  game.onLevelComplete(() => {
    console.log('游戏完成！按任意键重新开始');
  });

  game.start();

  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'escape') {
      game.stop();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
