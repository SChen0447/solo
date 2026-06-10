import { GameState } from './GameState';
import { AudioPlayer } from './AudioPlayer';
import { Renderer } from './Renderer';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const stepText = document.getElementById('step-text') as HTMLSpanElement;
const dotsContainer = document.getElementById('dots-indicator') as HTMLDivElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

const gameState = new GameState();
const audioPlayer = new AudioPlayer();
const renderer = new Renderer(canvas, gameState);

let lastTime = 0;
let animationId: number = 0;

function updateUI(): void {
  const step = gameState.getCurrentStep();
  const total = gameState.getSequenceLength();
  stepText.textContent = `步数：${step}/${total}`;

  const dots = dotsContainer.querySelectorAll('.dot');
  dots.forEach((dot, i) => {
    if (i < step) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}

function handleClick(clientX: number, clientY: number): void {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const stoneIdx = renderer.getStoneAtPoint(x, y);
  if (stoneIdx < 0) return;

  const now = performance.now();
  const isCorrect = gameState.pressStone(stoneIdx, now);

  if (isCorrect) {
    const freq = gameState.getFreqForStone(stoneIdx);
    audioPlayer.playFreq(freq, 0.6);
  } else {
    audioPlayer.playWrong();
  }

  updateUI();
}

function handleMove(clientX: number, clientY: number): void {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const stoneIdx = renderer.getStoneAtPoint(x, y);
  renderer.setHoveredStone(stoneIdx);
}

function handleReset(): void {
  gameState.reset();
  updateUI();
}

function gameLoop(now: number): void {
  if (now - lastTime >= 16) {
    renderer.render(now);
    lastTime = now;
  }
  animationId = requestAnimationFrame(gameLoop);
}

canvas.addEventListener('click', (e: MouseEvent) => {
  handleClick(e.clientX, e.clientY);
});

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  handleMove(e.clientX, e.clientY);
});

canvas.addEventListener('mouseleave', () => {
  renderer.setHoveredStone(-1);
});

canvas.addEventListener('touchstart', (e: TouchEvent) => {
  e.preventDefault();
  const touch = e.touches[0];
  if (touch) {
    handleClick(touch.clientX, touch.clientY);
  }
}, { passive: false });

canvas.addEventListener('touchmove', (e: TouchEvent) => {
  e.preventDefault();
  const touch = e.touches[0];
  if (touch) {
    handleMove(touch.clientX, touch.clientY);
  }
}, { passive: false });

resetBtn.addEventListener('click', handleReset);

window.addEventListener('resize', () => {
  renderer.resize();
});

updateUI();
animationId = requestAnimationFrame(gameLoop);
