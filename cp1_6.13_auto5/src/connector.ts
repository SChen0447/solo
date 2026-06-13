import type { NodeData } from './nodes';
import { getNodeColor } from './nodes';

export interface ConnectionData {
  id: string;
  fromId: string;
  toId: string;
  flowProgress: number;
  flowSpeed: number;
}

let connectionIdCounter = 0;

export function createConnection(fromId: string, toId: string): ConnectionData {
  connectionIdCounter++;
  return {
    id: `conn-${connectionIdCounter}`,
    fromId,
    toId,
    flowProgress: Math.random(),
    flowSpeed: 0.0008 + Math.random() * 0.0006,
  };
}

function getControlPoints(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): { cp1x: number; cp1y: number; cp2x: number; cp2y: number } {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const offset = dist * 0.4;

  const angle = Math.atan2(dy, dx);
  const perpAngle = angle + Math.PI / 2;

  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;

  const cp1x = fromX + dx * 0.35 + Math.cos(perpAngle) * offset * 0.3;
  const cp1y = fromY + dy * 0.35 + Math.sin(perpAngle) * offset * 0.3;
  const cp2x = fromX + dx * 0.65 - Math.cos(perpAngle) * offset * 0.3;
  const cp2y = fromY + dy * 0.65 - Math.sin(perpAngle) * offset * 0.3;

  return { cp1x, cp1y, cp2x, cp2y };
}

function getPointOnCubicBezier(
  t: number,
  p0x: number,
  p0y: number,
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  p3x: number,
  p3y: number
): { x: number; y: number } {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  const x = mt3 * p0x + 3 * mt2 * t * p1x + 3 * mt * t2 * p2x + t3 * p3x;
  const y = mt3 * p0y + 3 * mt2 * t * p1y + 3 * mt * t2 * p2y + t3 * p3y;

  return { x, y };
}

function distancePointToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  }

  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + t * dx;
  const projY = y1 + t * dy;

  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

export function hitTestConnection(
  conn: ConnectionData,
  nodes: NodeData[],
  x: number,
  y: number,
  scale: number = 1
): boolean {
  const fromNode = nodes.find((n) => n.id === conn.fromId);
  const toNode = nodes.find((n) => n.id === conn.toId);

  if (!fromNode || !toNode) return false;

  const fromX = fromNode.x * scale;
  const fromY = fromNode.y * scale;
  const toX = toNode.x * scale;
  const toY = toNode.y * scale;

  const { cp1x, cp1y, cp2x, cp2y } = getControlPoints(fromX, fromY, toX, toY);

  const steps = 20;
  let minDist = Infinity;

  for (let i = 0; i < steps; i++) {
    const t1 = i / steps;
    const t2 = (i + 1) / steps;
    const p1 = getPointOnCubicBezier(t1, fromX, fromY, cp1x, cp1y, cp2x, cp2y, toX, toY);
    const p2 = getPointOnCubicBezier(t2, fromX, fromY, cp1x, cp1y, cp2x, cp2y, toX, toY);
    const dist = distancePointToSegment(x, y, p1.x, p1.y, p2.x, p2.y);
    if (dist < minDist) minDist = dist;
  }

  return minDist <= 8;
}

export function updateConnection(conn: ConnectionData, deltaTime: number): void {
  conn.flowProgress += conn.flowSpeed * deltaTime;
  if (conn.flowProgress > 1) {
    conn.flowProgress = 0;
  }
}

