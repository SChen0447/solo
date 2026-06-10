import { Board } from './board';
import { Pieces, PieceColor } from './pieces';
import { ParticleSystem } from './particle';

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let board: Board;
let pieces: Pieces;
let particles: ParticleSystem;
let lastTime: number = 0;
let currentTurn: PieceColor = 'red';
let resetButtonHover: boolean = false;
let resetButtonRect = { x: 0, y: 0, w: 120, h: 40 };

function init(): void {
  canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  const c = canvas.getContext('2d');
  if (!c) throw new Error('Failed to get 2d context');
  ctx = c;
  resize();
  board = new Board(canvas.width, canvas.height);
  particles = new ParticleSystem();
  pieces = new Pieces(board, particles);
  currentTurn = pieces.getCurrentTurn();
  pieces.setCallbacks(
    () => {
      board.triggerRotation();
    },
    (color: PieceColor) => {
      currentTurn = color;
    }
  );
  window.addEventListener('resize', resize);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', onMouseUp);
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (board) {
    board.resize(window.innerWidth, window.innerHeight);
  }
  resetButtonRect.x = window.innerWidth / 2 - resetButtonRect.w / 2;
  resetButtonRect.y = window.innerHeight - 60;
}

function onMouseDown(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  if (isInResetButton(sx, sy)) {
    handleReset();
    return;
  }
  pieces.handleMouseDown(sx, sy);
}

function onMouseMove(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  resetButtonHover = isInResetButton(sx, sy);
  canvas.style.cursor = resetButtonHover ? 'pointer' : 'default';
  pieces.handleMouseMove(sx, sy);
}

function onMouseUp(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  pieces.handleMouseUp(sx, sy);
}

function isInResetButton(x: number, y: number): boolean {
  return x >= resetButtonRect.x && x <= resetButtonRect.x + resetButtonRect.w &&
         y >= resetButtonRect.y && y <= resetButtonRect.y + resetButtonRect.h;
}

function handleReset(): void {
  pieces.reset();
  particles.clear();
  board.startFadeIn();
  currentTurn = pieces.getCurrentTurn();
}

function drawUI(): void {
  const fadeAlpha = board.getFadeAlpha();
  ctx.save();
  ctx.globalAlpha = fadeAlpha;

  ctx.font = '20px sans-serif';
  ctx.textBaseline = 'top';
  const turnColor = currentTurn === 'red' ? '#ff6b8a' : '#4fc3f7';
  ctx.fillStyle = turnColor;
  ctx.fillText(currentTurn === 'red' ? '红方回合' : '蓝方回合', 20, 20);

  const redCount = pieces.getRedCount();
  const blueCount = pieces.getBlueCount();
  ctx.textBaseline = 'middle';
  let rx = window.innerWidth - 140;
  const ry = 30;

  ctx.fillStyle = '#ff6b8a';
  ctx.shadowColor = '#ff6b8a';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(rx, ry, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#eeeeee';
  ctx.fillText(String(redCount), rx + 14, ry);

  rx += 50;
  ctx.fillStyle = '#4fc3f7';
  ctx.shadowColor = '#4fc3f7';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(rx, ry, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#eeeeee';
  ctx.fillText(String(blueCount), rx + 14, ry);

  const btnBg = resetButtonHover ? '#555555' : '#333333';
  ctx.fillStyle = btnBg;
  const r = 8;
  const bx = resetButtonRect.x;
  const by = resetButtonRect.y;
  const bw = resetButtonRect.w;
  const bh = resetButtonRect.h;
  ctx.beginPath();
  ctx.moveTo(bx + r, by);
  ctx.lineTo(bx + bw - r, by);
  ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
  ctx.lineTo(bx + bw, by + bh - r);
  ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
  ctx.lineTo(bx + r, by + bh);
  ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
  ctx.lineTo(bx, by + r);
  ctx.quadraticCurveTo(bx, by, bx + r, by);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('重置', bx + bw / 2, by + bh / 2);
  ctx.textAlign = 'left';

  ctx.restore();
}

function loop(now: number): void {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  board.update(dt);
  pieces.update(dt);
  particles.update(dt);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  board.draw(ctx);
  pieces.draw(ctx, board.getFadeAlpha());
  particles.draw(ctx);
  drawUI();

  requestAnimationFrame(loop);
}

init();
