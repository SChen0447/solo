import { RuneEngine } from './rune-engine';
import { RuneRenderer } from './rune-renderer';
import gsap from 'gsap';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const engine = new RuneEngine();
const renderer = new RuneRenderer();

let isDrawing = false;
let drawingPoints: { x: number; y: number }[] = [];
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let lastTime = performance.now();
let animTime = 0;

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  engine.setCanvasSize(w, h);
  if (renderer['stars'].length === 0) {
    renderer.initStars(w, h);
  } else {
    renderer.resizeStars(w, h);
  }
}

resizeCanvas();

const resizeObserver = new ResizeObserver(() => {
  resizeCanvas();
});
resizeObserver.observe(document.body);

canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  const x = e.clientX;
  const y = e.clientY;

  const selected = engine.selectRune(x, y);
  if (selected) {
    isDragging = true;
    dragOffsetX = x - selected.position.x;
    dragOffsetY = y - selected.position.y;
    engine.startMoveRune(selected.id);
  } else {
    isDrawing = true;
    drawingPoints = [{ x, y }];
  }
});

canvas.addEventListener('mousemove', (e) => {
  const x = e.clientX;
  const y = e.clientY;

  if (isDrawing) {
    drawingPoints.push({ x, y });
  } else if (isDragging && engine.selectedRune) {
    const newX = x - dragOffsetX;
    const newY = y - dragOffsetY;
    gsap.to(engine.selectedRune.position, {
      x: newX,
      y: newY,
      duration: 0.3,
      ease: 'power2.out',
      overwrite: true,
    });
  }
});

canvas.addEventListener('mouseup', () => {
  if (isDrawing) {
    isDrawing = false;
    if (drawingPoints.length >= 5) {
      const rune = engine.addRune(drawingPoints);
    }
    drawingPoints = [];
  }
  if (isDragging) {
    isDragging = false;
  }
});

canvas.addEventListener('dblclick', (e) => {
  const x = e.clientX;
  const y = e.clientY;
  engine.addCircle(x, y);
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (!engine.selectedRune) return;
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  const rune = engine.selectedRune;
  const targetScale = Math.max(0.5, Math.min(2.0, Math.round((rune.scale + delta) * 10) / 10));
  gsap.to(rune, {
    scale: targetScale,
    duration: 0.3,
    ease: 'power2.out',
    overwrite: true,
  });
}, { passive: false });

document.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') {
    if (!engine.selectedRune) return;
    const rune = engine.selectedRune;
    const targetRotation = rune.rotation + (15 * Math.PI / 180);
    gsap.to(rune, {
      rotation: targetRotation,
      duration: 0.3,
      ease: 'power2.out',
      overwrite: true,
    });
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (engine.selectedRune) {
      engine.removeRune(engine.selectedRune.id);
    }
  }
  if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    engine.undo();
  }
});

function mainLoop(now: number): void {
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  animTime += dt;

  engine.update(dt);

  const w = window.innerWidth;
  const h = window.innerHeight;

  ctx.clearRect(0, 0, w, h);
  renderer.renderBackground(ctx, w, h, animTime);

  const connections = engine.getConnections();
  renderer.renderConnections(ctx, connections, animTime);

  for (const circle of engine.circles) {
    renderer.renderCircle(ctx, circle, animTime);
  }

  for (const rune of engine.runes) {
    renderer.renderRune(ctx, rune, animTime);
  }

  for (const rune of engine.runes) {
    if (rune.selected) {
      renderer.renderSelection(ctx, rune);
    }
  }

  if (isDrawing && drawingPoints.length > 1) {
    renderer.renderDrawingPath(ctx, drawingPoints);
  }

  renderer.renderUI(ctx, engine.getSelectedCount(), w, h);

  requestAnimationFrame(mainLoop);
}

requestAnimationFrame(mainLoop);
