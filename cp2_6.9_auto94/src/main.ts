import { Particle, SceneConfig } from './particle';
import { Renderer } from './renderer';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
if (!ctx) {
  throw new Error('Canvas 2D context not available');
}

const fpsEl = document.getElementById('fps') as HTMLSpanElement;
const particleCountEl = document.getElementById('particle-count') as HTMLSpanElement;
const avgRadiusEl = document.getElementById('avg-radius') as HTMLSpanElement;

let width: number;
let height: number;
let particles: Particle[] = [];
let renderer: Renderer;
let lastTime: number = 0;
let mouseX: number = -9999;
let mouseY: number = -9999;

let frameCount: number = 0;
let fpsTimer: number = 0;
let currentFps: number = 0;

function getSceneConfig(): SceneConfig {
  const isMobile = window.innerWidth < 768;
  return {
    width,
    height,
    centerX: width / 2,
    centerY: height / 2,
    isMobile,
    baseFriction: 0.98
  };
}

function calculateTargetParticleCount(): number {
  const area = width * height;
  let count = Math.floor((area / 10000) * 50);
  if (window.innerWidth < 768) {
    count = Math.floor(count / 2);
  }
  return Math.min(400, Math.max(100, count));
}

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  width = window.innerWidth;
  height = window.innerHeight;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (renderer) {
    renderer.resize(width, height);
  }
}

function initParticles(): void {
  particles = [];
  const config = getSceneConfig();
  const targetCount = calculateTargetParticleCount();

  for (let i = 0; i < targetCount; i++) {
    particles.push(Particle.createRandom(config));
  }
}

function handleCollisions(): Particle[] {
  const toRemove: Set<number> = new Set();
  const toAdd: Particle[] = [];

  for (let i = 0; i < particles.length; i++) {
    if (toRemove.has(i)) continue;
    for (let j = i + 1; j < particles.length; j++) {
      if (toRemove.has(j)) continue;
      const p1 = particles[i];
      const p2 = particles[j];
      if (Particle.checkCollision(p1, p2)) {
        toRemove.add(i);
        toRemove.add(j);
        toAdd.push(Particle.createFused(p1, p2));
        break;
      }
    }
  }

  const remaining = particles.filter((_, idx) => !toRemove.has(idx));
  return [...remaining, ...toAdd];
}

function updateParticles(dt: number, config: SceneConfig): void {
  for (const p of particles) {
    p.update(dt, config, mouseX, mouseY);
  }

  const targetCount = calculateTargetParticleCount();
  particles = particles.filter(p => !p.isDead());

  while (particles.length < targetCount) {
    particles.push(Particle.createRandom(config));
  }
}

function updateDebug(): void {
  particleCountEl.textContent = particles.length.toString();
  if (particles.length > 0) {
    const avg = particles.reduce((sum, p) => sum + p.radius, 0) / particles.length;
    avgRadiusEl.textContent = avg.toFixed(2);
  } else {
    avgRadiusEl.textContent = '0.00';
  }
  fpsEl.textContent = currentFps.toString();
}

function updateQualityMode(): void {
  if (particles.length > 400) {
    renderer.setHighQuality(false);
  } else if (particles.length <= 300) {
    renderer.setHighQuality(true);
  }
}

function animate(currentTime: number): void {
  requestAnimationFrame(animate);

  const dt = Math.min(0.05, (currentTime - lastTime) / 1000 || 0.016);
  lastTime = currentTime;

  frameCount++;
  fpsTimer += dt;
  if (fpsTimer >= 1) {
    currentFps = Math.round(frameCount / fpsTimer);
    frameCount = 0;
    fpsTimer = 0;
  }

  const config = getSceneConfig();

  particles = handleCollisions();
  updateParticles(dt, config);
  updateQualityMode();

  renderer.render(particles, currentTime / 1000);
  updateDebug();
}

function handleMouseMove(e: MouseEvent): void {
  mouseX = e.clientX;
  mouseY = e.clientY;
}

function handleMouseLeave(): void {
  mouseX = -9999;
  mouseY = -9999;
}

function handleResize(): void {
  resizeCanvas();
}

function init(): void {
  resizeCanvas();
  renderer = new Renderer(ctx!, width, height);
  renderer.clearFull();
  initParticles();

  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseleave', handleMouseLeave);
  window.addEventListener('resize', handleResize);

  lastTime = performance.now();
  requestAnimationFrame(animate);
}

init();
