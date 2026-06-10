export interface CanvasInfo {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
}

let canvasInfo: CanvasInfo | null = null;
const resizeListeners: (() => void)[] = [];

export function initCanvas(canvasId: string): CanvasInfo {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) {
    throw new Error(`Canvas element with id "${canvasId}" not found`);
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D rendering context');
  }

  const dpr = window.devicePixelRatio || 1;

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (canvasInfo) {
      canvasInfo.width = w;
      canvasInfo.height = h;
    }

    for (const listener of resizeListeners) {
      listener();
    }
  };

  resize();
  window.addEventListener('resize', resize);

  canvasInfo = { ctx, width: window.innerWidth, height: window.innerHeight, dpr };
  return canvasInfo;
}

export function getCanvasInfo(): CanvasInfo {
  if (!canvasInfo) {
    throw new Error('Canvas has not been initialized. Call initCanvas first.');
  }
  return canvasInfo;
}

export function onResize(listener: () => void): () => void {
  resizeListeners.push(listener);
  return () => {
    const idx = resizeListeners.indexOf(listener);
    if (idx >= 0) resizeListeners.splice(idx, 1);
  };
}
