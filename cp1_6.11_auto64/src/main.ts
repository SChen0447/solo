import { GameLoop } from './gameLoop';
import type { InputState } from './entities';

function main(): void {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Failed to get 2D context');
    return;
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;

  const gameLoop = new GameLoop(ctx, width, height);

  const inputState: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
  };

  const keyMap: Record<string, keyof InputState> = {
    KeyW: 'up',
    ArrowUp: 'up',
    KeyS: 'down',
    ArrowDown: 'down',
    KeyA: 'left',
    ArrowLeft: 'left',
    KeyD: 'right',
    ArrowRight: 'right',
  };

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    const key = keyMap[e.code];
    if (key) {
      e.preventDefault();
      inputState[key] = true;
      gameLoop.setInput(inputState);
    }
  });

  window.addEventListener('keyup', (e: KeyboardEvent) => {
    const key = keyMap[e.code];
    if (key) {
      e.preventDefault();
      inputState[key] = false;
      gameLoop.setInput(inputState);
    }
  });

  window.addEventListener('blur', () => {
    inputState.up = false;
    inputState.down = false;
    inputState.left = false;
    inputState.right = false;
    gameLoop.setInput(inputState);
  });

  canvas.addEventListener('mousemove', (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    gameLoop.setMousePos(x, y);
  });

  canvas.addEventListener('click', (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    gameLoop.handleClick(x, y);
  });

  canvas.addEventListener('touchstart', (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
      const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
      gameLoop.setMousePos(x, y);
      gameLoop.handleClick(x, y);
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
      const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
      gameLoop.setMousePos(x, y);
    }
  }, { passive: false });

  let resizeTimeout: number | null = null;
  window.addEventListener('resize', () => {
    if (resizeTimeout !== null) {
      window.clearTimeout(resizeTimeout);
    }
    resizeTimeout = window.setTimeout(() => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      canvas.width = newWidth;
      canvas.height = newHeight;
      gameLoop.resize(newWidth, newHeight);
    }, 100);
  });

  gameLoop.start();
}

main();
