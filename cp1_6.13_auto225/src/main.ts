import { PuzzleBoard } from './puzzleBoard';
import { PuzzlePiece } from './puzzlePiece';
import { EffectManager } from './effects';
import gsap from 'gsap';

const canvas = document.getElementById('puzzle-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const completedCanvas = document.getElementById('completed-image') as HTMLCanvasElement;
const completedCtx = completedCanvas.getContext('2d')!;
const timerEl = document.getElementById('timer') as HTMLDivElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const lightBurstEl = document.getElementById('light-burst') as HTMLDivElement;
const container = document.getElementById('puzzle-container') as HTMLDivElement;

let dpr = window.devicePixelRatio || 1;
let board: PuzzleBoard;
let effects: EffectManager;
let currentPiece: PuzzlePiece | null = null;
let isDragging = false;
let isComplete = false;
let isResetting = false;

let timerStarted = false;
let startTime = 0;
let elapsedTime = 0;
let timerAnimationId: number | null = null;

let lastTime = 0;

function init(): void {
  resizeCanvas();
  board = new PuzzleBoard(canvas.width / dpr, canvas.height / dpr);
  effects = new EffectManager(canvas.width / dpr, canvas.height / dpr);

  drawCompletedImage();

  setupEventListeners();
  lastTime = performance.now();
  render(lastTime);
}

function resizeCanvas(): void {
  dpr = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';

  completedCanvas.width = rect.width * dpr;
  completedCanvas.height = rect.height * dpr;
  completedCanvas.style.width = rect.width + 'px';
  completedCanvas.style.height = rect.height + 'px';

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  completedCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (board) {
    board.resize(rect.width, rect.height);
    effects.resize(rect.width, rect.height);
    drawCompletedImage();
  }
}

function drawCompletedImage(): void {
  completedCtx.clearRect(0, 0, completedCanvas.width, completedCanvas.height);
  board.renderCompletedImage(completedCtx);
}

function setupEventListeners(): void {
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('resize', onResize);
  resetBtn.addEventListener('click', onReset);

  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd);
}

function getMousePos(e: MouseEvent | TouchEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  let clientX: number, clientY: number;

  if ('touches' in e) {
    clientX = e.touches[0]?.clientX ?? (e.changedTouches[0]?.clientX || 0);
    clientY = e.touches[0]?.clientY ?? (e.changedTouches[0]?.clientY || 0);
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }

  return {
    x: (clientX - rect.left),
    y: (clientY - rect.top)
  };
}

function onMouseDown(e: MouseEvent): void {
  if (isComplete || isResetting) return;

  const pos = getMousePos(e);
  const piece = board.getPieceAtPoint(pos.x, pos.y);

  if (piece && !piece.isLocked) {
    currentPiece = piece;
    isDragging = true;
    piece.startDrag(pos.x, pos.y);
    board.bringToFront(piece);

    if (!timerStarted) {
      startTimer();
    }
  }
}

function onMouseMove(e: MouseEvent): void {
  if (!isDragging || !currentPiece || isResetting) return;

  const pos = getMousePos(e);
  currentPiece.onDrag(pos.x, pos.y);
}

function onMouseUp(_e: MouseEvent): void {
  if (!isDragging || !currentPiece || isResetting) return;

  const result = currentPiece.endDrag();
  if (result && result.snapped) {
    effects.createRipple(result.x, result.y, currentPiece.color);
    checkComplete();
  }

  currentPiece = null;
  isDragging = false;
}

function onTouchStart(e: TouchEvent): void {
  e.preventDefault();
  const touch = e.touches[0];
  onMouseDown({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
}

function onTouchMove(e: TouchEvent): void {
  e.preventDefault();
  const touch = e.touches[0];
  onMouseMove({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
}

function onTouchEnd(e: TouchEvent): void {
  const touch = e.changedTouches[0];
  onMouseUp({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
}

function onResize(): void {
  resizeCanvas();
}

function onReset(): void {
  if (isResetting) return;

  isResetting = true;
  isComplete = false;
  stopTimer();
  resetTimer();
  effects.stopFlash(timerEl);
  effects.fadeOutImage(completedCanvas, 0.3);

  effects.clear();

  board.explodeAll();

  gsap.delayedCall(0.5, () => {
    board.reset();
    isResetting = false;
  });
}

function startTimer(): void {
  timerStarted = true;
  startTime = performance.now() - elapsedTime;
  updateTimer();
}

function stopTimer(): void {
  if (timerAnimationId) {
    cancelAnimationFrame(timerAnimationId);
    timerAnimationId = null;
  }
  timerStarted = false;
}

function resetTimer(): void {
  elapsedTime = 0;
  timerEl.textContent = '00:00';
}

function updateTimer(): void {
  elapsedTime = performance.now() - startTime;
  const totalSeconds = Math.floor(elapsedTime / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  timerEl.textContent = `${padZero(minutes)}:${padZero(seconds)}`;

  if (timerStarted) {
    timerAnimationId = requestAnimationFrame(updateTimer);
  }
}

function padZero(n: number): string {
  return n.toString().padStart(2, '0');
}

function checkComplete(): void {
  if (board.isComplete() && !isComplete) {
    isComplete = true;
    stopTimer();
    effects.flashElement(timerEl);

    gsap.delayedCall(0.5, () => {
      effects.triggerLightBurst(
        board.centerX,
        board.centerY,
        lightBurstEl,
        () => {
          effects.fadeInImage(completedCanvas, 2);
        }
      );
    });
  }
}

function render(timestamp: number): void {
  const deltaTime = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  const clampedDelta = Math.min(deltaTime, 0.05);

  effects.update(clampedDelta);

  ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

  board.renderBackground(ctx, isComplete);
  board.renderPieces(ctx);
  effects.render(ctx);

  requestAnimationFrame(render);
}

window.addEventListener('load', init);
