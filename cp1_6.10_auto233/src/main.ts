import { GameEngine } from './GameEngine';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const engine = new GameEngine();

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  engine.resize(w, h);
}

window.addEventListener('resize', resize);
resize();

let lastTime = performance.now();
function loop(now: number): void {
  const deltaTime = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  engine.update(deltaTime);
  engine.render(ctx);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  engine.handleKeyDown(e.key);
});

window.addEventListener('keyup', (e) => {
  engine.handleKeyUp(e.key);
});

function getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

canvas.addEventListener('mousemove', (e) => {
  const { x, y } = getCanvasPos(e.clientX, e.clientY);
  engine.handleMouseMove(x, y);
});

canvas.addEventListener('mousedown', (e) => {
  const { x, y } = getCanvasPos(e.clientX, e.clientY);
  engine.handleClick(x, y);
});

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const t = e.touches[0];
  const { x, y } = getCanvasPos(t.clientX, t.clientY);
  engine.handleClick(x, y);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const t = e.touches[0];
  const { x, y } = getCanvasPos(t.clientX, t.clientY);
  engine.handleMouseMove(x, y);
}, { passive: false });

window.addEventListener('beforeunload', () => {
  engine.dispose();
});
