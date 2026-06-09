import { Game, GRID_SIZE, CELL_SIZE } from './game';
import { Snake, Direction } from './snake';

const MOVE_INTERVAL = 120;
const HEAD_BLINK_PERIOD = 500;
const FOOD_GLOW_PERIOD = 800;

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const score1El = document.querySelector('.player1-score') as HTMLSpanElement;
const score2El = document.querySelector('.player2-score') as HTMLSpanElement;
const aiIndicator = document.querySelector('.ai-mode-indicator') as HTMLSpanElement;

const game = new Game();

let lastFrameTime = 0;
let moveAccumulator = 0;
let startTime = performance.now();

function handleKeyDown(e: KeyboardEvent): void {
  switch (e.key) {
    case 'w':
    case 'W':
      game.setDirection(1, 'up');
      break;
    case 's':
    case 'S':
      game.setDirection(1, 'down');
      break;
    case 'a':
    case 'A':
      game.setDirection(1, 'left');
      break;
    case 'd':
    case 'D':
      game.setDirection(1, 'right');
      break;
    case 'ArrowUp':
      game.setDirection(2, 'up');
      e.preventDefault();
      break;
    case 'ArrowDown':
      game.setDirection(2, 'down');
      e.preventDefault();
      break;
    case 'ArrowLeft':
      game.setDirection(2, 'left');
      e.preventDefault();
      break;
    case 'ArrowRight':
      game.setDirection(2, 'right');
      e.preventDefault();
      break;
    case 'Tab':
      game.toggleAIMode();
      updateAIIndicator();
      e.preventDefault();
      break;
    case ' ':
      if (game.status !== 'playing') {
        game.reset();
      }
      e.preventDefault();
      break;
  }
}

function updateAIIndicator(): void {
  aiIndicator.textContent = game.aiMode ? 'AI模式' : '';
}

function updateScores(): void {
  score1El.textContent = `玩家1: ${game.score1}`;
  score2El.textContent = `${game.snake2.isAI ? '电脑' : '玩家2'}: ${game.score2}`;
}

function drawGrid(): void {
  ctx.fillStyle = '#2C2C2C';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#CCCCCC';
  ctx.lineWidth = 1;

  for (let i = 0; i <= GRID_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(i * CELL_SIZE, 0);
    ctx.lineTo(i * CELL_SIZE, GRID_SIZE * CELL_SIZE);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i * CELL_SIZE);
    ctx.lineTo(GRID_SIZE * CELL_SIZE, i * CELL_SIZE);
    ctx.stroke();
  }
}

function drawSnake(snake: Snake, t: number): void {
  const blinkPhase = (t % HEAD_BLINK_PERIOD) / HEAD_BLINK_PERIOD;
  const headAlpha = 0.7 + 0.3 * Math.abs(Math.sin(blinkPhase * Math.PI));

  for (let i = snake.body.length - 1; i >= 0; i--) {
    const seg = snake.body[i];
    const isHead = i === 0;
    const size = isHead ? 34 : CELL_SIZE - 4;
    const offset = isHead ? -2 : 2;
    const radius = 4;

    const x = seg.x * CELL_SIZE + offset;
    const y = seg.y * CELL_SIZE + offset;

    ctx.save();
    if (isHead) {
      ctx.globalAlpha = headAlpha;
    }
    ctx.fillStyle = snake.color;

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + size - radius, y);
    ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
    ctx.lineTo(x + size, y + size - radius);
    ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
    ctx.lineTo(x + radius, y + size);
    ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

function drawFood(t: number): void {
  const glowPhase = (t % FOOD_GLOW_PERIOD) / FOOD_GLOW_PERIOD;
  const glowAlpha = 0.3 + 0.3 * Math.abs(Math.sin(glowPhase * Math.PI));
  const glowRadius = 10 + 6 * Math.abs(Math.sin(glowPhase * Math.PI));

  const cx = game.food.x * CELL_SIZE + CELL_SIZE / 2;
  const cy = game.food.y * CELL_SIZE + CELL_SIZE / 2;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius + 4);
  grad.addColorStop(0, `rgba(255, 230, 100, ${glowAlpha})`);
  grad.addColorStop(1, 'rgba(255, 230, 100, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, glowRadius + 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fill();
}

function drawGameOver(): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'white';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let message = '';
  if (game.status === 'player1_win') {
    message = '玩家1 获胜！';
  } else if (game.status === 'player2_win') {
    message = game.snake2.isAI ? '电脑 获胜！' : '玩家2 获胜！';
  } else if (game.status === 'draw') {
    message = '平局！';
  }

  ctx.fillText(message, canvas.width / 2, canvas.height / 2 - 16);
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('按空格重新开始', canvas.width / 2, canvas.height / 2 + 20);
}

function render(t: number): void {
  drawGrid();
  drawFood(t);
  drawSnake(game.snake1, t);
  drawSnake(game.snake2, t);
  if (game.status !== 'playing') {
    drawGameOver();
  }
}

function loop(now: number): void {
  const dt = now - lastFrameTime;
  lastFrameTime = now;
  moveAccumulator += dt;

  while (moveAccumulator >= MOVE_INTERVAL) {
    game.tick();
    moveAccumulator -= MOVE_INTERVAL;
    updateScores();
  }

  const elapsed = performance.now() - startTime;
  render(elapsed);

  requestAnimationFrame(loop);
}

window.addEventListener('keydown', handleKeyDown);
updateAIIndicator();
updateScores();
requestAnimationFrame((t) => {
  lastFrameTime = t;
  loop(t);
});
