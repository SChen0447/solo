import gsap from 'gsap';
import { FluidRenderer, type RendererStats } from './fluidRenderer';

const canvas = document.getElementById('fluid-canvas') as HTMLCanvasElement | null;
const hintEl = document.getElementById('hint') as HTMLDivElement | null;

const btnClear = document.getElementById('btn-clear') as HTMLButtonElement | null;
const btnSave = document.getElementById('btn-save') as HTMLButtonElement | null;
const btnPause = document.getElementById('btn-pause') as HTMLButtonElement | null;

const iconPause = document.getElementById('icon-pause') as SVGSVGElement | null;
const iconPlay = document.getElementById('icon-play') as SVGSVGElement | null;

if (!canvas) {
  throw new Error('Canvas element #fluid-canvas not found');
}

const renderer = new FluidRenderer(canvas);

let lastInteractTime = 0;
const showHint = () => {
  if (hintEl) hintEl.classList.remove('fade');
};
const hideHint = () => {
  if (hintEl && !hintEl.classList.contains('fade')) {
    hintEl.classList.add('fade');
  }
};

let stats: RendererStats = renderer.getStats();
renderer.setStatsCallback((s) => { stats = s; });

interface PointerState {
  active: boolean;
  downX: number;
  downY: number;
  downTime: number;
  lastX: number;
  lastY: number;
  lastTime: number;
  moved: boolean;
  moveThreshold: number;
  lastTrailTime: number;
  particleTimer: number;
  lastParticleTime: number;
}

const ptr: PointerState = {
  active: false,
  downX: 0, downY: 0, downTime: 0,
  lastX: 0, lastY: 0, lastTime: 0,
  moved: false,
  moveThreshold: 5,
  lastTrailTime: 0,
  particleTimer: 0,
  lastParticleTime: 0
};

interface PendingMove {
  x: number; y: number; t: number; consumed: boolean;
}
let pendingMove: PendingMove | null = null;

const now = () => performance.now();

function handlePointerDown(x: number, y: number): void {
  lastInteractTime = now();
  hideHint();
  ptr.active = true;
  ptr.downX = ptr.lastX = x;
  ptr.downY = ptr.lastY = y;
  ptr.downTime = ptr.lastTime = now();
  ptr.moved = false;
  ptr.lastTrailTime = 0;
  ptr.particleTimer = 0;
  ptr.lastParticleTime = now();

  renderer.addVortex(x, y);
}

function handlePointerMove(x: number, y: number): void {
  if (!ptr.active) return;
  lastInteractTime = now();
  const t = now();
  const dx = x - ptr.lastX;
  const dy = y - ptr.lastY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (!ptr.moved && dist > ptr.moveThreshold) {
    ptr.moved = true;
  }

  const dtMs = Math.max(1, t - ptr.lastTime);
  const dtSec = dtMs / 1000;
  const speed = dist / dtSec;

  if (ptr.moved) {
    const trailInterval = 10;
    if (t - ptr.lastTrailTime >= trailInterval) {
      const samples = Math.max(1, Math.min(4, Math.floor(dist / 6)));
      for (let i = 1; i <= samples; i++) {
        const tt = i / samples;
        const sx = ptr.lastX + dx * tt;
        const sy = ptr.lastY + dy * tt;
        renderer.addTrail(sx, sy, speed);
      }
      ptr.lastTrailTime = t;
    }
  }

  ptr.lastX = x;
  ptr.lastY = y;
  ptr.lastTime = t;
}

function handlePointerUp(): void {
  ptr.active = false;
}

const isPointInsideButton = (x: number, y: number): boolean => {
  const btns = [btnClear, btnSave, btnPause];
  for (const b of btns) {
    if (!b) continue;
    const r = b.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true;
  }
  return false;
};

canvas.addEventListener('mousedown', (e: MouseEvent) => {
  if (isPointInsideButton(e.clientX, e.clientY)) return;
  handlePointerDown(e.clientX, e.clientY);
});
window.addEventListener('mousemove', (e: MouseEvent) => {
  pendingMove = { x: e.clientX, y: e.clientY, t: now(), consumed: false };
});
window.addEventListener('mouseup', handlePointerUp);
window.addEventListener('mouseleave', handlePointerUp);

const handleTouchStart = (e: TouchEvent) => {
  if (e.touches.length === 0) return;
  const t = e.touches[0];
  if (isPointInsideButton(t.clientX, t.clientY)) return;
  e.preventDefault();
  handlePointerDown(t.clientX, t.clientY);
};
const handleTouchMove = (e: TouchEvent) => {
  if (e.touches.length === 0) return;
  e.preventDefault();
  const t = e.touches[0];
  pendingMove = { x: t.clientX, y: t.clientY, t: now(), consumed: false };
};
const handleTouchEnd = (e: TouchEvent) => {
  e.preventDefault();
  handlePointerUp();
};

canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

let resizeTimer: number | null = null;
window.addEventListener('resize', () => {
  if (resizeTimer) window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    renderer.resize();
  }, 100);
});