export function drawConnection(
  ctx: CanvasRenderingContext2D,
  conn: ConnectionData,
  nodes: NodeData[],
  time: number,
  scale: number
): void {
  const fromNode = nodes.find((n) => n.id === conn.fromId);
  const toNode = nodes.find((n) => n.id === conn.toId);

  if (!fromNode || !toNode) return;

  const fromColor = getNodeColor(fromNode);
  const toColor = getNodeColor(toNode);

  const fromX = fromNode.x * scale;
  const fromY = fromNode.y * scale;
  const toX = toNode.x * scale;
  const toY = toNode.y * scale;

  const { cp1x, cp1y, cp2x, cp2y } = getControlPoints(fromX, fromY, toX, toY);

  const gradient = ctx.createLinearGradient(fromX, fromY, toX, toY);
  gradient.addColorStop(0, `rgba(${fromColor.r}, ${fromColor.g}, ${fromColor.b}, 0.7)`);
  gradient.addColorStop(0.5, `rgba(${Math.floor((fromColor.r + toColor.r) / 2)}, ${Math.floor((fromColor.g + toColor.g) / 2)}, ${Math.floor((fromColor.b + toColor.b) / 2)}, 0.85)`);
  gradient.addColorStop(1, `rgba(${toColor.r}, ${toColor.g}, ${toColor.b}, 0.7)`);

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2.5 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, toX, toY);
  ctx.stroke();

  ctx.strokeStyle = `rgba(${Math.floor((fromColor.r + toColor.r) / 2)}, ${Math.floor((fromColor.g + toColor.g) / 2)}, ${Math.floor((fromColor.b + toColor.b) / 2)}, 0.15)`;
  ctx.lineWidth = 8 * scale;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, toX, toY);
  ctx.stroke();

  const flowPoint = getPointOnCubicBezier(
    conn.flowProgress,
    fromX, fromY,
    cp1x, cp1y,
    cp2x, cp2y,
    toX, toY
  );

  const flowColorR = Math.floor(fromColor.r + (toColor.r - fromColor.r) * conn.flowProgress);
  const flowColorG = Math.floor(fromColor.g + (toColor.g - fromColor.g) * conn.flowProgress);
  const flowColorB = Math.floor(fromColor.b + (toColor.b - fromColor.b) * conn.flowProgress);

  const glowSize = 10 * scale;
  const glowGradient = ctx.createRadialGradient(
    flowPoint.x, flowPoint.y, 0,
    flowPoint.x, flowPoint.y, glowSize
  );
  glowGradient.addColorStop(0, `rgba(${flowColorR}, ${flowColorG}, ${flowColorB}, 0.9)`);
  glowGradient.addColorStop(0.4, `rgba(${flowColorR}, ${flowColorG}, ${flowColorB}, 0.4)`);
  glowGradient.addColorStop(1, `rgba(${flowColorR}, ${flowColorG}, ${flowColorB}, 0)`);

  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(flowPoint.x, flowPoint.y, glowSize, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(255, 255, 255, 0.95)`;
  ctx.beginPath();
  ctx.arc(flowPoint.x, flowPoint.y, 3 * scale, 0, Math.PI * 2);
  ctx.fill();

  const reverseProgress = (conn.flowProgress + 0.5) % 1;
  const reversePoint = getPointOnCubicBezier(
    reverseProgress,
    fromX, fromY,
    cp1x, cp1y,
    cp2x, cp2y,
    toX, toY
  );

  const reverseColorR = Math.floor(toColor.r + (fromColor.r - toColor.r) * reverseProgress);
  const reverseColorG = Math.floor(toColor.g + (fromColor.g - toColor.g) * reverseProgress);
  const reverseColorB = Math.floor(toColor.b + (fromColor.b - toColor.b) * reverseProgress);

  const glowSize2 = 8 * scale;
  const glowGradient2 = ctx.createRadialGradient(
    reversePoint.x, reversePoint.y, 0,
    reversePoint.x, reversePoint.y, glowSize2
  );
  glowGradient2.addColorStop(0, `rgba(${reverseColorR}, ${reverseColorG}, ${reverseColorB}, 0.7)`);
  glowGradient2.addColorStop(0.5, `rgba(${reverseColorR}, ${reverseColorG}, ${reverseColorB}, 0.3)`);
  glowGradient2.addColorStop(1, `rgba(${reverseColorR}, ${reverseColorG}, ${reverseColorB}, 0)`);

  ctx.fillStyle = glowGradient2;
  ctx.beginPath();
  ctx.arc(reversePoint.x, reversePoint.y, glowSize2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(255, 255, 255, 0.8)`;
  ctx.beginPath();
  ctx.arc(reversePoint.x, reversePoint.y, 2 * scale, 0, Math.PI * 2);
  ctx.fill();
}

export function drawPreviewCurve(
  ctx: CanvasRenderingContext2D,
  fromNode: NodeData,
  mouseX: number,
  mouseY: number,
  scale: number
): void {
  const fromColor = getNodeColor(fromNode);
  const fromX = fromNode.x * scale;
  const fromY = fromNode.y * scale;

  const { cp1x, cp1y, cp2x, cp2y } = getControlPoints(fromX, fromY, mouseX, mouseY);

  ctx.strokeStyle = `rgba(${fromColor.r}, ${fromColor.g}, ${fromColor.b}, 0.6)`;
  ctx.lineWidth = 2 * scale;
  ctx.lineCap = 'round';
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, mouseX, mouseY);
  ctx.stroke();
  ctx.setLineDash([]);
}
