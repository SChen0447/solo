import { Particle, createParticle, type ColorMode } from './particle';
import { Field, type MouseState, type KeyState } from './field';

const MAX_PARTICLES = 4000;
const SPAWN_RATE_MIN = 200;
const SPAWN_RATE_MAX = 300;

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

const btnClear = document.getElementById('btn-clear') as HTMLButtonElement;
const btnPause = document.getElementById('btn-pause') as HTMLButtonElement;
const btnColor = document.getElementById('btn-color') as HTMLButtonElement;
const btnExport = document.getElementById('btn-export') as HTMLButtonElement;

let width = 0;
let height = 0;
let dpr = window.devicePixelRatio || 1;

const particles: Particle[] = [];
const field = new Field();
let paused = false;
let colorMode: ColorMode = 'random';
let animationId: number | null = null;
let lastTime = performance.now();
let spawnAccumulator = 0;

const mouse: MouseState = {
  x: 0,
  y: 0,
  prevX: 0,
  prevY: 0,
  isDown: false,
  velocityX: 0,
  velocityY: 0
};

const keys: KeyState = {
  w: false,
  a: false,
  s: false,
  d: false
};

let mouseInCanvas = false;

function resize(): void {
  dpr = window.devicePixelRatio || 1;
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function spawnParticles(dtMs: number): void {
  const rate = SPAWN_RATE_MIN + Math.random() * (SPAWN_RATE_MAX - SPAWN_RATE_MIN);
  spawnAccumulator += (rate * dtMs) / 1000;
  while (spawnAccumulator >= 1) {
    spawnAccumulator -= 1;
    if (particles.length >= MAX_PARTICLES) {
      particles.shift();
    }
    const p = createParticle(mouse.x, mouse.y);
    particles.push(p);
  }
}

function update(dt: number, dtMs: number): void {
  if (mouseInCanvas) {
    spawnParticles(dtMs);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    field.applyForces(p, mouse, keys, dt);
    p.update(dt);
    field.handleBoundary(p, width, height);
    if (!p.alive) {
      particles.splice(i, 1);
    }
  }

  mouse.velocityX *= 0.9;
  mouse.velocityY *= 0.9;
}

function render(): void {
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, width, height);

  for (const p of particles) {
    p.render(ctx, colorMode);
  }

  field.renderField(ctx, mouse);
}

function loop(now: number): void {
  if (paused) {
    animationId = null;
    return;
  }
  const dtMs = Math.min(50, now - lastTime);
  const dt = dtMs / 16.6667;
  lastTime = now;

  update(dt, dtMs);
  render();

  animationId = requestAnimationFrame(loop);
}

function startLoop(): void {
  if (animationId !== null) return;
  lastTime = performance.now();
  animationId = requestAnimationFrame(loop);
}

function stopLoop(): void {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

function onMouseMove(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  mouse.prevX = mouse.x;
  mouse.prevY = mouse.y;
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
  mouse.velocityX = mouse.x - mouse.prevX;
  mouse.velocityY = mouse.y - mouse.prevY;
}

function onMouseDown(): void {
  mouse.isDown = true;
}

function onMouseUp(): void {
  mouse.isDown = false;
}

function onMouseEnter(): void {
  mouseInCanvas = true;
}

function onMouseLeave(): void {
  mouseInCanvas = false;
  mouse.isDown = false;
}

function onKeyDown(e: KeyboardEvent): void {
  const k = e.key.toLowerCase();
  if (k === 'w') keys.w = true;
  if (k === 'a') keys.a = true;
  if (k === 's') keys.s = true;
  if (k === 'd') keys.d = true;
  if (k === ' ') {
    e.preventDefault();
    field.showFieldLines = !field.showFieldLines;
  }
}

function onKeyUp(e: KeyboardEvent): void {
  const k = e.key.toLowerCase();
  if (k === 'w') keys.w = false;
  if (k === 'a') keys.a = false;
  if (k === 's') keys.s = false;
  if (k === 'd') keys.d = false;
}

function clearCanvas(): void {
  particles.length = 0;
}

function togglePause(): void {
  paused = !paused;
  btnPause.textContent = paused ? '继续' : '暂停';
  if (!paused) {
    startLoop();
  }
}

function toggleColorMode(): void {
  colorMode = colorMode === 'random' ? 'velocity' : 'random';
  btnColor.textContent = colorMode === 'random' ? '随机颜色' : '速度颜色';
}

function exportPNG(): void {
  const dataURL = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = `sand-art-${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function init(): void {
  resize();
  window.addEventListener('resize', resize);

  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseenter', onMouseEnter);
  canvas.addEventListener('mouseleave', onMouseLeave);

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  btnClear.addEventListener('click', clearCanvas);
  btnPause.addEventListener('click', togglePause);
  btnColor.addEventListener('click', toggleColorMode);
  btnExport.addEventListener('click', exportPNG);

  startLoop();
}

init();
