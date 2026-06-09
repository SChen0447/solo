import { Flame, ViewTransform } from './flame';
import { Controls } from './controls';

const canvas = document.getElementById('flame-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const app = document.getElementById('app') as HTMLElement;

const view: ViewTransform = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  rotation: 0,
};

let lastTime = performance.now();
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragOffsetStartX = 0;
let dragOffsetStartY = 0;

const flame = new Flame();

function resizeCanvas(): void {
  const ratio = 16 / 9;
  const maxW = window.innerWidth;
  const maxH = window.innerHeight;
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) {
    h = maxH;
    w = h * ratio;
  }
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function renderFrame(): void {
  flame.render(canvas, ctx, view);
}

const controls = new Controls(flame, app, renderFrame);

function animate(now: number): void {
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  const speedDeg = flame.getRotationSpeed();
  view.rotation += (speedDeg * Math.PI) / 180 * dt;
  renderFrame();
  requestAnimationFrame(animate);
}

canvas.addEventListener('mousedown', (e) => {
  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragOffsetStartX = view.offsetX;
  dragOffsetStartY = view.offsetY;
  canvas.style.cursor = 'grabbing';
});

window.addEventListener('mouseup', () => {
  isDragging = false;
  canvas.style.cursor = 'grab';
});

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  view.offsetX = dragOffsetStartX + (e.clientX - dragStartX);
  view.offsetY = dragOffsetStartY + (e.clientY - dragStartY);
});

canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left - rect.width / 2;
    const my = e.clientY - rect.top - rect.height / 2;
    const delta = -e.deltaY * 0.001;
    const prevScale = view.scale;
    const newScale = Math.max(0.1, Math.min(5, prevScale * (1 + delta)));
    const ratio = newScale / prevScale;
    view.offsetX = mx - (mx - view.offsetX) * ratio;
    view.offsetY = my - (my - view.offsetY) * ratio;
    view.scale = newScale;
  },
  { passive: false }
);

window.addEventListener('resize', resizeCanvas);

resizeCanvas();
canvas.style.cursor = 'grab';
controls.triggerImmediate();
requestAnimationFrame(animate);
