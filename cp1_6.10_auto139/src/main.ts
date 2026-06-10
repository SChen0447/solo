import { RuneType, drawRune, RUNE_SIZE } from './frenShapes.js';
import { ParticleSystem, Point } from './elementEffects.js';
import { GestureMatcher } from './gestureHandler.js';

interface RuneState {
  type: RuneType;
  position: Point;
  activated: boolean;
  flashTimer: number;
}

interface GameState {
  runes: RuneState[];
  currentStroke: Point[];
  isDrawing: boolean;
  strokeFadeTimer: number;
  strokeAlpha: number;
  particles: ParticleSystem;
  activatedCount: number;
  victory: boolean;
  magicCircleAngleOuter: number;
  magicCircleAngleInner: number;
  victoryTextAlpha: number;
  victoryTextY: number;
  countBadgeScale: number;
  countBadgeTargetScale: number;
  countBadgeAnimTimer: number;
  canvasWidth: number;
  canvasHeight: number;
}

const MAX_STROKE_POINTS = 200;
const MIN_CANVAS = 400;
const MAX_CANVAS_W = 1920;
const MAX_CANVAS_H = 1080;
const CORNER_MARGIN = 50;

let state: GameState;
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let matcher: GestureMatcher;
let lastTime = 0;
const resetButtonPos: Point = { x: 0, y: 0 };
const resetButtonRadius = 20;
const badgePos: Point = { x: 0, y: 0 };

function shuffleRunes(): RuneType[] {
  const runes = [RuneType.FIRE, RuneType.WATER, RuneType.WIND, RuneType.EARTH];
  for (let i = runes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [runes[i], runes[j]] = [runes[j], runes[i]];
  }
  return runes;
}

function computeCanvasSize(): { w: number; h: number } {
  const w = Math.min(Math.max(window.innerWidth, MIN_CANVAS), MAX_CANVAS_W);
  const h = Math.min(Math.max(window.innerHeight, MIN_CANVAS), MAX_CANVAS_H);
  return { w, h };
}

function getCornerPositions(w: number, h: number): Point[] {
  const offset = CORNER_MARGIN + RUNE_SIZE * 0.7;
  return [
    { x: offset, y: offset },
    { x: w - offset, y: offset },
    { x: offset, y: h - offset },
    { x: w - offset, y: h - offset },
  ];
}

function initRunes(w: number, h: number): RuneState[] {
  const types = shuffleRunes();
  const positions = getCornerPositions(w, h);
  return types.map((type, i) => ({
    type,
    position: positions[i],
    activated: false,
    flashTimer: 0,
  }));
}

function resetGame(): void {
  const { w, h } = computeCanvasSize();
  state.runes = initRunes(w, h);
  state.currentStroke = [];
  state.isDrawing = false;
  state.strokeFadeTimer = 0;
  state.strokeAlpha = 0.8;
  state.particles.clear();
  state.activatedCount = 0;
  state.victory = false;
  state.magicCircleAngleOuter = 0;
  state.magicCircleAngleInner = 0;
  state.victoryTextAlpha = 0;
  state.victoryTextY = -30;
  state.countBadgeScale = 1;
  state.countBadgeTargetScale = 1;
  state.countBadgeAnimTimer = 0;
  state.canvasWidth = w;
  state.canvasHeight = h;
  badgePos.x = CORNER_MARGIN + 30;
  badgePos.y = CORNER_MARGIN + 30;
  resetButtonPos.x = w - CORNER_MARGIN - resetButtonRadius;
  resetButtonPos.y = CORNER_MARGIN + resetButtonRadius;
}

function resizeCanvas(): void {
  const { w, h } = computeCanvasSize();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  state.canvasWidth = w;
  state.canvasHeight = h;

  const positions = getCornerPositions(w, h);
  state.runes.forEach((r, i) => {
    r.position = positions[i];
  });
  resetButtonPos.x = w - CORNER_MARGIN - resetButtonRadius;
  resetButtonPos.y = CORNER_MARGIN + resetButtonRadius;
}

