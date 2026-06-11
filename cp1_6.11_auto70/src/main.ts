import { FishSchool } from './fish';
import { JellyfishManager } from './jellyfish';
import { Environment } from './environment';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let canvasW = 0;
let canvasH = 0;
let dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

function resizeCanvas(): void {
  dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  canvasW = window.innerWidth;
  canvasH = window.innerHeight;
  canvas.width = Math.floor(canvasW * dpr);
  canvas.height = Math.floor(canvasH * dpr);
  canvas.style.width = canvasW + 'px';
  canvas.style.height = canvasH + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (environment) environment.resize(canvasW, canvasH);
  if (fishSchool) fishSchool.resize(canvasW, canvasH);
  if (jellyManager) jellyManager.resize(canvasW, canvasH);
}

let environment: Environment;
let fishSchool: FishSchool;
let jellyManager: JellyfishManager;

function init(): void {
  resizeCanvas();

  environment = new Environment(canvasW, canvasH);
  fishSchool = new FishSchool(80, canvasW, canvasH);
  jellyManager = new JellyfishManager(20, canvasW, canvasH);

  environment.onFishCountChange = (n: number) => fishSchool.setCount(n);
  environment.onJellyCountChange = (n: number) => jellyManager.setCount(n, canvasW, canvasH);

  window.addEventListener('resize', resizeCanvas);
}

let lastTime = performance.now();

function animate(now: number): void {
  const dt = Math.min(50, now - lastTime);
  lastTime = now;

  ctx.clearRect(0, 0, canvasW, canvasH);

  environment.renderBackground(ctx, canvasW, canvasH);
  environment.renderLightSpots(ctx, now);
  environment.update(dt);
  environment.renderBubbles(ctx);

  fishSchool.update(dt, jellyManager.jellyfishes);
  jellyManager.update(dt, fishSchool.fishes);

  jellyManager.render(ctx);
  fishSchool.render(ctx);

  requestAnimationFrame(animate);
}

init();
requestAnimationFrame(animate);
