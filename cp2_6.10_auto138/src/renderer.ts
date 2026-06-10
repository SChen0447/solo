import type { TrajectoryPoint, KeyPoints, ScoreResult, JumpParams } from './physics';
import { GROUND_Y } from './physics';

export interface RenderState {
  trajectory: TrajectoryPoint[];
  keyPoints: KeyPoints;
  currentPoint: TrajectoryPoint;
  score: ScoreResult | null;
  hoveredKey: 'start' | 'peak' | 'landing' | null;
  mouseX: number;
  mouseY: number;
}

const BG_COLOR = '#1a1a2e';
const TRAJECTORY_COLOR = '#999';
const KEY_POINT_COLOR = '#f1c40f';
const GROUND_COLOR = '#0f3460';

function getCharacterColor(vy: number): string {
  if (vy < -50) return '#3498db';
  if (vy > 50) return '#e74c3c';
  return '#ecf0f1';
}

function getArrowColor(speed: number): string {
  if (speed < 100) return '#3498db';
  if (speed < 250) return '#f1c40f';
  return '#e74c3c';
}

export function render(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: RenderState
) {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = GROUND_COLOR;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(width, GROUND_Y);
  ctx.stroke();

  drawTrajectory(ctx, state.trajectory);
  drawKeyPoints(ctx, state.keyPoints);
  drawCharacter(ctx, state.currentPoint);
  drawVelocityVector(ctx, state.currentPoint);
  drawScore(ctx, state.score);

  if (state.hoveredKey) {
    const kp = state.keyPoints[state.hoveredKey];
    if (kp) {
      drawTooltip(ctx, state.mouseX, state.mouseY, kp, state.hoveredKey);
    }
  }
}

function drawTrajectory(ctx: CanvasRenderingContext2D, trajectory: TrajectoryPoint[]) {
  if (trajectory.length < 2) return;

  ctx.strokeStyle = TRAJECTORY_COLOR;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(trajectory[0].x, trajectory[0].y);
  for (let i = 1; i < trajectory.length; i++) {
    ctx.lineTo(trajectory[i].x, trajectory[i].y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawKeyPoints(ctx: CanvasRenderingContext2D, keyPoints: KeyPoints) {
  const keys: Array<'start' | 'peak' | 'landing'> = ['start', 'peak', 'landing'];
  for (const k of keys) {
    const p = keyPoints[k];
    if (p) {
      ctx.fillStyle = KEY_POINT_COLOR;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      let label = '';
      if (k === 'start') label = '起';
      else if (k === 'peak') label = '顶';
      else if (k === 'landing') label = '落';
      ctx.fillText(label, p.x, p.y - 12);
    }
  }
}

function drawCharacter(ctx: CanvasRenderingContext2D, point: TrajectoryPoint) {
  const color = getCharacterColor(point.vy);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const speed = Math.sqrt(point.vx * point.vx + point.vy * point.vy);
  ctx.fillStyle = '#fff';
  ctx.font = '11px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`v:${speed.toFixed(0)}`, point.x + 12, point.y + 4);
}

function drawVelocityVector(ctx: CanvasRenderingContext2D, point: TrajectoryPoint) {
  const speed = Math.sqrt(point.vx * point.vx + point.vy * point.vy);
  if (speed < 1) return;

  const arrowLength = 30;
  const nx = point.vx / speed;
  const ny = point.vy / speed;
  const endX = point.x + nx * arrowLength;
  const endY = point.y + ny * arrowLength;

  const color = getArrowColor(speed);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(point.x, point.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  const headLen = 8;
  const angle = Math.atan2(ny, nx);
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX - headLen * Math.cos(angle - Math.PI / 6), endY - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(endX - headLen * Math.cos(angle + Math.PI / 6), endY - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

function drawScore(ctx: CanvasRenderingContext2D, score: ScoreResult | null) {
  const padding = 16;
  const width = 140;
  const height = 100;
  const x = 20;
  const y = 20;

  ctx.fillStyle = '#00000080';
  roundRect(ctx, x, y, width, height, 8);
  ctx.fill();

  if (score) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(score.total.toString(), x + width / 2, y + 44);

    ctx.fillStyle = '#aaa';
    ctx.font = '16px sans-serif';
    ctx.fillText(score.rating, x + width / 2, y + 70);
  } else {
    ctx.fillStyle = '#666';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('等待跳跃...', x + width / 2, y + height / 2);
  }
}

function drawTooltip(
  ctx: CanvasRenderingContext2D,
  mx: number,
  my: number,
  point: TrajectoryPoint,
  key: 'start' | 'peak' | 'landing'
) {
  const label = key === 'start' ? '起跳点' : key === 'peak' ? '最高点' : '落地点';
  const text = `${label}\n坐标: (${point.x.toFixed(1)}, ${point.y.toFixed(1)})\n帧数: ${point.frame}`;
  const lines = text.split('\n');
  const padding = 8;
  const lineHeight = 16;
  const width = 140;
  const height = lines.length * lineHeight + padding * 2;

  let tx = mx + 14;
  let ty = my - height - 10;
  if (tx + width > ctx.canvas.width) tx = mx - width - 14;
  if (ty < 0) ty = my + 14;

  ctx.fillStyle = '#000000cc';
  roundRect(ctx, tx, ty, width, height, 6);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  lines.forEach((line, i) => {
    ctx.fillText(line, tx + padding, ty + padding + 12 + i * lineHeight);
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawMiniTrajectory(
  ctx: CanvasRenderingContext2D,
  trajectory: TrajectoryPoint[],
  w: number,
  h: number
) {
  if (trajectory.length < 2) return;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#16213e';
  ctx.fillRect(0, 0, w, h);

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of trajectory) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const rangeX = Math.max(1, maxX - minX);
  const rangeY = Math.max(1, maxY - minY);
  const scaleX = (w - 6) / rangeX;
  const scaleY = (h - 6) / rangeY;
  const scale = Math.min(scaleX, scaleY);

  ctx.strokeStyle = '#e94560';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < trajectory.length; i++) {
    const p = trajectory[i];
    const px = 3 + (p.x - minX) * scale;
    const py = 3 + (p.y - minY) * scale;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
}

export function isPointInCircle(px: number, py: number, cx: number, cy: number, r: number): boolean {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}
