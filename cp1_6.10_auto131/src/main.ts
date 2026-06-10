import { createBricks, renderBricks, updateBricks, getRemainingBricks, type BrickGrid } from './brick';
import { createPaddle, renderPaddle, movePaddle, updatePaddle, type Paddle } from './paddle';
import { createBall, updateBall, checkCollision, type Ball } from './physics';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const INITIAL_LIVES = 3;
const SCORE_PER_BRICK = 10;
const MAX_ROWS = 12;
const INITIAL_ROWS = 8;
const SHAKE_DURATION = 0.2;
const SHAKE_OFFSET = 5;

interface GameState {
  running: boolean;
  gameOver: boolean;
  score: number;
  lives: number;
  level: number;
  speedBoost: number;
  shakeTime: number;
  elapsedTime: number;
}

function drawBackground(ctx: CanvasRenderingContext2D): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  gradient.addColorStop(0, '#0f2027');
  gradient.addColorStop(1, '#203a43');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawBall(ctx: CanvasRenderingContext2D, ball: Ball): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.save();
  ctx.fillStyle = '#ff4757';
  ctx.beginPath();
  const s = size;
  ctx.moveTo(x + s / 2, y + s * 0.3);
  ctx.bezierCurveTo(x + s / 2, y + s * 0.1, x, y + s * 0.1, x, y + s * 0.35);
  ctx.bezierCurveTo(x, y + s * 0.6, x + s / 2, y + s * 0.85, x + s / 2, y + s);
  ctx.bezierCurveTo(x + s / 2, y + s * 0.85, x + s, y + s * 0.6, x + s, y + s * 0.35);
  ctx.bezierCurveTo(x + s, y + s * 0.1, x + s / 2, y + s * 0.1, x + s / 2, y + s * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.save();
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 23px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`分数: ${state.score}`, 20, 20);

  for (let i = 0; i < state.lives; i++) {
    drawHeart(ctx, CANVAS_WIDTH - 30 - i * 28, 18, 22);
  }

  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(`第 ${state.level} 关`, CANVAS_WIDTH / 2, 24);
  ctx.restore();
}

function drawFPS(ctx: CanvasRenderingContext2D, fps: number): void {
  ctx.save();
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`FPS: ${fps.toFixed(0)}`, CANVAS_WIDTH - 10, CANVAS_HEIGHT - 10);
  ctx.restore();
}

