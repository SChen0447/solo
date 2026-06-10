import { Game } from './Game';
import { Renderer } from './Renderer';
import { Card } from './Card';

function main(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const game = new Game();
  const renderer = new Renderer(canvas, game);

  renderer.resize();
  window.addEventListener('resize', () => {
    renderer.resize();
  });

  let resultTimer: number | null = null;

  const onCardClick = (card: Card): void => {
    game.selectCard(card);
  };

  const onConfirmClick = (): void => {
    const ok = game.confirmPlay();
    if (!ok && game.message === '请先选择一张卡牌') {
      alert('请先选择一张卡牌');
    }
  };

  const onRestartClick = (): void => {
    game.reset();
    renderer.positionCards();
  };

  renderer.setCallbacks(onCardClick, onConfirmClick, onRestartClick);

  canvas.addEventListener('click', (e) => {
    renderer.handleClick(e.clientX, e.clientY);
  });

  canvas.addEventListener('mousemove', (e) => {
    renderer.handleMove(e.clientX, e.clientY);
  });

  let lastTime = performance.now();

  const loop = (now: number): void => {
    const deltaTime = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    if (game.phase === 'result') {
      if (resultTimer === null) {
        resultTimer = window.setTimeout(() => {
          game.nextTurn();
          renderer.positionCards();
          resultTimer = null;
        }, 1500);
      }
    } else {
      if (resultTimer !== null) {
        clearTimeout(resultTimer);
        resultTimer = null;
      }
    }

    renderer.update(deltaTime);
    renderer.draw(now);

    requestAnimationFrame(loop);
  };

  requestAnimationFrame(loop);
}

main();
