import { GameEngine } from './GameEngine';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const game = new GameEngine();

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  game.resize(window.innerWidth, window.innerHeight);
}

function getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function handleMouseDown(e: MouseEvent): void {
  const pos = getCanvasPos(e.clientX, e.clientY);
  game.handleDragStart(pos.x, pos.y);
}

function handleMouseMove(e: MouseEvent): void {
  const pos = getCanvasPos(e.clientX, e.clientY);
  game.handleDragMove(pos.x, pos.y);
}

function handleMouseUp(e: MouseEvent): void {
  const pos = getCanvasPos(e.clientX, e.clientY);
  game.handleDragEnd(pos.x, pos.y);
}

function handleTouchStart(e: TouchEvent): void {
  e.preventDefault();
  if (e.touches.length > 0) {
    const touch = e.touches[0];
    const pos = getCanvasPos(touch.clientX, touch.clientY);
    game.handleDragStart(pos.x, pos.y);
  }
}

function handleTouchMove(e: TouchEvent): void {
  e.preventDefault();
  if (e.touches.length > 0) {
    const touch = e.touches[0];
    const pos = getCanvasPos(touch.clientX, touch.clientY);
    game.handleDragMove(pos.x, pos.y);
  }
}

function handleTouchEnd(e: TouchEvent): void {
  e.preventDefault();
  if (e.changedTouches.length > 0) {
    const touch = e.changedTouches[0];
    const pos = getCanvasPos(touch.clientX, touch.clientY);
    game.handleDragEnd(pos.x, pos.y);
  }
}

canvas.addEventListener('mousedown', handleMouseDown);
window.addEventListener('mousemove', handleMouseMove);
window.addEventListener('mouseup', handleMouseUp);

canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
window.addEventListener('touchmove', handleTouchMove, { passive: false });
window.addEventListener('touchend', handleTouchEnd, { passive: false });

window.addEventListener('resize', resizeCanvas);

resizeCanvas();
game.init(window.innerWidth, window.innerHeight);

let lastTime = performance.now();

function gameLoop(currentTime: number): void {
  const dt = Math.min((currentTime - lastTime) / 1000, 1 / 30);
  lastTime = currentTime;

  game.update(dt);
  game.draw(ctx);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
