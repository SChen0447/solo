import { Particle } from './particle';
import {
  checkPoemTrigger,
  setupPoemParticles,
  updateActivePoem,
  renderPoemText,
  ActivePoem
} from './poemEngine';

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  strength: number;
  life: number;
}

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let particles: Particle[] = [];
let activePoem: ActivePoem | null = null;
let lastTriggerTime = 0;
let poemCount = 0;
let counterElement: HTMLElement | null = null;

let mouseX: number | null = null;
let mouseY: number | null = null;
let isMouseInCanvas = false;
let shockwaves: Shockwave[] = [];

let globalRotationAngle = 0;
let globalRotationCenter = { x: 0, y: 0 };

let _animationId: number;
let offscreenBgCanvas: HTMLCanvasElement;
let offscreenBgCtx: CanvasRenderingContext2D;

const PARTICLE_COUNT = 500;
const GLOBAL_ROTATION_SPEED = 0.01 * Math.PI / 180;

export function startAnimation(): void {
  canvas = document.getElementById('particle-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  ctx = canvas.getContext('2d', { alpha: false })!;
  counterElement = document.getElementById('poem-counter');

  offscreenBgCanvas = document.createElement('canvas');
  offscreenBgCtx = offscreenBgCanvas.getContext('2d')!;

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  initParticles();
  setupMouseEvents();
  animate();
}

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  offscreenBgCanvas.width = width;
  offscreenBgCanvas.height = height;

  globalRotationCenter = { x: width / 2, y: height / 2 };

  for (const p of particles) {
    p.resize(width, height);
  }
}

function initParticles(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  particles = [];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle(width, height));
  }
}

function setupMouseEvents(): void {
  canvas.addEventListener('mousemove', (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    isMouseInCanvas = true;
  });

  canvas.addEventListener('mouseenter', () => {
    isMouseInCanvas = true;
  });

  canvas.addEventListener('mouseleave', () => {
    isMouseInCanvas = false;
    mouseX = null;
    mouseY = null;
  });

  canvas.addEventListener('click', (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    shockwaves.push({
      x,
      y,
      radius: 0,
      maxRadius: 200,
      strength: 4,
      life: 10
    });
  });

  canvas.addEventListener('touchmove', (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.touches[0].clientX - rect.left;
      mouseY = e.touches[0].clientY - rect.top;
      isMouseInCanvas = true;
    }
  }, { passive: false });

  canvas.addEventListener('touchstart', (e: TouchEvent) => {
    if (e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;

      shockwaves.push({
        x,
        y,
        radius: 0,
        maxRadius: 200,
        strength: 4,
        life: 10
      });
    }
  });

  canvas.addEventListener('touchend', () => {
    isMouseInCanvas = false;
    mouseX = null;
    mouseY = null;
  });
}

function drawBackground(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;

  const gradient = offscreenBgCtx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#0a0a1a');
  gradient.addColorStop(1, '#12122a');
  offscreenBgCtx.fillStyle = gradient;
  offscreenBgCtx.fillRect(0, 0, width, height);

  ctx.drawImage(offscreenBgCanvas, 0, 0);
}

function updateShockwaves(): { x: number; y: number; radius: number; strength: number }[] {
  const activeWaves: { x: number; y: number; radius: number; strength: number }[] = [];

  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const wave = shockwaves[i];
    wave.radius += 25;
    wave.life--;

    if (wave.radius < wave.maxRadius && wave.life > 0) {
      activeWaves.push({
        x: wave.x,
        y: wave.y,
        radius: wave.radius,
        strength: wave.strength * (wave.life / 10)
      });
    } else {
      shockwaves.splice(i, 1);
    }
  }

  return activeWaves;
}

function handleCollisions(): void {
  const gridSize = 16;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const cols = Math.ceil(width / gridSize);
  const rows = Math.ceil(height / gridSize);
  const grid: Particle[][] = Array.from({ length: rows * cols }, () => []);

  for (const p of particles) {
    const col = Math.floor(p.x / gridSize);
    const row = Math.floor(p.y / gridSize);
    if (row >= 0 && row < rows && col >= 0 && col < cols) {
      grid[row * cols + col].push(p);
    }
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cellIdx = row * cols + col;
      const cell = grid[cellIdx];

      for (let i = 0; i < cell.length; i++) {
        for (let j = i + 1; j < cell.length; j++) {
          cell[i].checkCollision(cell[j]);
        }
      }

      for (let dr = 0; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc <= 0) continue;
          const nr = row + dr;
          const nc = col + dc;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;

          const neighborCell = grid[nr * cols + nc];
          for (const p1 of cell) {
            for (const p2 of neighborCell) {
              p1.checkCollision(p2);
            }
          }
        }
      }
    }
  }
}

function animate(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;

  drawBackground();

  globalRotationAngle += GLOBAL_ROTATION_SPEED;

  const activeWaves = updateShockwaves();

  for (const p of particles) {
    p.update(
      mouseX,
      mouseY,
      isMouseInCanvas,
      activeWaves,
      globalRotationCenter,
      GLOBAL_ROTATION_SPEED
    );
  }

  handleCollisions();

  const triggerResult = checkPoemTrigger(
    particles,
    width,
    height,
    activePoem,
    lastTriggerTime
  );

  if (triggerResult.triggered) {
    activePoem = setupPoemParticles(
      triggerResult.poem,
      triggerResult.particles,
      triggerResult.centerX,
      triggerResult.centerY
    );
    lastTriggerTime = Date.now();
    poemCount++;
    if (counterElement) {
      counterElement.textContent = `已集句: ${poemCount}`;
    }
  }

  activePoem = updateActivePoem(activePoem);

  renderPoemText(ctx, activePoem);

  for (const p of particles) {
    p.render(ctx);
  }

  _animationId = requestAnimationFrame(animate);
}

if (typeof window !== 'undefined') {
  window.onload = startAnimation;
}