function elasticOut(t: number): number {
  if (t === 0) return 0;
  if (t === 1) return 1;
  const p = 0.3;
  return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
}

function getEventPos(e: MouseEvent | TouchEvent): Point | null {
  const rect = canvas.getBoundingClientRect();
  if ('touches' in e) {
    if (e.touches.length === 0) return null;
    const t = e.touches[0];
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function handleStart(e: MouseEvent | TouchEvent): void {
  e.preventDefault();
  const pos = getEventPos(e);
  if (!pos) return;

  const dx = pos.x - resetButtonPos.x;
  const dy = pos.y - resetButtonPos.y;
  if (Math.sqrt(dx * dx + dy * dy) <= resetButtonRadius) {
    resetGame();
    return;
  }

  if (state.victory) return;

  state.isDrawing = true;
  state.currentStroke = [pos];
  state.strokeFadeTimer = 0;
  state.strokeAlpha = 0.8;
}

function handleMove(e: MouseEvent | TouchEvent): void {
  if (!state.isDrawing) return;
  e.preventDefault();
  const pos = getEventPos(e);
  if (!pos) return;

  if (state.currentStroke.length >= MAX_STROKE_POINTS) {
    state.currentStroke.shift();
  }
  state.currentStroke.push(pos);
}

function handleEnd(e: MouseEvent | TouchEvent): void {
  if (!state.isDrawing) return;
  e.preventDefault();
  state.isDrawing = false;

  if (state.currentStroke.length < 5) {
    state.strokeFadeTimer = 0.2;
    return;
  }

  const matchResult = matcher.match(state.currentStroke);
  if (matchResult) {
    const rune = state.runes.find((r) => r.type === matchResult && !r.activated);
    if (rune) {
      rune.activated = true;
      rune.flashTimer = 0.5;
      state.particles.spawnEffect(rune.type, rune.position);
      state.activatedCount++;
      state.countBadgeTargetScale = 1.5;
      state.countBadgeAnimTimer = 0.3;

      if (state.activatedCount >= 4) {
        state.victory = true;
      }
      state.currentStroke = [];
      return;
    }
  }
  state.strokeFadeTimer = 0.2;
}

function update(dt: number): void {
  for (const rune of state.runes) {
    if (rune.flashTimer > 0) {
      rune.flashTimer -= dt;
      if (rune.flashTimer < 0) rune.flashTimer = 0;
    }
  }

  if (state.strokeFadeTimer > 0) {
    state.strokeFadeTimer -= dt;
    if (state.strokeFadeTimer <= 0) {
      state.strokeFadeTimer = 0;
      state.currentStroke = [];
      state.strokeAlpha = 0.8;
    } else {
      state.strokeAlpha = 0.8 * (state.strokeFadeTimer / 0.2);
    }
  }

  state.particles.update(dt);

  if (state.countBadgeAnimTimer > 0) {
    state.countBadgeAnimTimer -= dt;
    const t = 1 - state.countBadgeAnimTimer / 0.3;
    state.countBadgeScale = 1 + (state.countBadgeTargetScale - 1) * (1 - elasticOut(t));
    if (state.countBadgeAnimTimer <= 0) {
      state.countBadgeAnimTimer = 0;
      state.countBadgeScale = 1;
      state.countBadgeTargetScale = 1;
    }
  }

  if (state.victory) {
    state.magicCircleAngleOuter += dt * 15 * (Math.PI / 180);
    state.magicCircleAngleInner -= dt * 10 * (Math.PI / 180);
    if (state.victoryTextAlpha < 1) {
      state.victoryTextAlpha = Math.min(1, state.victoryTextAlpha + dt * 2);
    }
    const targetY = 0;
    if (state.victoryTextY < targetY) {
      state.victoryTextY = Math.min(targetY, state.victoryTextY + dt * 120);
    }
  }
}

function drawStroke(): void {
  if (state.currentStroke.length < 2) return;
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.globalAlpha = state.strokeAlpha;
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(state.currentStroke[0].x, state.currentStroke[0].y);
  for (let i = 1; i < state.currentStroke.length; i++) {
    ctx.lineTo(state.currentStroke[i].x, state.currentStroke[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawBadge(): void {
  const scale = state.countBadgeScale;
  ctx.save();
  ctx.translate(badgePos.x, badgePos.y);
  ctx.scale(scale, scale);

  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, Math.PI * 2);
  ctx.fillStyle = '#2ecc71';
  ctx.shadowColor = '#2ecc71';
  ctx.shadowBlur = 10;
  ctx.fill();

  const fontSize = 24 + (scale - 1) * 40;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowBlur = 0;
  ctx.fillText(String(state.activatedCount), 0, 1);
  ctx.restore();
}

function drawResetButton(): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(resetButtonPos.x, resetButtonPos.y, resetButtonRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#e74c3c';
  ctx.shadowColor = '#e74c3c';
  ctx.shadowBlur = 8;
  ctx.fill();

  ctx.font = '18px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowBlur = 0;
  ctx.fillText('\u21BB', resetButtonPos.x, resetButtonPos.y + 1);
  ctx.restore();
}

function drawMagicCircle(cx: number, cy: number): void {
  ctx.save();
  ctx.strokeStyle = '#9b59b6';
  ctx.lineWidth = 4;
  ctx.shadowColor = '#9b59b6';
  ctx.shadowBlur = 15;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(state.magicCircleAngleOuter);
  ctx.beginPath();
  ctx.arc(0, 0, 120, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(state.magicCircleAngleInner);
  ctx.beginPath();
  ctx.arc(0, 0, 80, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

function drawVictoryText(cx: number, cy: number): void {
  if (state.victoryTextAlpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = state.victoryTextAlpha;
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#9b59b6';
  ctx.shadowColor = '#9b59b6';
  ctx.shadowBlur = 20;
  ctx.fillText('阵法已激活', cx, cy + 180 + state.victoryTextY);
  ctx.restore();
}

function render(): void {
  const w = state.canvasWidth;
  const h = state.canvasHeight;

  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  for (const rune of state.runes) {
    drawRune(ctx, rune.type, rune.position.x, rune.position.y, RUNE_SIZE, rune.activated, rune.flashTimer);
  }

  state.particles.render(ctx);
  drawStroke();
  drawBadge();
  drawResetButton();

  if (state.victory) {
    const cx = w / 2;
    const cy = h / 2;
    drawMagicCircle(cx, cy);
    drawVictoryText(cx, cy);
  }
}

function loop(time: number): void {
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

function initGame(): void {
  canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const ctxResult = canvas.getContext('2d');
  if (!ctxResult) {
    throw new Error('Cannot get 2D context');
  }
  ctx = ctxResult;
  matcher = new GestureMatcher();

  const { w, h } = computeCanvasSize();
  state = {
    runes: initRunes(w, h),
    currentStroke: [],
    isDrawing: false,
    strokeFadeTimer: 0,
    strokeAlpha: 0.8,
    particles: new ParticleSystem(),
    activatedCount: 0,
    victory: false,
    magicCircleAngleOuter: 0,
    magicCircleAngleInner: 0,
    victoryTextAlpha: 0,
    victoryTextY: -30,
    countBadgeScale: 1,
    countBadgeTargetScale: 1,
    countBadgeAnimTimer: 0,
    canvasWidth: w,
    canvasHeight: h,
  };

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  canvas.addEventListener('mousedown', handleStart);
  canvas.addEventListener('mousemove', handleMove);
  canvas.addEventListener('mouseup', handleEnd);
  canvas.addEventListener('mouseleave', handleEnd);

  canvas.addEventListener('touchstart', handleStart, { passive: false });
  canvas.addEventListener('touchmove', handleMove, { passive: false });
  canvas.addEventListener('touchend', handleEnd, { passive: false });
  canvas.addEventListener('touchcancel', handleEnd, { passive: false });

  lastTime = performance.now();
  requestAnimationFrame(loop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}