function drawGameOver(ctx: CanvasRenderingContext2D, state: GameState, restartHover: boolean): { x: number; y: number; w: number; h: number } {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 56px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);

  ctx.font = '24px sans-serif';
  ctx.fillStyle = '#ffd700';
  ctx.fillText(`最终分数: ${state.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);

  const btnW = 200;
  const btnH = 56;
  const btnX = (CANVAS_WIDTH - btnW) / 2;
  const btnY = CANVAS_HEIGHT / 2 + 40;

  ctx.beginPath();
  const r = 8;
  ctx.moveTo(btnX + r, btnY);
  ctx.lineTo(btnX + btnW - r, btnY);
  ctx.quadraticCurveTo(btnX + btnW, btnY, btnX + btnW, btnY + r);
  ctx.lineTo(btnX + btnW, btnY + btnH - r);
  ctx.quadraticCurveTo(btnX + btnW, btnY + btnH, btnX + btnW - r, btnY + btnH);
  ctx.lineTo(btnX + r, btnY + btnH);
  ctx.quadraticCurveTo(btnX, btnY + btnH, btnX, btnY + btnH - r);
  ctx.lineTo(btnX, btnY + r);
  ctx.quadraticCurveTo(btnX, btnY, btnX + r, btnY);
  ctx.closePath();

  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ff6b6b';
  if (restartHover) {
    ctx.fillStyle = 'rgba(255, 107, 107, 0.2)';
    ctx.fill();
  }
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('重新开始', CANVAS_WIDTH / 2, btnY + btnH / 2);

  ctx.restore();
  return { x: btnX, y: btnY, w: btnW, h: btnH };
}

function setupCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas element not found');
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get 2D context');
  }
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  function resizeCanvas(): void {
    const container = document.getElementById('game-container');
    if (!container) return;
    const maxW = container.clientWidth;
    const maxH = container.clientHeight;
    const scale = Math.min(maxW / CANVAS_WIDTH, maxH / CANVAS_HEIGHT, 1);
    canvas.style.width = `${CANVAS_WIDTH * scale}px`;
    canvas.style.height = `${CANVAS_HEIGHT * scale}px`;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  return { canvas, ctx };
}

function main(): void {
  const { canvas, ctx } = setupCanvas();

  let paddle: Paddle = createPaddle();
  let ball: Ball = createBall(0);
  let brickGrid: BrickGrid = createBricks(INITIAL_ROWS);
  let mouseX = CANVAS_WIDTH / 2;
  let restartHover = false;

  const state: GameState = {
    running: true,
    gameOver: false,
    score: 0,
    lives: INITIAL_LIVES,
    level: 1,
    speedBoost: 0,
    shakeTime: 0,
    elapsedTime: 0
  };

  let lastTime = performance.now();
  let fps = 60;
  let fpsAccumulator = 0;
  let fpsFrames = 0;
  let restartBtnRect = { x: 0, y: 0, w: 0, h: 0 };

  function getCanvasMousePos(e: MouseEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  canvas.addEventListener('mousemove', (e) => {
    const pos = getCanvasMousePos(e);
    mouseX = pos.x;

    if (state.gameOver) {
      const r = restartBtnRect;
      restartHover = pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h;
    }
  });

  canvas.addEventListener('click', (e) => {
    if (!state.gameOver) return;
    const pos = getCanvasMousePos(e);
    const r = restartBtnRect;
    if (pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h) {
      resetGame();
    }
  });

  function resetGame(): void {
    state.score = 0;
    state.lives = INITIAL_LIVES;
    state.level = 1;
    state.speedBoost = 0;
    state.gameOver = false;
    state.shakeTime = 0;
    paddle = createPaddle();
    ball = createBall(0);
    brickGrid = createBricks(INITIAL_ROWS);
  }

  function nextLevel(): void {
    state.level++;
    const newRows = Math.min(INITIAL_ROWS + state.level - 1, MAX_ROWS);
    state.speedBoost += 0.5;
    brickGrid = createBricks(newRows);
    ball = createBall(state.speedBoost);
  }

  function loseLife(): void {
    state.lives--;
    state.shakeTime = SHAKE_DURATION;
    if (state.lives <= 0) {
      state.gameOver = true;
    } else {
      ball = createBall(state.speedBoost);
    }
  }

  function update(deltaTime: number): void {
    if (state.gameOver) return;

    state.elapsedTime += deltaTime;

    movePaddle(paddle, mouseX, CANVAS_WIDTH);
    updatePaddle(paddle, deltaTime);
    updateBricks(brickGrid, deltaTime);

    if (state.shakeTime > 0) {
      state.shakeTime -= deltaTime;
      if (state.shakeTime < 0) state.shakeTime = 0;
    }

    const { lost } = updateBall(ball);
    if (lost) {
      loseLife();
      return;
    }

    const { brickHit } = checkCollision(ball, paddle, brickGrid);
    if (brickHit) {
      state.score += SCORE_PER_BRICK;
    }

    if (getRemainingBricks(brickGrid) === 0) {
      nextLevel();
    }
  }

  function render(): void {
    let offsetX = 0;
    let offsetY = 0;
    if (state.shakeTime > 0) {
      const intensity = state.shakeTime / SHAKE_DURATION;
      offsetX = (Math.random() - 0.5) * 2 * SHAKE_OFFSET * intensity;
      offsetY = (Math.random() - 0.5) * 2 * SHAKE_OFFSET * intensity;
    }

    ctx.save();
    ctx.translate(offsetX, offsetY);

    drawBackground(ctx);
    renderBricks(ctx, brickGrid, state.elapsedTime);
    renderPaddle(ctx, paddle);
    drawBall(ctx, ball);
    drawHUD(ctx, state);

    ctx.restore();

    drawFPS(ctx, fps);

    if (state.gameOver) {
      restartBtnRect = drawGameOver(ctx, state, restartHover);
    }
  }

  function gameLoop(currentTime: number): void {
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    fpsAccumulator += deltaTime;
    fpsFrames++;
    if (fpsAccumulator >= 0.5) {
      fps = fpsFrames / fpsAccumulator;
      fpsAccumulator = 0;
      fpsFrames = 0;
    }

    update(deltaTime);
    render();

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
}

window.addEventListener('DOMContentLoaded', main);
