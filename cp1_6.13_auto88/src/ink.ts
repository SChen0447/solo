export interface Point {
  x: number;
  y: number;
}

export interface InkStroke {
  points: Point[];
  opacity: number;
  width: number;
  color: string;
}

export interface InkState {
  strokes: InkStroke[];
  currentStroke: Point[];
  isDrawing: boolean;
  fadeProgress: number;
  isFading: boolean;
  paintingRevealed: boolean;
}

const INK_COLORS = ['#2a2a2a', '#1a1a1a', '#3a3a3a', '#0a0a0a'];

export function createInkState(): InkState {
  return {
    strokes: [],
    currentStroke: [],
    isDrawing: false,
    fadeProgress: 0,
    isFading: false,
    paintingRevealed: false,
  };
}

export function startDrawing(state: InkState, x: number, y: number): void {
  if (state.paintingRevealed) return;
  state.isDrawing = true;
  state.currentStroke = [{ x, y }];
}

export function addStrokePoint(state: InkState, x: number, y: number): void {
  if (!state.isDrawing || state.paintingRevealed) return;
  const last = state.currentStroke[state.currentStroke.length - 1];
  if (last && Math.hypot(x - last.x, y - last.y) > 2) {
    state.currentStroke.push({ x, y });
  }
}

export function endDrawing(state: InkState): void {
  if (!state.isDrawing || state.currentStroke.length < 2) {
    state.isDrawing = false;
    state.currentStroke = [];
    return;
  }
  const stroke: InkStroke = {
    points: [...state.currentStroke],
    opacity: 0.4,
    width: 3,
    color: INK_COLORS[Math.floor(Math.random() * INK_COLORS.length)],
  };
  state.strokes.push(stroke);
  state.isDrawing = false;
  state.currentStroke = [];
}

export function startFade(state: InkState): void {
  if (state.isFading || state.paintingRevealed) return;
  state.isFading = true;
  state.fadeProgress = 0;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function updateInk(state: InkState, deltaTime: number): void {
  if (state.isFading && !state.paintingRevealed) {
    state.fadeProgress += deltaTime / 5000;
    if (state.fadeProgress >= 1) {
      state.fadeProgress = 1;
      state.isFading = false;
      state.paintingRevealed = true;
    }
  }
}

export function renderInk(
  ctx: CanvasRenderingContext2D,
  state: InkState,
  soupBounds: { x: number; y: number; w: number; h: number }
): void {
  ctx.save();
  
  ctx.beginPath();
  ctx.ellipse(
    soupBounds.x + soupBounds.w / 2,
    soupBounds.y + soupBounds.h / 2,
    soupBounds.w / 2,
    soupBounds.h / 2,
    0, 0, Math.PI * 2
  );
  ctx.clip();

  const fadeOpacity = state.isFading ? 1 - easeInOut(state.fadeProgress) : 1;

  for (const stroke of state.strokes) {
    if (stroke.points.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      const p = stroke.points[i];
      const prev = stroke.points[i - 1];
      const cpx = (prev.x + p.x) / 2;
      const cpy = (prev.y + p.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, cpx, cpy);
    }
    ctx.strokeStyle = stroke.color;
    ctx.globalAlpha = stroke.opacity * fadeOpacity;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  if (state.currentStroke.length > 1) {
    ctx.beginPath();
    ctx.moveTo(state.currentStroke[0].x, state.currentStroke[0].y);
    for (let i = 1; i < state.currentStroke.length; i++) {
      const p = state.currentStroke[i];
      const prev = state.currentStroke[i - 1];
      const cpx = (prev.x + p.x) / 2;
      const cpy = (prev.y + p.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, cpx, cpy);
    }
    ctx.strokeStyle = '#1a1a1a';
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  ctx.restore();
}

export function renderPainting(
  ctx: CanvasRenderingContext2D,
  soupBounds: { x: number; y: number; w: number; h: number },
  revealProgress: number
): void {
  if (revealProgress <= 0) return;

  ctx.save();
  
  ctx.beginPath();
  ctx.ellipse(
    soupBounds.x + soupBounds.w / 2,
    soupBounds.y + soupBounds.h / 2,
    soupBounds.w / 2,
    soupBounds.h / 2,
    0, 0, Math.PI * 2
  );
  ctx.clip();

  const cx = soupBounds.x + soupBounds.w / 2;
  const cy = soupBounds.y + soupBounds.h / 2;
  const w = soupBounds.w * 0.85;
  const h = soupBounds.h * 0.85;

  ctx.globalAlpha = easeInOut(revealProgress);

  const gradient = ctx.createLinearGradient(cx, cy - h / 2, cx, cy + h / 2);
  gradient.addColorStop(0, 'rgba(180, 190, 200, 0.3)');
  gradient.addColorStop(0.3, 'rgba(150, 160, 170, 0.2)');
  gradient.addColorStop(1, 'rgba(80, 90, 100, 0.4)');
  ctx.fillStyle = gradient;
  ctx.fillRect(cx - w / 2, cy - h / 2, w, h);

  ctx.strokeStyle = 'rgba(30, 30, 30, 0.8)';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy + h * 0.3);
  ctx.quadraticCurveTo(cx - w * 0.3, cy - h * 0.1, cx - w * 0.1, cy + h * 0.1);
  ctx.quadraticCurveTo(cx + w * 0.1, cy + h * 0.25, cx + w * 0.25, cy - h * 0.05);
  ctx.quadraticCurveTo(cx + w * 0.4, cy - h * 0.3, cx + w * 0.5, cy - h * 0.15);
  ctx.quadraticCurveTo(cx + w * 0.6, cy - h * 0.05, cx + w * 0.7, cy + h * 0.1);
  ctx.quadraticCurveTo(cx + w * 0.85, cy + h * 0.2, cx + w / 2, cy + h * 0.35);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - w * 0.4, cy + h * 0.1);
  ctx.quadraticCurveTo(cx - w * 0.25, cy - h * 0.25, cx - w * 0.05, cy - h * 0.1);
  ctx.quadraticCurveTo(cx + w * 0.1, cy + h * 0.05, cx + w * 0.2, cy - h * 0.15);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + w * 0.1, cy + h * 0.2);
  ctx.quadraticCurveTo(cx + w * 0.25, cy - h * 0.05, cx + w * 0.4, cy + h * 0.05);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(20, 20, 20, 0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const xStart = cx - w * 0.3 + i * w * 0.15;
    ctx.moveTo(xStart, cy + h * 0.32);
    ctx.lineTo(xStart + w * 0.02, cy + h * 0.38);
    ctx.moveTo(xStart + w * 0.01, cy + h * 0.32);
    ctx.lineTo(xStart + w * 0.03, cy + h * 0.38);
  }
  ctx.stroke();

  ctx.strokeStyle = 'rgba(40, 40, 40, 0.5)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.2, cy + h * 0.28);
  ctx.quadraticCurveTo(cx, cy + h * 0.22, cx + w * 0.2, cy + h * 0.28);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 250, 240, 0.7)';
  ctx.beginPath();
  ctx.arc(cx + w * 0.25, cy - h * 0.25, w * 0.06, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
