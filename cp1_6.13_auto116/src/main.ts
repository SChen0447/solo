import { AssetManager } from './AssetManager';
import { GameWorld } from './GameWorld';
import { ParticleSystem } from './ParticleSystem';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const hud = document.getElementById('hud') as HTMLDivElement;
const scoreDisplay = document.getElementById('scoreDisplay') as HTMLDivElement;
const timerDisplay = document.getElementById('timerDisplay') as HTMLDivElement;
const tutorialOverlay = document.getElementById('tutorial-overlay') as HTMLDivElement;
const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
const resultOverlay = document.getElementById('result-overlay') as HTMLDivElement;
const resultScore = document.getElementById('resultScore') as HTMLDivElement;
const resultTime = document.getElementById('resultTime') as HTMLDivElement;
const resultMatched = document.getElementById('resultMatched') as HTMLDivElement;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;

const assetManager = new AssetManager();
const particleSystem = new ParticleSystem();
const gameWorld = new GameWorld(canvas, assetManager, particleSystem);

assetManager.init();
gameWorld.init();

gameWorld.setCallbacks(
  (score: number, matched: number) => {
    scoreDisplay.textContent = `${score}/100 ${matched}/20`;
  },
  (time: string) => {
    timerDisplay.textContent = time;
  },
  (score: number, matched: number, time: string) => {
    resultScore.textContent = `得分：${score}/100`;
    resultTime.textContent = `用时：${time}`;
    resultMatched.textContent = `匹配：${matched}/20`;
    resultOverlay.classList.add('visible');
  }
);

startBtn.addEventListener('click', () => {
  tutorialOverlay.classList.add('hidden');
  hud.style.display = 'flex';
  gameWorld.startGame();
});

resetBtn.addEventListener('click', () => {
  resultOverlay.classList.remove('visible');
  gameWorld.resetGame();
});

function getPointerPos(e: PointerEvent | TouchEvent): { x: number; y: number } {
  if ('touches' in e) {
    const t = (e as TouchEvent).touches[0] || (e as TouchEvent).changedTouches[0];
    return { x: t.clientX, y: t.clientY };
  }
  return { x: (e as PointerEvent).clientX, y: (e as PointerEvent).clientY };
}

canvas.addEventListener('pointerdown', (e: PointerEvent) => {
  e.preventDefault();
  const pos = getPointerPos(e);
  gameWorld.handlePointerDown(pos.x, pos.y);
});

canvas.addEventListener('pointermove', (e: PointerEvent) => {
  e.preventDefault();
  const pos = getPointerPos(e);
  gameWorld.handlePointerMove(pos.x, pos.y);
});

canvas.addEventListener('pointerup', (e: PointerEvent) => {
  e.preventDefault();
  gameWorld.handlePointerUp();
});

canvas.addEventListener('pointercancel', () => {
  gameWorld.handlePointerUp();
});

canvas.style.touchAction = 'none';

window.addEventListener('resize', () => {
  gameWorld.resize();
});

let lastTime = performance.now();

function gameLoop(now: number): void {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  gameWorld.update(dt);
  gameWorld.draw();

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
