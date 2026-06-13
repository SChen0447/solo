import { Board } from './board';
import { ShogiGame } from './shogi';
import { clearAllEffects } from './effects';

let board: Board;
let game: ShogiGame;
let undoBtn: HTMLButtonElement;
let lastTrailTime = 0;
const TRAIL_THROTTLE = 350;

function computeViewportSize(): number {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isMobile = vw < 768;
  const availWidth = isMobile ? vw * 0.9 : vw;
  const availHeight = vh - 60;
  const size = Math.max(360, Math.min(availWidth, availHeight));
  return Math.floor(size);
}

function handleResize(): void {
  const size = computeViewportSize();
  board.resize(size);
}

function updateUndoButton(): void {
  undoBtn.disabled = !game.canUndo();
  undoBtn.textContent = `↶ 撤销 (Z)`;
}

function handleClick(gridX: number, gridY: number): void {
  const moved = game.doMove(gridX, gridY);
  if (moved) {
    updateUndoButton();
  }
}

function handleHover(gridX: number | null, gridY: number | null): void {
  if (gridX === null || gridY === null) return;
  const now = performance.now();
  if (now - lastTrailTime < TRAIL_THROTTLE) return;
  const stone = game.getStone(gridX, gridY);
  if (stone) {
    lastTrailTime = now;
    board.triggerHoverTrail(stone);
  }
}

function handleUndo(): void {
  const undone = game.undoMove();
  if (undone) {
    updateUndoButton();
  }
}

function handleKeyDown(e: KeyboardEvent): void {
  if ((e.key === 'z' || e.key === 'Z') && !e.metaKey && !e.ctrlKey && !e.altKey && !e.repeat) {
    handleUndo();
  }
}

function init(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas element #game-canvas not found');
  }
  undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
  if (!undoBtn) {
    throw new Error('Undo button #undo-btn not found');
  }

  board = new Board(canvas, {
    onClick: handleClick,
    onHover: handleHover
  });

  game = new ShogiGame(board);

  handleResize();

  board.updateTurnCount(0);
  board.updateRecentMoves([]);
  updateUndoButton();

  window.addEventListener('resize', handleResize);
  window.addEventListener('keydown', handleKeyDown);
  undoBtn.addEventListener('click', handleUndo);

  startLoop();
}

let lastTime = 0;
function startLoop(): void {
  lastTime = performance.now();

  function frame(now: number): void {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    board.render(dt);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.addEventListener('beforeunload', () => {
  clearAllEffects();
});
