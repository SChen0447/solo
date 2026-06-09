import type { Particle } from './particle';
import {
  createParticleA,
  createParticleB,
  createCustomParticle,
  updateParticle,
  resolveParticleCollision,
  calculateTotalMomentum,
  calculateTotalKineticEnergy,
  mixColors
} from './particle';
import type { CollisionFlash, EmitBurst } from './renderer';
import {
  clearCanvas,
  drawParticles,
  drawDragLine,
  drawCollisionFlashes,
  drawEmitBursts,
  createCollisionFlash,
  createEmitBurst,
  cleanupEffects
} from './renderer';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const MAX_PARTICLES = 200;
const INITIAL_COUNT_PER_TYPE = 20;
const INITIAL_SPEED = 2;

const canvas = document.getElementById('particleCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const massSlider = document.getElementById('massSlider') as HTMLInputElement;
const massValue = document.getElementById('massValue') as HTMLSpanElement;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
const countAEl = document.getElementById('countA') as HTMLSpanElement;
const countBEl = document.getElementById('countB') as HTMLSpanElement;
const momentumXEl = document.getElementById('momentumX') as HTMLSpanElement;
const momentumYEl = document.getElementById('momentumY') as HTMLSpanElement;
const kineticEnergyEl = document.getElementById('kineticEnergy') as HTMLSpanElement;
const totalParticlesEl = document.getElementById('totalParticles') as HTMLSpanElement;
const collisionCountEl = document.getElementById('collisionCount') as HTMLSpanElement;
const warningText = document.getElementById('warningText') as HTMLDivElement;

let particles: Particle[] = [];
let collisionFlashes: CollisionFlash[] = [];
let emitBursts: EmitBurst[] = [];
let collisionCount = 0;
let selectedMass = 2;

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragEndX = 0;
let dragEndY = 0;

function createInitialParticles(): void {
  particles = [];
  collisionCount = 0;
  collisionFlashes = [];
  emitBursts = [];

  for (let i = 0; i < INITIAL_COUNT_PER_TYPE; i++) {
    const angle = Math.random() * Math.PI * 2;
    const x = 50 + Math.random() * (CANVAS_WIDTH - 100);
    const y = 50 + Math.random() * (CANVAS_HEIGHT - 100);
    const vx = Math.cos(angle) * INITIAL_SPEED;
    const vy = Math.sin(angle) * INITIAL_SPEED;
    particles.push(createParticleA(x, y, vx, vy));
  }

  for (let i = 0; i < INITIAL_COUNT_PER_TYPE; i++) {
    const angle = Math.random() * Math.PI * 2;
    const x = 50 + Math.random() * (CANVAS_WIDTH - 100);
    const y = 50 + Math.random() * (CANVAS_HEIGHT - 100);
    const vx = Math.cos(angle) * INITIAL_SPEED;
    const vy = Math.sin(angle) * INITIAL_SPEED;
    particles.push(createParticleB(x, y, vx, vy));
  }
}

function handleCollisions(): void {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const result = resolveParticleCollision(particles[i], particles[j]);
      if (result.collided) {
        collisionCount++;
        const mixedColor = mixColors(result.color1, result.color2);
        collisionFlashes.push(createCollisionFlash(result.point.x, result.point.y, mixedColor));
      }
    }
  }
}

function updatePhysics(): void {
  for (const p of particles) {
    updateParticle(p, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
  handleCollisions();
}

function updateUI(): void {
  const countA = particles.filter((p) => p.type === 'A').length;
  const countB = particles.filter((p) => p.type === 'B').length;
  countAEl.textContent = String(countA);
  countBEl.textContent = String(countB);

  const momentum = calculateTotalMomentum(particles);
  momentumXEl.textContent = momentum.x.toFixed(2);
  momentumYEl.textContent = momentum.y.toFixed(2);

  const ke = calculateTotalKineticEnergy(particles);
  kineticEnergyEl.textContent = ke.toFixed(2);

  totalParticlesEl.textContent = String(particles.length);
  collisionCountEl.textContent = String(collisionCount);

  if (particles.length >= MAX_PARTICLES) {
    warningText.classList.add('show');
  } else {
    warningText.classList.remove('show');
  }
}

function render(now: number): void {
  clearCanvas(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);

  collisionFlashes = cleanupEffects(collisionFlashes, now);
  emitBursts = cleanupEffects(emitBursts, now);

  drawCollisionFlashes(ctx, collisionFlashes, now);
  drawEmitBursts(ctx, emitBursts, now);
  drawParticles(ctx, particles);

  if (isDragging) {
    drawDragLine(ctx, dragStartX, dragStartY, dragEndX, dragEndY);
  }
}

function gameLoop(): void {
  const now = performance.now();
  updatePhysics();
  updateUI();
  render(now);
  requestAnimationFrame(gameLoop);
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

canvas.addEventListener('mousedown', (e: MouseEvent) => {
  if (particles.length >= MAX_PARTICLES) return;
  const coords = getCanvasCoords(e);
  isDragging = true;
  dragStartX = coords.x;
  dragStartY = coords.y;
  dragEndX = coords.x;
  dragEndY = coords.y;
});

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  if (!isDragging) return;
  const coords = getCanvasCoords(e);
  dragEndX = coords.x;
  dragEndY = coords.y;
});

canvas.addEventListener('mouseup', () => {
  if (!isDragging) return;
  isDragging = false;

  if (particles.length >= MAX_PARTICLES) return;

  const dx = dragStartX - dragEndX;
  const dy = dragStartY - dragEndY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 5) return;

  const speed = Math.min(dist * 0.15, 15);
  const angle = Math.atan2(dy, dx);
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;

  const newParticle = createCustomParticle(dragStartX, dragStartY, vx, vy, selectedMass);
  particles.push(newParticle);
  emitBursts.push(createEmitBurst(dragStartX, dragStartY));
});

canvas.addEventListener('mouseleave', () => {
  isDragging = false;
});

massSlider.addEventListener('input', () => {
  selectedMass = parseFloat(massSlider.value);
  massValue.textContent = selectedMass.toFixed(1);
});

resetBtn.addEventListener('click', () => {
  createInitialParticles();
});

createInitialParticles();
requestAnimationFrame(gameLoop);
