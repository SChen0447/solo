import { Aurora } from './aurora';
import { Particles } from './particles';

const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;

interface ControlState {
  auroraSpeed: number;
  particleDensity: number;
  colorTempShift: number;
  smoothAurora: boolean;
  particleTrail: boolean;
}

interface MouseState {
  x: number;
  y: number;
  pendingUpdate: boolean;
}

interface Shockwave {
  x: number;
  y: number;
  startTime: number;
  duration: number;
  maxRadius: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

const controlState: ControlState = {
  auroraSpeed: 1.0,
  particleDensity: 200,
  colorTempShift: 0,
  smoothAurora: true,
  particleTrail: false
};

const mouseState: MouseState = {
  x: -1,
  y: -1,
  pendingUpdate: false
};

let currentHueShift = 0;
let targetHueShift = 0;
let hueTransitionStart = 0;
const HUE_TRANSITION_DURATION = 500;

let shockwaves: Shockwave[] = [];

function main(): void {
  const canvas = document.getElementById('aurora-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Canvas 2D context not available');
    return;
  }

  const aurora = new Aurora(BASE_WIDTH, BASE_HEIGHT);
  const particles = new Particles(controlState.particleDensity, BASE_WIDTH, BASE_HEIGHT);

  bindControls(particles);
  bindMouseEvents(canvas, aurora);
  bindResize(canvas);

  fitCanvas(canvas);

  let lastFrameTime = performance.now();

  function loop(now: number): void {
    const deltaTime = now - lastFrameTime;
    lastFrameTime = now;

    if (mouseState.pendingUpdate) {
      mouseState.pendingUpdate = false;
      const rightThirdStart = BASE_WIDTH * 2 / 3;
      if (mouseState.x >= rightThirdStart && mouseState.x <= BASE_WIDTH) {
        const t = (mouseState.x - rightThirdStart) / (BASE_WIDTH - rightThirdStart);
        targetHueShift = t * 45;
      } else {
        targetHueShift = 0;
      }
      hueTransitionStart = now;
    }

    const hueElapsed = (now - hueTransitionStart) / HUE_TRANSITION_DURATION;
    const hueT = Math.min(1, hueElapsed);
    const easedHueT = easeOutQuart(hueT);
    currentHueShift = lerp(currentHueShift, targetHueShift + controlState.colorTempShift, easedHueT * 0.1);
    currentHueShift = clamp(currentHueShift, -30, 75);

    aurora.update(controlState.auroraSpeed, currentHueShift, controlState.smoothAurora);
    particles.update(mouseState.x, mouseState.y, controlState.particleDensity, controlState.particleTrail);

    shockwaves = shockwaves.filter((sw) => {
      return (now - sw.startTime) < sw.duration;
    });

    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    aurora.render(ctx, BASE_WIDTH, BASE_HEIGHT, currentHueShift);
    particles.render(ctx, BASE_WIDTH, BASE_HEIGHT, null);
    renderShockwaves(ctx, now);

    void deltaTime;
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

function renderShockwaves(ctx: CanvasRenderingContext2D, now: number): void {
  ctx.save();
  for (const sw of shockwaves) {
    const elapsed = now - sw.startTime;
    const t = elapsed / sw.duration;
    if (t >= 1) continue;

    const radius = sw.maxRadius * t;
    const alpha = 0.8 * (1 - t);
    const lineWidth = 2 * (1 - t);

    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function bindControls(particles: Particles): void {
  const speedSlider = document.getElementById('aurora-speed') as HTMLInputElement;
  const speedValue = document.getElementById('aurora-speed-value');
  if (speedSlider && speedValue) {
    speedSlider.addEventListener('input', () => {
      controlState.auroraSpeed = parseFloat(speedSlider.value);
      speedValue.textContent = controlState.auroraSpeed.toFixed(1) + 'x';
    });
  }

  const densitySlider = document.getElementById('particle-density') as HTMLInputElement;
  const densityValue = document.getElementById('particle-density-value');
  if (densitySlider && densityValue) {
    densitySlider.addEventListener('input', () => {
      controlState.particleDensity = parseInt(densitySlider.value, 10);
      densityValue.textContent = String(controlState.particleDensity);
      particles.setDensity(controlState.particleDensity);
    });
  }

  const tempSlider = document.getElementById('color-temp') as HTMLInputElement;
  const tempValue = document.getElementById('color-temp-value');
  if (tempSlider && tempValue) {
    tempSlider.addEventListener('input', () => {
      controlState.colorTempShift = parseInt(tempSlider.value, 10);
      tempValue.textContent = String(controlState.colorTempShift);
    });
  }

  const smoothRow = document.getElementById('smooth-aurora-row');
  const smoothBox = document.getElementById('smooth-aurora-box');
  if (smoothRow && smoothBox) {
    smoothRow.addEventListener('click', () => {
      controlState.smoothAurora = !controlState.smoothAurora;
      smoothBox.classList.toggle('checked', controlState.smoothAurora);
    });
  }

  const trailRow = document.getElementById('particle-trail-row');
  const trailBox = document.getElementById('particle-trail-box');
  if (trailRow && trailBox) {
    trailRow.addEventListener('click', () => {
      controlState.particleTrail = !controlState.particleTrail;
      trailBox.classList.toggle('checked', controlState.particleTrail);
    });
  }
}

function bindMouseEvents(canvas: HTMLCanvasElement, aurora: Aurora): void {
  canvas.addEventListener('mousemove', (e: MouseEvent) => {
    if (mouseState.pendingUpdate) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = BASE_WIDTH / rect.width;
    const scaleY = BASE_HEIGHT / rect.height;

    mouseState.x = (e.clientX - rect.left) * scaleX;
    mouseState.y = (e.clientY - rect.top) * scaleY;
    mouseState.pendingUpdate = true;
  });

  canvas.addEventListener('mouseleave', () => {
    mouseState.x = -1;
    mouseState.y = -1;
    mouseState.pendingUpdate = true;
  });

  canvas.addEventListener('mousedown', (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = BASE_WIDTH / rect.width;
    const scaleY = BASE_HEIGHT / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    shockwaves.push({
      x,
      y,
      startTime: performance.now(),
      duration: 1500,
      maxRadius: 200
    });

    aurora.triggerShockwave();
  });
}

function bindResize(canvas: HTMLCanvasElement): void {
  window.addEventListener('resize', () => {
    fitCanvas(canvas);
  });
}

function fitCanvas(canvas: HTMLCanvasElement): void {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  const scale = Math.min(windowWidth / BASE_WIDTH, windowHeight / BASE_HEIGHT);
  const displayWidth = Math.floor(BASE_WIDTH * scale);
  const displayHeight = Math.floor(BASE_HEIGHT * scale);

  canvas.style.width = displayWidth + 'px';
  canvas.style.height = displayHeight + 'px';
  canvas.style.position = 'absolute';
  canvas.style.left = Math.floor((windowWidth - displayWidth) / 2) + 'px';
  canvas.style.top = Math.floor((windowHeight - displayHeight) / 2) + 'px';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
