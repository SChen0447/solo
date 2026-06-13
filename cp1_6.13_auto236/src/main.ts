import { gsap } from 'gsap';
import { Game } from './game';

let game: Game;
let lastTime = 0;
let animationId = 0;

const scoreValueEl = document.getElementById('scoreValue') as HTMLDivElement;
const comboValueEl = document.getElementById('comboValue') as HTMLDivElement;
const finalScoreEl = document.getElementById('finalScore') as HTMLDivElement;
const gameOverOverlay = document.getElementById('gameOverOverlay') as HTMLDivElement;
const restartBtn = document.getElementById('restartBtn') as HTMLButtonElement;
const hintEl = document.getElementById('hint') as HTMLDivElement;

function updateScore(score: number): void {
  if (scoreValueEl) {
    scoreValueEl.textContent = String(score);
    gsap.fromTo(scoreValueEl,
      { scale: 1.3 },
      { scale: 1, duration: 0.2, ease: 'back.out' }
    );
  }
}

function updateCombo(combo: number): void {
  if (comboValueEl) {
    comboValueEl.textContent = `${combo} / 3`;
    if (combo > 0) {
      gsap.fromTo(comboValueEl,
        { scale: 1.2, color: '#ff6b6b' },
        { scale: 1, color: '#ffffff', duration: 0.3 }
      );
    }
  }
}

function showGameOver(score: number): void {
  if (finalScoreEl) {
    finalScoreEl.textContent = String(score);
  }
  if (gameOverOverlay) {
    gameOverOverlay.classList.add('visible');
    gsap.fromTo(gameOverOverlay,
      { opacity: 0 },
      { opacity: 1, duration: 0.6, ease: 'power2.out' }
    );
  }
  if (hintEl) {
    hintEl.style.display = 'none';
  }
}

function hideGameOver(): void {
  if (gameOverOverlay) {
    gsap.to(gameOverOverlay, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        gameOverOverlay.classList.remove('visible');
      }
    });
  }
  if (hintEl) {
    hintEl.style.display = 'block';
  }
}

function gameLoop(currentTime: number): void {
  if (lastTime === 0) {
    lastTime = currentTime;
  }
  const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.05);
  lastTime = currentTime;

  game.update(deltaTime, currentTime);
  game.draw(currentTime);

  animationId = requestAnimationFrame(gameLoop);
}

function getCanvasPos(e: MouseEvent | Touch): { x: number; y: number } {
  const rect = (e.target as HTMLElement).getBoundingClientRect
    ? (e.target as HTMLElement).getBoundingClientRect()
    : { left: 0, top: 0 };
  return {
    x: (e.clientX ?? 0) - rect.left,
    y: (e.clientY ?? 0) - rect.top
  };
}

function init(): void {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  game = new Game(canvas);
  game.setCallbacks(updateScore, updateCombo, showGameOver);

  canvas.addEventListener('mousedown', (e) => {
    const pos = getCanvasPos(e);
    game.startDrag(pos.x, pos.y);
    if (hintEl) hintEl.style.display = 'none';
  });

  canvas.addEventListener('mousemove', (e) => {
    const pos = getCanvasPos(e);
    game.updateDrag(pos.x, pos.y);
  });

  canvas.addEventListener('mouseup', () => {
    game.endDrag();
  });

  canvas.addEventListener('mouseleave', () => {
    game.endDrag();
  });

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const pos = getCanvasPos(e.touches[0]);
      game.startDrag(pos.x, pos.y);
      if (hintEl) hintEl.style.display = 'none';
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const pos = getCanvasPos(e.touches[0]);
      game.updateDrag(pos.x, pos.y);
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    game.endDrag();
  }, { passive: false });

  window.addEventListener('resize', () => {
    game.resize();
  });

  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      hideGameOver();
      game.reset();
    });
  }

  lastTime = 0;
  animationId = requestAnimationFrame(gameLoop);
}

document.addEventListener('DOMContentLoaded', init);
