import { StarField } from './starField';
import { ConnectionGame, MatchEvent } from './connectionGame';
import { Renderer } from './renderer';

function bootstrap(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const width = window.innerWidth;
  const height = window.innerHeight;

  const starField = new StarField(width, height);
  const game = new ConnectionGame(starField);
  const renderer = new Renderer(canvas, starField, game);

  game.setOnMatch((event: MatchEvent) => {
    renderer.handleMatch(event);
  });

  game.setOnSettling(() => {});

  game.setOnRestart(() => {});

  function getCanvasCoords(e: MouseEvent | TouchEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    let clientX: number;
    let clientY: number;
    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else {
        clientX = 0;
        clientY = 0;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  function handleMouseDown(e: MouseEvent): void {
    const { x, y } = getCanvasCoords(e);
    game.handleMouseDown(x, y);
  }

  function handleMouseMove(e: MouseEvent): void {
    const { x, y } = getCanvasCoords(e);
    game.handleMouseMove(x, y);
  }

  function handleMouseUp(e: MouseEvent): void {
    const { x, y } = getCanvasCoords(e);
    game.handleMouseUp(x, y);
  }

  function handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    game.handleMouseDown(x, y);
  }

  function handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    game.handleMouseMove(x, y);
  }

  function handleTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    game.handleMouseUp(x, y);
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

  function handleResize(): void {
    starField.resize(window.innerWidth, window.innerHeight);
    renderer.resize();
  }

  window.addEventListener('resize', handleResize);

  let animationId: number;
  function gameLoop(timestamp: number): void {
    starField.update(timestamp);
    game.update(timestamp);
    renderer.render(timestamp);
    animationId = requestAnimationFrame(gameLoop);
  }

  animationId = requestAnimationFrame(gameLoop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
