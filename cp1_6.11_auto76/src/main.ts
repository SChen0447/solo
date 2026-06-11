import { GameLoop } from './gameloop';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element not found');
}

const game = new GameLoop(canvas);

let lastTime = performance.now();

function frame(currentTime: number): void {
  const dt = Math.min(0.05, (currentTime - lastTime) / 1000);
  lastTime = currentTime;

  game.update(dt);
  game.draw();

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

function getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
}

let isPointerDown = false;

canvas.addEventListener('mousedown', (e: MouseEvent) => {
  isPointerDown = true;
  const pos = getCanvasPos(e.clientX, e.clientY);
  game.setDragging(true, pos.x, pos.y);
});

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  const pos = getCanvasPos(e.clientX, e.clientY);
  if (isPointerDown) {
    game.updateDragTarget(pos.x, pos.y);
  }
});

canvas.addEventListener('mouseup', (e: MouseEvent) => {
  if (isPointerDown) {
    isPointerDown = false;
    const pos = getCanvasPos(e.clientX, e.clientY);
    game.handleClick(pos.x, pos.y);
    game.setDragging(false);
  }
});

canvas.addEventListener('mouseleave', () => {
  if (isPointerDown) {
    isPointerDown = false;
    game.setDragging(false);
  }
});

canvas.addEventListener('click', (e: MouseEvent) => {
  const pos = getCanvasPos(e.clientX, e.clientY);
  game.handleClick(pos.x, pos.y);
});

canvas.addEventListener('touchstart', (e: TouchEvent) => {
  e.preventDefault();
  if (e.touches.length > 0) {
    const touch = e.touches[0];
    const pos = getCanvasPos(touch.clientX, touch.clientY);
    isPointerDown = true;
    game.setDragging(true, pos.x, pos.y);
  }
}, { passive: false });

canvas.addEventListener('touchmove', (e: TouchEvent) => {
  e.preventDefault();
  if (e.touches.length > 0 && isPointerDown) {
    const touch = e.touches[0];
    const pos = getCanvasPos(touch.clientX, touch.clientY);
    game.updateDragTarget(pos.x, pos.y);
  }
}, { passive: false });

canvas.addEventListener('touchend', (e: TouchEvent) => {
  e.preventDefault();
  if (isPointerDown) {
    isPointerDown = false;
    if (e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      const pos = getCanvasPos(touch.clientX, touch.clientY);
      game.handleClick(pos.x, pos.y);
    }
    game.setDragging(false);
  }
}, { passive: false });

canvas.addEventListener('touchcancel', () => {
  if (isPointerDown) {
    isPointerDown = false;
    game.setDragging(false);
  }
});

window.addEventListener('keydown', (e: KeyboardEvent) => {
  const key = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
    e.preventDefault();
    game.setKey(e.key, true);
  }
});

window.addEventListener('keyup', (e: KeyboardEvent) => {
  const key = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
    e.preventDefault();
    game.setKey(e.key, false);
  }
});

window.addEventListener('resize', () => {
  game.resize();
  if (game.player) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    game.player.x = Math.min(Math.max(game.player.x, game.player.size), w - game.player.size);
    game.player.y = Math.min(Math.max(game.player.y, game.player.size), h - game.player.size);
  }
});
