export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  flashTime: number;
}

const PADDLE_WIDTH = 120;
const PADDLE_HEIGHT = 18;
const PADDLE_RADIUS = 6;
const PADDLE_OFFSET_BOTTOM = 40;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

export function createPaddle(): Paddle {
  return {
    x: (CANVAS_WIDTH - PADDLE_WIDTH) / 2,
    y: CANVAS_HEIGHT - PADDLE_OFFSET_BOTTOM - PADDLE_HEIGHT,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    radius: PADDLE_RADIUS,
    flashTime: 0
  };
}

export function movePaddle(paddle: Paddle, mouseX: number, canvasWidth: number): void {
  const halfWidth = paddle.width / 2;
  paddle.x = mouseX - halfWidth;
  if (paddle.x < 0) paddle.x = 0;
  if (paddle.x + paddle.width > canvasWidth) paddle.x = canvasWidth - paddle.width;
}

export function triggerFlash(paddle: Paddle): void {
  paddle.flashTime = 0.1;
}

export function updatePaddle(paddle: Paddle, deltaTime: number): void {
  if (paddle.flashTime > 0) {
    paddle.flashTime -= deltaTime;
    if (paddle.flashTime < 0) paddle.flashTime = 0;
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function renderPaddle(ctx: CanvasRenderingContext2D, paddle: Paddle): void {
  const gradient = ctx.createLinearGradient(paddle.x, 0, paddle.x + paddle.width, 0);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');

  ctx.save();
  roundRect(ctx, paddle.x, paddle.y, paddle.width, paddle.height, paddle.radius);
  ctx.fillStyle = gradient;
  ctx.fill();

  if (paddle.flashTime > 0) {
    const alpha = (paddle.flashTime / 0.1) * 0.5;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
  ctx.restore();
}
