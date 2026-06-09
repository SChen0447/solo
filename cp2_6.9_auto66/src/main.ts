interface Point {
  x: number;
  y: number;
}

interface CreaseState {
  points: Point[];
  opacity: number;
  isDrawing: boolean;
  fadeTimer: number | null;
}

const MAX_POINTS = 20;
const FADE_DURATION = 500;
const FADE_INTERVAL = 16;

const state: CreaseState = {
  points: [],
  opacity: 1,
  isDrawing: false,
  fadeTimer: null
};

let letterEl: HTMLElement | null = null;
let paintLayerEl: HTMLElement | null = null;
let resetBtnEl: HTMLElement | null = null;
let rafId: number | null = null;
let lastPoint: Point | null = null;

function catmullRomSmooth(points: Point[], segments: number = 3): Point[] {
  if (points.length < 2) return points.slice();

  const result: Point[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    for (let s = 0; s < segments; s++) {
      const t = s / segments;
      const t2 = t * t;
      const t3 = t2 * t;

      const x = 0.5 * (
        (2 * p1.x) +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
      );

      const y = 0.5 * (
        (2 * p1.y) +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
      );

      result.push({ x, y });
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

function addPoint(pt: Point): void {
  if (lastPoint) {
    const dx = pt.x - lastPoint.x;
    const dy = pt.y - lastPoint.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 2) return;
  }

  state.points.push({ ...pt });
  if (state.points.length > MAX_POINTS) {
    state.points.shift();
  }
  lastPoint = { ...pt };
  schedulePaint();
}

function schedulePaint(): void {
  if (rafId !== null) return;
  rafId = requestAnimationFrame(paint);
}

function paint(): void {
  rafId = null;
  if (!paintLayerEl) return;

  const smoothed = catmullRomSmooth(state.points, 4);
  const jsonStr = JSON.stringify(smoothed);

  paintLayerEl.style.setProperty('--crease-points', jsonStr);
  paintLayerEl.style.setProperty('--crease-opacity', state.opacity.toString());
}

function clearFadeTimer(): void {
  if (state.fadeTimer !== null) {
    window.clearInterval(state.fadeTimer);
    state.fadeTimer = null;
  }
}

function startFadeOut(): void {
  clearFadeTimer();
  const step = FADE_INTERVAL / FADE_DURATION;

  state.fadeTimer = window.setInterval(() => {
    state.opacity -= step;
    if (state.opacity <= 0) {
      state.opacity = 0;
      clearFadeTimer();
      state.points = [];
    }
    schedulePaint();
  }, FADE_INTERVAL);
}

function getLocalPoint(clientX: number, clientY: number): Point | null {
  if (!letterEl) return null;
  const rect = letterEl.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
    return null;
  }
  return { x, y };
}

function handlePointerDown(e: PointerEvent): void {
  e.preventDefault();
  const pt = getLocalPoint(e.clientX, e.clientY);
  if (!pt) return;

  state.isDrawing = true;
  clearFadeTimer();
  state.opacity = 1;
  state.points = [];
  lastPoint = null;
  addPoint(pt);

  if (letterEl) {
    letterEl.setPointerCapture(e.pointerId);
  }
}

function handlePointerMove(e: PointerEvent): void {
  if (!state.isDrawing) return;
  e.preventDefault();
  const pt = getLocalPoint(e.clientX, e.clientY);
  if (pt) {
    addPoint(pt);
  }
}

function handlePointerUp(e: PointerEvent): void {
  if (!state.isDrawing) return;
  state.isDrawing = false;

  if (letterEl) {
    try {
      letterEl.releasePointerCapture(e.pointerId);
    } catch (_) {
      // noop
    }
  }

  lastPoint = null;

  if (state.points.length >= 2) {
    startFadeOut();
  } else {
    state.points = [];
    state.opacity = 1;
    schedulePaint();
  }
}

function handleReset(): void {
  clearFadeTimer();
  state.points = [];
  state.opacity = 1;
  state.isDrawing = false;
  lastPoint = null;
  schedulePaint();
}

export function init(): void {
  letterEl = document.getElementById('letter');
  paintLayerEl = document.getElementById('paintLayer');
  resetBtnEl = document.getElementById('resetBtn');

  if (!letterEl || !paintLayerEl || !resetBtnEl) {
    console.error('Required DOM elements not found');
    return;
  }

  paintLayerEl.style.setProperty('--crease-points', '[]');
  paintLayerEl.style.setProperty('--crease-opacity', '1');

  letterEl.addEventListener('pointerdown', handlePointerDown);
  letterEl.addEventListener('pointermove', handlePointerMove);
  letterEl.addEventListener('pointerup', handlePointerUp);
  letterEl.addEventListener('pointercancel', handlePointerUp);
  letterEl.addEventListener('pointerleave', (e) => {
    if (state.isDrawing) handlePointerUp(e);
  });

  resetBtnEl.addEventListener('click', handleReset);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
