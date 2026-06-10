import { SandManager } from './sandManager';
import { ToolPanel } from './toolPanel';

function bootstrap(): void {
  const canvas = document.getElementById('sandCanvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('Canvas element #sandCanvas not found');
    return;
  }

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const manager = new SandManager(canvas);
  new ToolPanel();

  let isPointerDown = false;

  const getPos = (e: MouseEvent | Touch): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const onPointerDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    isPointerDown = true;
    const { x, y } = getPos(e);
    manager.setMouseDown(x, y);
  };

  const onPointerMove = (e: MouseEvent) => {
    const { x, y } = getPos(e);
    manager.setMouseMove(x, y);
  };

  const onPointerUp = () => {
    isPointerDown = false;
    manager.setMouseUp();
  };

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 0) return;
    e.preventDefault();
    isPointerDown = true;
    const { x, y } = getPos(e.touches[0]);
    manager.setMouseDown(x, y);
  };

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 0) return;
    e.preventDefault();
    const { x, y } = getPos(e.touches[0]);
    manager.setMouseMove(x, y);
  };

  const onTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    isPointerDown = false;
    manager.setMouseUp();
  };

  canvas.addEventListener('mousedown', onPointerDown);
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: false });
  canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });

  let resizeTimer: number | null = null;
  window.addEventListener('resize', () => {
    if (resizeTimer !== null) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      manager.resize(window.innerWidth, window.innerHeight);
    }, 50);
  });

  const loop = (now: number): void => {
    manager.tick(now);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
