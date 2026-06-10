import { Renderer } from './renderer';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const statusLeft = document.getElementById('status-left') as HTMLDivElement;
const countDisplay = document.getElementById('count-display') as HTMLSpanElement;
const timeDisplay = document.getElementById('time-display') as HTMLSpanElement;

const renderer = new Renderer(canvas);

function updateStatusBar() {
  const attracted = renderer.getAttractedCount();
  countDisplay.textContent = attracted.toString();

  if (attracted === 0) {
    statusLeft.textContent = '静夜';
    statusLeft.className = 'status-quiet';
  } else {
    statusLeft.textContent = '引光者 ' + attracted + '只';
    statusLeft.className = 'status-attract';
  }

  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  timeDisplay.textContent = `${hh}:${mm}:${ss}`;
}

function getCanvasCoords(e: MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

canvas.addEventListener('mousemove', (e) => {
  const coords = getCanvasCoords(e);
  renderer.setCursor(coords.x, coords.y, true);
});

canvas.addEventListener('mouseenter', () => {
  renderer.isCursorInCanvas = true;
});

canvas.addEventListener('mouseleave', () => {
  renderer.isCursorInCanvas = false;
});

canvas.addEventListener('click', (e) => {
  const coords = getCanvasCoords(e);
  renderer.handleClick(coords.x, coords.y);
});

let lastStatusUpdate = 0;

function gameLoop(currentTime: number) {
  renderer.update(currentTime);
  renderer.render();

  if (currentTime - lastStatusUpdate > 200) {
    updateStatusBar();
    lastStatusUpdate = currentTime;
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame((t) => {
  renderer.lastFrameTime = t;
  requestAnimationFrame(gameLoop);
});
