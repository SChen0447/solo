import { Rain, RainParams } from './rain';
import { Ripples } from './ripple';
import { Mist } from './mist';
import { UIControl } from './ui';

const canvas = document.getElementById('rainCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let width = 0;
let height = 0;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  rain.resize(width, height);
  mist.resize(width, height);
}

const ui = new UIControl();
const initialState = ui.getState();

const rain = new Rain({
  amount: initialState.amount,
  speed: initialState.speed,
  wind: initialState.wind
});

const ripples = new Ripples();
const mist = new Mist();

window.addEventListener('resize', resize);
resize();

rain.init(initialState.amount, width, height);
mist.init(width, height);

ui.onChange((state) => {
  rain.setParams({
    speed: state.speed,
    wind: state.wind
  } as Partial<RainParams>);
});

ui.onReset(() => {
  const state = ui.getState();
  rain.setParams({
    speed: state.speed,
    wind: state.wind
  } as Partial<RainParams>);
});

let lastTime = performance.now();
let fpsFrames = 0;
let fpsTime = lastTime;
let currentFps = 60;
let fpsAdjustTimer = 0;

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#2a2d4e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawFPS(fps: number) {
  ctx.fillStyle = '#7fdb8a';
  ctx.font = '12px monospace';
  ctx.fillText(`FPS: ${fps.toFixed(0)}`, 12, 24);
}

function frameLoop(now: number) {
  const dt = now - lastTime;
  lastTime = now;

  fpsFrames++;
  if (now - fpsTime >= 500) {
    currentFps = (fpsFrames * 1000) / (now - fpsTime);
    fpsFrames = 0;
    fpsTime = now;
  }

  fpsAdjustTimer += dt;
  if (fpsAdjustTimer >= 2000) {
    fpsAdjustTimer = 0;
    const currentCount = rain.getCount();
    if (currentFps < 50) {
      rain.setCount(currentCount - 20);
    } else if (currentFps > 58) {
      rain.setCount(currentCount + 20);
    }
  }

  ctx.fillStyle = 'rgba(26, 26, 46, 0.3)';
  ctx.fillRect(0, 0, width, height);

  drawBackground();

  mist.update(now);
  mist.render(ctx);

  const impacts = rain.update();
  rain.render(ctx);

  for (const impact of impacts) {
    if (Math.random() < 0.3) {
      ripples.add(impact.x, impact.y, now);
    }
  }

  ripples.update(now);
  ripples.render(ctx, now);

  drawFPS(currentFps);

  requestAnimationFrame(frameLoop);
}

requestAnimationFrame(frameLoop);
