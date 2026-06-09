import { AudioEngine } from './audioEngine';
import { ParticleSystem } from './particleSystem';

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 700;
const LOW_FPS_THRESHOLD = 45;
const LOW_FPS_DURATION = 1000;
const AUTO_WAVE_INTERVAL = 2000;

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let audioEngine: AudioEngine;
let particleSystem: ParticleSystem;
let performanceMode = false;
let autoWaveActive = false;
let autoWaveTimer: ReturnType<typeof setInterval> | null = null;

let frameCount = 0;
let fpsUpdateTime = performance.now();
let currentFps = 60;
let lowFpsSince: number | null = null;

function getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

function updateFps(now: number): void {
  frameCount++;
  if (now - fpsUpdateTime >= 1000) {
    currentFps = Math.round((frameCount * 1000) / (now - fpsUpdateTime));
    frameCount = 0;
    fpsUpdateTime = now;

    const perfBadge = document.getElementById('perf-badge');
    if (currentFps < LOW_FPS_THRESHOLD) {
      if (lowFpsSince === null) {
        lowFpsSince = now;
      } else if (now - lowFpsSince >= LOW_FPS_DURATION && !performanceMode) {
        performanceMode = true;
        particleSystem.setPerformanceMode(true);
        if (perfBadge) {
          perfBadge.style.display = 'inline-block';
        }
      }
    } else {
      lowFpsSince = null;
      if (performanceMode) {
        performanceMode = false;
        particleSystem.setPerformanceMode(false);
        if (perfBadge) {
          perfBadge.style.display = 'none';
        }
      }
    }
  }
}

function animate(): void {
  const now = performance.now();
  updateFps(now);
  particleSystem.update(now);
  particleSystem.draw(ctx);
  requestAnimationFrame(animate);
}

function handleCanvasClick(e: MouseEvent): void {
  const coords = getCanvasCoords(e.clientX, e.clientY);
  particleSystem.triggerPulse(coords.x, coords.y);
}

function handleReset(): void {
  particleSystem.resetToMatrix();
}

function handleRandomize(): void {
  particleSystem.randomizePositions();
}

function handleAutoWave(): void {
  const btn = document.getElementById('btn-autowave') as HTMLButtonElement;
  autoWaveActive = !autoWaveActive;

  if (autoWaveActive) {
    if (btn) {
      btn.classList.add('active');
    }
    const triggerRandomPulse = () => {
      const x = 100 + Math.random() * (CANVAS_WIDTH - 200);
      const y = 100 + Math.random() * (CANVAS_HEIGHT - 200);
      particleSystem.triggerPulse(x, y);
    };
    triggerRandomPulse();
    autoWaveTimer = setInterval(triggerRandomPulse, AUTO_WAVE_INTERVAL);
  } else {
    if (btn) {
      btn.classList.remove('active');
    }
    if (autoWaveTimer !== null) {
      clearInterval(autoWaveTimer);
      autoWaveTimer = null;
    }
  }
}

function handleVolumeChange(e: Event): void {
  const slider = e.target as HTMLInputElement;
  const volume = parseInt(slider.value, 10);
  audioEngine.setVolume(volume);
  const label = document.getElementById('volume-label');
  if (label) {
    label.textContent = `${volume}`;
  }
}

function handleResize(): void {
  const container = document.querySelector('.canvas-wrapper') as HTMLElement;
  if (window.innerWidth < 800) {
    const vw = window.innerWidth;
    const newWidth = Math.floor(vw * 0.95);
    const ratio = CANVAS_HEIGHT / CANVAS_WIDTH;
    const newHeight = Math.floor(newWidth * ratio);
    container.style.width = `${newWidth}px`;
    container.style.height = `${newHeight}px`;
  } else {
    container.style.width = `${CANVAS_WIDTH}px`;
    container.style.height = `${CANVAS_HEIGHT}px`;
  }
}

function bindEvents(): void {
  canvas.addEventListener('click', handleCanvasClick);

  const btnReset = document.getElementById('btn-reset');
  const btnRandom = document.getElementById('btn-random');
  const btnAutoWave = document.getElementById('btn-autowave');
  const volumeSlider = document.getElementById('volume-slider');

  if (btnReset) btnReset.addEventListener('click', handleReset);
  if (btnRandom) btnRandom.addEventListener('click', handleRandomize);
  if (btnAutoWave) btnAutoWave.addEventListener('click', handleAutoWave);
  if (volumeSlider) volumeSlider.addEventListener('input', handleVolumeChange);

  window.addEventListener('resize', handleResize);
}

function init(): void {
  canvas = document.getElementById('particle-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  const context = canvas.getContext('2d');
  if (!context) {
    console.error('Could not get 2D context');
    return;
  }
  ctx = context;

  audioEngine = new AudioEngine(60);
  particleSystem = new ParticleSystem(canvas, audioEngine);

  handleResize();
  bindEvents();
  animate();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
