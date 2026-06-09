import { SandPainter } from './sandPainter';
import { UIController } from './uiController';

interface App {
  painter: SandPainter;
  ui: UIController;
  destroy: () => void;
}

function init(): App {
  const container = document.getElementById('canvas-container') as HTMLDivElement;
  const canvas = document.getElementById('sand-canvas') as HTMLCanvasElement;

  const painter = new SandPainter({
    canvas,
    minWidth: 6,
    maxWidth: 20,
    sandColor: '#4a2c15',
    blurRadius: 2,
    settleDuration: 500,
    rippleDuration: 800,
    bgColorStart: '#3a2010',
    bgColorEnd: '#1a0f05'
  });

  const ui = new UIController({
    container,
    onClear: () => painter.clearWithRipple()
  });

  ui.updateStrokePreview(painter.getCurrentStrokeWidth());

  const getCanvasCoords = (clientX: number, clientY: number): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  let isPointerDown = false;

  const handlePointerDown = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    isPointerDown = true;

    let clientX: number, clientY: number;
    if (e instanceof TouchEvent) {
      const touch = e.touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const { x, y } = getCanvasCoords(clientX, clientY);
    painter.startStroke(x, y);
    ui.updateStrokePreview(painter.getCurrentStrokeWidth());
  };

  const handlePointerMove = (e: MouseEvent | TouchEvent) => {
    if (!isPointerDown) return;
    e.preventDefault();

    let clientX: number, clientY: number;
    if (e instanceof TouchEvent) {
      const touch = e.touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const { x, y } = getCanvasCoords(clientX, clientY);
    painter.moveStroke(x, y);
    ui.updateStrokePreview(painter.getCurrentStrokeWidth());
  };

  const handlePointerUp = () => {
    if (!isPointerDown) return;
    isPointerDown = false;
    painter.endStroke();
  };

  canvas.addEventListener('mousedown', handlePointerDown);
  canvas.addEventListener('mousemove', handlePointerMove);
  window.addEventListener('mouseup', handlePointerUp);
  canvas.addEventListener('mouseleave', handlePointerUp);

  canvas.addEventListener('touchstart', handlePointerDown, { passive: false });
  canvas.addEventListener('touchmove', handlePointerMove, { passive: false });
  window.addEventListener('touchend', handlePointerUp);
  window.addEventListener('touchcancel', handlePointerUp);

  let resizeRAF: number | null = null;
  const handleResize = () => {
    if (resizeRAF) return;
    resizeRAF = requestAnimationFrame(() => {
      painter.resize();
      resizeRAF = null;
    });
  };
  window.addEventListener('resize', handleResize);

  const destroy = () => {
    canvas.removeEventListener('mousedown', handlePointerDown);
    canvas.removeEventListener('mousemove', handlePointerMove);
    window.removeEventListener('mouseup', handlePointerUp);
    canvas.removeEventListener('mouseleave', handlePointerUp);
    canvas.removeEventListener('touchstart', handlePointerDown);
    canvas.removeEventListener('touchmove', handlePointerMove);
    window.removeEventListener('touchend', handlePointerUp);
    window.removeEventListener('touchcancel', handlePointerUp);
    window.removeEventListener('resize', handleResize);
    if (resizeRAF) cancelAnimationFrame(resizeRAF);
    painter.destroy();
    ui.destroy();
  };

  return { painter, ui, destroy };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
