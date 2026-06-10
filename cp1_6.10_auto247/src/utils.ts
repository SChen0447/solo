export type ToolType = 'rect' | 'circle' | 'path' | 'sticky' | 'handwrite';

export interface Point {
  x: number;
  y: number;
}

export interface BaseElement {
  id: string;
  type: string;
  color: string;
}

export interface RectElement extends BaseElement {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleElement extends BaseElement {
  type: 'circle';
  cx: number;
  cy: number;
  r: number;
}

export interface PathElement extends BaseElement {
  type: 'path';
  points: Point[];
  lineWidth: number;
  isHandwrite?: boolean;
}

export interface StickyElement extends BaseElement {
  type: 'sticky';
  x: number;
  y: number;
  width: number;
  text: string;
}

export type CanvasElement = RectElement | CircleElement | PathElement | StickyElement;

export interface CoauthorCursor {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const COAUTHOR_COLORS = [
  '#f59e0b',
  '#10b981',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#a16207',
  '#6b7280',
  '#e11d48'
];

const COAUTHOR_NAMES = ['用户A', '用户B', '用户C', '用户D', '用户E', '用户F', '用户G', '用户H'];

export const COLOR_PALETTE = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#ec4899',
  '#f43f5e',
  '#64748b',
  '#1e293b'
];

const STORAGE_KEY = 'canvas-symbiosis-elements';

export function randomId(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

export function drawRect(ctx: CanvasRenderingContext2D, el: RectElement): void {
  ctx.save();
  ctx.strokeStyle = el.color;
  ctx.lineWidth = 2;
  ctx.strokeRect(el.x, el.y, el.width, el.height);
  ctx.restore();
}

export function drawCircle(ctx: CanvasRenderingContext2D, el: CircleElement): void {
  ctx.save();
  ctx.strokeStyle = el.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(el.cx, el.cy, el.r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawPath(ctx: CanvasRenderingContext2D, el: PathElement): void {
  const pts = el.points;
  if (pts.length < 2) return;
  ctx.save();
  ctx.strokeStyle = el.isHandwrite ? '#000000' : el.color;
  ctx.lineWidth = el.lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  if (pts.length === 2) {
    ctx.lineTo(pts[1].x, pts[1].y);
  } else {
    for (let i = 1; i < pts.length - 1; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2;
      const yc = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawSticky(ctx: CanvasRenderingContext2D, el: StickyElement): void {
  ctx.save();
  const padding = 10;
  const lineHeight = 20;
  const fontSize = 14;
  ctx.font = `${fontSize}px 'Comic Sans MS', cursive`;
  const text = el.text || '';
  const charsPerLine = Math.floor((el.width - padding * 2) / (fontSize * 0.6));
  const lines: string[] = [];
  for (let i = 0; i < text.length; i += charsPerLine) {
    lines.push(text.slice(i, i + charsPerLine));
  }
  if (lines.length === 0) lines.push('');
  const height = lines.length * lineHeight + padding * 2;
  ctx.fillStyle = '#fef9c3';
  ctx.fillRect(el.x, el.y, el.width, height);
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  ctx.strokeRect(el.x, el.y, el.width, height);
  ctx.fillStyle = '#1e293b';
  ctx.textBaseline = 'top';
  lines.forEach((line, i) => {
    ctx.fillText(line, el.x + padding, el.y + padding + i * lineHeight);
  });
  ctx.restore();
}

export function getStickyHeight(text: string, width: number): number {
  const padding = 10;
  const lineHeight = 20;
  const fontSize = 14;
  const charsPerLine = Math.floor((width - padding * 2) / (fontSize * 0.6));
  const lineCount = text.length === 0 ? 1 : Math.ceil(text.length / charsPerLine);
  return lineCount * lineHeight + padding * 2;
}

export function saveElements(elements: CanvasElement[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(elements));
  } catch (e) {
    console.warn('Failed to save elements to localStorage', e);
  }
}

export function loadElements(): CanvasElement[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? (JSON.parse(data) as CanvasElement[]) : [];
  } catch (e) {
    console.warn('Failed to load elements from localStorage', e);
    return [];
  }
}

export function createCoauthor(viewportWidth: number, viewportHeight: number, existingNames: string[]): CoauthorCursor {
  const availableNames = COAUTHOR_NAMES.filter((n) => !existingNames.includes(n));
  const name = availableNames.length > 0
    ? availableNames[Math.floor(Math.random() * availableNames.length)]
    : `用户${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
  const color = COAUTHOR_COLORS[Math.floor(Math.random() * COAUTHOR_COLORS.length)];
  const speed = 50 + Math.random() * 150;
  const angle = Math.random() * Math.PI * 2;
  return {
    id: randomId(),
    name,
    color,
    x: Math.random() * viewportWidth,
    y: Math.random() * viewportHeight,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed
  };
}

export function updateCoauthor(cursor: CoauthorCursor, viewportWidth: number, viewportHeight: number, dt: number): CoauthorCursor {
  let { x, y, vx, vy } = cursor;
  x += vx * dt;
  y += vy * dt;
  if (x < 0) { x = 0; vx = Math.abs(vx); }
  if (x > viewportWidth) { x = viewportWidth; vx = -Math.abs(vx); }
  if (y < 0) { y = 0; vy = Math.abs(vy); }
  if (y > viewportHeight) { y = viewportHeight; vy = -Math.abs(vy); }
  if (Math.random() < 0.01) {
    const speed = Math.sqrt(vx * vx + vy * vy);
    const angle = Math.random() * Math.PI * 2;
    vx = Math.cos(angle) * speed;
    vy = Math.sin(angle) * speed;
  }
  return { ...cursor, x, y, vx, vy };
}

export function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
