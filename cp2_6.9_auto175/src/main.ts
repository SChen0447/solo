import { Renderer } from './renderer';
import { PlayerController } from './playerController';
import { FragmentManager } from './fragmentManager';

const TARGET_FPS = 60;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const chainCountEl = document.getElementById('chain-count') as HTMLElement;
const remainingCountEl = document.getElementById('remaining-count') as HTMLElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

function getCanvasSize(): { width: number; height: number } {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  return {
    width: Math.floor(window.innerWidth * dpr),
    height: Math.floor(window.innerHeight * dpr),
  };
}

const initialSize = getCanvasSize();
canvas.width = initialSize.width;
canvas.height = initialSize.height;

const renderer = new Renderer(canvas);
const player = new PlayerController(canvas);
const fragments = new FragmentManager(initialSize.width, initialSize.height);

let lastChainCount = -1;
let lastRemainingCount = -1;
let lastTime = 0;
let rafId = 0;
let running = true;

function pulseElement(el: HTMLElement): void {
  el.classList.add('pulse');
  setTimeout(() => el.classList.remove('pulse'), 150);
}

function updateHUD(): void {
  const state = fragments.getState();
  if (state.chainCount !== lastChainCount) {
    chainCountEl.textContent = String(state.chainCount);
    if (lastChainCount >= 0 && state.chainCount > lastChainCount) {
      pulseElement(chainCountEl);
    }
    lastChainCount = state.chainCount;
  }
  if (state.remainingCount !== lastRemainingCount) {
    remainingCountEl.textContent = String(state.remainingCount);
    if (lastRemainingCount >= 0) {
      pulseElement(remainingCountEl);
    }
    lastRemainingCount = state.remainingCount;
  }
}

function gameLoop(currentTime: number): void {
  if (!running) return;
  rafId = requestAnimationFrame(gameLoop);

  const delta = currentTime - lastTime;
  if (delta < FRAME_INTERVAL * 0.9) {
    return;
  }
  lastTime = currentTime - (delta % FRAME_INTERVAL);

  player.update(renderer.width, renderer.height);
  fragments.checkPlayerCollision(player.player.x, player.player.y);
  fragments.update();

  renderer.clear();

  for (const frag of fragments.fragments) {
    if (!frag.exploded) {
      renderer.drawFragment(frag);
    }
  }

  for (const wave of fragments.shockwaves) {
    renderer.drawShockwave(wave);
  }

  for (const particle of fragments.particles) {
    renderer.drawParticle(particle);
  }

  if (fragments.spiralStar) {
    const center = fragments.spiralStarCenter;
    renderer.drawSpiralStar(fragments.spiralStar, center.x, center.y);
  }

  renderer.drawPlayer(player.player, player.isMobileDevice);

  updateHUD();
}

function handleResize(): void {
  const size = getCanvasSize();
  renderer.resize(size.width, size.height);
  fragments.resize(size.width, size.height);
  player.player.x = Math.min(player.player.x, size.width - player.player.radius);
  player.player.y = Math.min(player.player.y, size.height - player.player.radius);
}

function handleReset(): void {
  fragments.reset();
  player.reset(renderer.width, renderer.height);
  lastChainCount = -1;
  lastRemainingCount = -1;
}

window.addEventListener('resize', handleResize);
resetBtn.addEventListener('click', handleReset);

rafId = requestAnimationFrame(gameLoop);
