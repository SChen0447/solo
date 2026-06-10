import { FlowerManager, type GrowthParams } from './flower';
import { UIDrawer } from './ui';

function main(): void {
  const canvas = document.getElementById('garden') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Canvas 2D context not available');
    return;
  }

  function resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resizeCanvas();

  const rect = canvas.getBoundingClientRect();
  let width = rect.width;
  let height = rect.height;

  const initialParams: GrowthParams = { light: 8, water: 50, fertility: 5 };

  const flower = new FlowerManager(width, height);
  const ui = new UIDrawer(width, height, initialParams, (params) => {
    flower.setParams(params);
  });

  function onResize(): void {
    resizeCanvas();
    const r = canvas.getBoundingClientRect();
    width = r.width;
    height = r.height;
    flower.resize(width, height);
    ui.resize(width, height);
  }
  window.addEventListener('resize', onResize);

  function getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  let isDragging = false;
  let lastHealthState: 'healthy' | 'warning' | 'danger' = 'healthy';

  function getHealthState(score: number): 'healthy' | 'warning' | 'danger' {
    if (score >= 80) return 'healthy';
    if (score >= 50) return 'warning';
    return 'danger';
  }

  function onMouseDown(e: MouseEvent): void {
    const { x, y } = getCanvasCoords(e);
    if (ui.handleMouseDown(x, y)) {
      isDragging = true;
    } else if (!ui.isInsidePanel(x, y) && flower.isFlowerClicked(x, y)) {
      const now = performance.now();
      ui.showInfoBar(flower.getAgeSeconds(), flower.getHealthPercent(), now);
    }
  }

  function onMouseMove(e: MouseEvent): void {
    const { x, y } = getCanvasCoords(e);
    if (ui.handleMouseMove(x, y)) {
      isDragging = true;
    }
  }

  function onMouseUp(): void {
    if (ui.handleMouseUp()) {
      isDragging = false;
    }
  }

  function onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 0) return;
    e.preventDefault();
    const t = e.touches[0];
    const { x, y } = getCanvasCoords(t);
    if (ui.handleMouseDown(x, y)) {
      isDragging = true;
    } else if (!ui.isInsidePanel(x, y) && flower.isFlowerClicked(x, y)) {
      const now = performance.now();
      ui.showInfoBar(flower.getAgeSeconds(), flower.getHealthPercent(), now);
    }
  }

  function onTouchMove(e: TouchEvent): void {
    if (e.touches.length === 0) return;
    e.preventDefault();
    const t = e.touches[0];
    const { x, y } = getCanvasCoords(t);
    if (ui.handleMouseMove(x, y)) {
      isDragging = true;
    }
  }

  function onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    if (ui.handleMouseUp()) {
      isDragging = false;
    }
  }

  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: false });

  let lastFrame = performance.now();

  function loop(now: number): void {
    const dt = now - lastFrame;
    lastFrame = now;

    flower.update(now);
    const healthScore = flower.getHealthScore();
    ui.update(now, healthScore);

    const currentState = getHealthState(healthScore);
    if (currentState === 'danger' && lastHealthState !== 'danger') {
      ui.triggerWarning(now);
    }
    lastHealthState = currentState;

    ctx.clearRect(0, 0, width, height);
    flower.draw(ctx, now);
    ui.draw(ctx, now, healthScore);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

window.addEventListener('DOMContentLoaded', main);
