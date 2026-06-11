import { BubbleManager } from './manager';

function fitCanvas(canvas: HTMLCanvasElement) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const margin = Math.min(w, h) * 0.04;
  const maxW = w - margin * 2;
  const maxH = h - margin * 2;

  canvas.style.width = maxW + 'px';
  canvas.style.height = maxH + 'px';
}

function init() {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  fitCanvas(canvas);
  window.addEventListener('resize', () => fitCanvas(canvas));

  const manager = new BubbleManager(canvas);

  let lastClickTime = 0;
  let lastClickX = 0;
  let lastClickY = 0;

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const now = performance.now();
    const pos = manager.getCanvasPos(e.clientX, e.clientY);

    if (now - lastClickTime < 300 &&
        Math.abs(pos.x - lastClickX) < 20 &&
        Math.abs(pos.y - lastClickY) < 20) {
      manager.onDoubleClick(e.clientX, e.clientY);
      lastClickTime = 0;
    } else {
      manager.onPointerDown(e.clientX, e.clientY);
      lastClickTime = now;
      lastClickX = pos.x;
      lastClickY = pos.y;
    }
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    manager.onPointerMove(e.clientX, e.clientY);
  });

  canvas.addEventListener('pointerup', (e) => {
    manager.onPointerUp();
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch (_) {}
  });

  canvas.addEventListener('pointercancel', (e) => {
    manager.onPointerUp();
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch (_) {}
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  const clearBtn = document.getElementById('clearBtn');
  const randomBtn = document.getElementById('randomBtn');
  const saveBtn = document.getElementById('saveBtn');

  clearBtn?.addEventListener('click', () => manager.clearAll());
  randomBtn?.addEventListener('click', () => manager.generateRandom(15));
  saveBtn?.addEventListener('click', () => manager.saveImage());

  function loop(now: number) {
    manager.frame(now);
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