function setupButton(btn: HTMLButtonElement): void {
  gsap.set(btn, { y: 0 });
  btn.addEventListener('mouseenter', () => {
    gsap.to(btn, {
      y: -2,
      backgroundColor: 'rgba(255,255,255,0.2)',
      duration: 0.45,
      ease: 'elastic.out(1, 0.6)'
    });
  });
  btn.addEventListener('mouseleave', () => {
    gsap.to(btn, {
      y: 0,
      backgroundColor: 'rgba(255,255,255,0.1)',
      duration: 0.3,
      ease: 'power2.out'
    });
  });
  btn.addEventListener('mousedown', () => {
    gsap.to(btn, {
      scale: 0.95,
      duration: 0.15,
      ease: 'back.in(2)'
    });
  });
  const release = () => {
    gsap.to(btn, {
      scale: 1,
      duration: 0.35,
      ease: 'elastic.out(1, 0.5)'
    });
  };
  btn.addEventListener('mouseup', release);
  btn.addEventListener('mouseleave', release);
  btn.addEventListener('touchstart', (e) => {
    e.stopPropagation();
    gsap.to(btn, { scale: 0.95, duration: 0.12, ease: 'back.in(2)' });
  }, { passive: true });
  btn.addEventListener('touchend', (e) => {
    e.stopPropagation();
    release();
  });

  btn.addEventListener('mousemove', (e) => {
    const r = btn.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * 100;
    const my = ((e.clientY - r.top) / r.height) * 100;
    btn.style.setProperty('--mx', `${mx}%`);
    btn.style.setProperty('--my', `${my}%`);
  });
}

if (btnClear) setupButton(btnClear);
if (btnSave) setupButton(btnSave);
if (btnPause) setupButton(btnPause);

if (btnClear) {
  btnClear.addEventListener('click', (e) => {
    e.stopPropagation();
    renderer.startClear();
  });
}

if (btnSave) {
  btnSave.addEventListener('click', (e) => {
    e.stopPropagation();
    renderer.exportImage();
  });
}

if (btnPause && iconPause && iconPlay) {
  const updatePauseIcon = (paused: boolean) => {
    iconPause.style.display = paused ? 'none' : '';
    iconPlay.style.display = paused ? '' : 'none';
  };
  btnPause.addEventListener('click', (e) => {
    e.stopPropagation();
    const paused = renderer.togglePause();
    updatePauseIcon(paused);
    gsap.to(btnPause, {
      keyframes: [
        { scale: 0.92, duration: 0.1, ease: 'power2.in' },
        { scale: 1.08, duration: 0.18, ease: 'elastic.out(1, 0.4)' },
        { scale: 1, duration: 0.2, ease: 'power2.out' }
      ]
    });
  });
}

const PARTICLE_MIN_INTERVAL = 100;
const PARTICLE_MAX_INTERVAL = 200;
let nextParticleInterval = PARTICLE_MIN_INTERVAL + Math.random() * (PARTICLE_MAX_INTERVAL - PARTICLE_MIN_INTERVAL);
const STILL_HOLD_MS = 380;
const STILL_MOVE_LIMIT = 12;

function updateHoldParticles(t: number, dtMs: number): void {
  if (!ptr.active) return;
  const holdDur = t - ptr.downTime;
  if (holdDur < STILL_HOLD_MS) return;
  if (ptr.moved) {
    const totalDx = ptr.lastX - ptr.downX;
    const totalDy = ptr.lastY - ptr.downY;
    const totalDist = Math.sqrt(totalDx * totalDx + totalDy * totalDy);
    if (totalDist > STILL_MOVE_LIMIT) return;
    ptr.moved = false;
  }
  ptr.particleTimer += dtMs;
  if (ptr.particleTimer >= nextParticleInterval) {
    ptr.particleTimer = 0;
    nextParticleInterval = PARTICLE_MIN_INTERVAL + Math.random() * (PARTICLE_MAX_INTERVAL - PARTICLE_MIN_INTERVAL);
    const burstN = 1 + (Math.random() < 0.35 ? 1 : 0);
    for (let i = 0; i < burstN; i++) {
      const angle = Math.random() * Math.PI * 2;
      const rr = Math.random() * 18;
      const px = ptr.lastX + Math.cos(angle) * rr;
      const py = ptr.lastY + Math.sin(angle) * rr;
      renderer.addDot(px, py);
    }
  }
}

let hintTimer = 0;
let frameCount = 0;

function loop(t: number): void {
  const prevT = (loop as any)._last || t;
  let dtMs = t - prevT;
  if (dtMs > 80) dtMs = 80;
  (loop as any)._last = t;

  if (pendingMove && !pendingMove.consumed) {
    handlePointerMove(pendingMove.x, pendingMove.y);
    pendingMove.consumed = true;
  }

  updateHoldParticles(t, dtMs);

  renderer.renderFrame(t);

  hintTimer += dtMs;
  frameCount++;
  if (hintTimer > 8000) {
    hintTimer = 0;
    const idle = (now() - lastInteractTime) > 7000;
    if (idle) showHint();
  }
  void frameCount;
  void stats;

  requestAnimationFrame(loop);
}

requestAnimationFrame((t) => {
  (loop as any)._last = t;
  requestAnimationFrame(loop);
});

window.addEventListener('contextmenu', (e) => {
  if ((e.target as HTMLElement).closest('#fluid-canvas')) {
    e.preventDefault();
  }
});
