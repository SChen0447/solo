import { GameEngine } from './gameEngine';
import { Renderer, CANVAS_SIZE } from './renderer';

function main(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;

  const engine = new GameEngine();
  const renderer = new Renderer(canvas);

  const handleKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    engine.handleKeyDown(e.key);
  };

  const handleKeyUp = (e: KeyboardEvent): void => {
    e.preventDefault();
    engine.handleKeyUp(e.key);
  };

  const handleMouseMove = (e: MouseEvent): void => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    engine.handleMouseMove(x, y);
  };

  const handleClick = (e: MouseEvent): void => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (engine.state.gameOver && renderer.isRetryButtonClicked(x, y)) {
      engine.restart();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('click', handleClick);

  let lastTime = 0;
  const gameLoop = (now: number): void => {
    const delta = now - lastTime;
    lastTime = now;

    engine.update(now);
    renderer.render(engine.state, now);

    requestAnimationFrame(gameLoop);
  };

  requestAnimationFrame(gameLoop);
}

main();
