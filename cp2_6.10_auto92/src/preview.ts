type Listener = (data: unknown) => void;

class EventEmitter {
  private listeners: Map<string, Set<Listener>> = new Map();

  on(event: string, callback: Listener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Listener): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((cb) => cb(data));
  }
}

export type ClipShape = 'circle' | 'octagon' | 'star' | 'bubble' | 'bevel';
export type MaskType = 'linear' | 'radial' | 'text' | 'noise';

export interface ClipState {
  shape: ClipShape;
  adjust: number;
  animating: boolean;
  animationProgress: number;
}

export interface MaskState {
  type: MaskType;
  threshold: number;
  invert: boolean;
  animating: boolean;
  animationProgress: number;
}

export const CLIP_PRESETS: { id: ClipShape; name: string; explanation: string }[] = [
  { id: 'circle', name: '圆形', explanation: 'clip-path 将元素裁剪为不可见的边界框，超出部分不参与事件响应。圆形使用 ellipse() 实现。' },
  { id: 'octagon', name: '八边形', explanation: 'clip-path polygon() 定义8个顶点形成八边形，完全裁剪掉矩形之外的所有像素。' },
  { id: 'star', name: '星形', explanation: 'clip-path 使用 polygon() 创建星形，内凹深度可通过调整滑块控制。' },
  { id: 'bubble', name: '对话气泡形', explanation: 'clip-path 自定义不规则多边形模拟对话气泡，超出边界完全不可见。' },
  { id: 'bevel', name: '斜角四边形', explanation: 'clip-path inset() 配合 round 参数或 polygon() 实现四角斜切效果。' },
];

export const MASK_PRESETS: { id: MaskType; name: string; explanation: string }[] = [
  { id: 'linear', name: '线性渐变遮罩', explanation: 'mask-image 仅控制像素透明度，元素布局不变但点击区域可能缩小。linear-gradient 产生平滑过渡。' },
  { id: 'radial', name: '径向渐变遮罩', explanation: 'mask-image radial-gradient() 从中心向外辐射透明度变化，不影响元素实际尺寸。' },
  { id: 'text', name: '文字形状遮罩', explanation: 'mask-image 使用文字作为 alpha 通道，文字区域显示内容，其余区域透明。' },
  { id: 'noise', name: '不规则噪点遮罩', explanation: 'mask-image 结合噪点纹理产生随机透明度分布，仅影响像素显示不改变布局。' },
];

export interface PreviewInstance {
  events: EventEmitter;
  render: () => void;
  getCanvas: () => HTMLCanvasElement;
  destroy: () => void;
}

const GRADIENT_COLORS = ['#ff6b6b', '#4ecdc4'];

function drawCheckerboard(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const size = 10;
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      ctx.fillStyle = (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0 ? '#2a2a4e' : '#232343';
      ctx.fillRect(x, y, size, size);
    }
  }
}

function drawGradientRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
  gradient.addColorStop(0, GRADIENT_COLORS[0]);
  gradient.addColorStop(1, GRADIENT_COLORS[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w, h);
}

function buildClipPath(shape: ClipShape, adjust: number, cx: number, cy: number, r: number): Path2D {
  const path = new Path2D();
  const t = adjust / 100;

  switch (shape) {
    case 'circle': {
      const rx = r * (0.4 + t * 0.6);
      const ry = r * (0.4 + (1 - t) * 0.6);
      path.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      break;
    }
    case 'octagon': {
      const cut = 0.2 + t * 0.3;
      const points: [number, number][] = [
        [cx - r * cut, cy - r],
        [cx + r * cut, cy - r],
        [cx + r, cy - r * cut],
        [cx + r, cy + r * cut],
        [cx + r * cut, cy + r],
        [cx - r * cut, cy + r],
        [cx - r, cy + r * cut],
        [cx - r, cy - r * cut],
      ];
      points.forEach(([px, py], i) => {
        if (i === 0) path.moveTo(px, py);
        else path.lineTo(px, py);
      });
      path.closePath();
      break;
    }
    case 'star': {
      const spikes = 5;
      const outerR = r;
      const innerR = r * (0.2 + (1 - t) * 0.4);
      for (let i = 0; i < spikes * 2; i++) {
        const angle = (i * Math.PI) / spikes - Math.PI / 2;
        const radius = i % 2 === 0 ? outerR : innerR;
        const px = cx + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius;
        if (i === 0) path.moveTo(px, py);
        else path.lineTo(px, py);
      }
      path.closePath();
      break;
    }
    case 'bubble': {
      const tailW = r * 0.25;
      const tailH = r * (0.2 + t * 0.25);
      const rectR = r * 0.85;
      path.moveTo(cx - rectR, cy - rectR * 0.7);
      path.lineTo(cx + rectR, cy - rectR * 0.7);
      path.quadraticCurveTo(cx + rectR + r * 0.1, cy - rectR * 0.7, cx + rectR, cy - rectR * 0.3);
      path.lineTo(cx + rectR, cy + rectR * 0.5);
      path.quadraticCurveTo(cx + rectR + r * 0.1, cy + rectR * 0.7, cx + rectR - r * 0.1, cy + rectR * 0.7);
      path.lineTo(cx + tailW, cy + rectR * 0.7);
      path.lineTo(cx - tailW, cy + rectR * 0.7 + tailH);
      path.lineTo(cx - tailW * 0.5, cy + rectR * 0.7);
      path.lineTo(cx - rectR, cy + rectR * 0.7);
      path.quadraticCurveTo(cx - rectR - r * 0.1, cy + rectR * 0.7, cx - rectR, cy + rectR * 0.5);
      path.lineTo(cx - rectR, cy - rectR * 0.3);
      path.quadraticCurveTo(cx - rectR - r * 0.1, cy - rectR * 0.7, cx - rectR, cy - rectR * 0.7);
      path.closePath();
      break;
    }
    case 'bevel': {
      const cut = 0.15 + t * 0.35;
      const c = r * cut;
      const points: [number, number][] = [
        [cx - r + c, cy - r],
        [cx + r - c, cy - r],
        [cx + r, cy - r + c],
        [cx + r, cy + r - c],
        [cx + r - c, cy + r],
        [cx - r + c, cy + r],
        [cx - r, cy + r - c],
        [cx - r, cy - r + c],
      ];
      points.forEach(([px, py], i) => {
        if (i === 0) path.moveTo(px, py);
        else path.lineTo(px, py);
      });
      path.closePath();
      break;
    }
  }

  return path;
}

function getClipPathScaled(shape: ClipShape, adjust: number, cx: number, cy: number, r: number, progress: number): Path2D {
  const scale = 0.05 + progress * 0.95;
  return buildClipPath(shape, adjust, cx, cy, r * scale);
}

export function renderClipPreview(canvas: HTMLCanvasElement, initialState?: Partial<ClipState>): PreviewInstance {
  const events = new EventEmitter();
  const offscreen = document.createElement('canvas');
  const offCtx = offscreen.getContext('2d')!;
  const ctx = canvas.getContext('2d')!;

  let rafId: number | null = null;
  let animStart = 0;
  const ANIM_DURATION = 600;

  const state: ClipState = {
    shape: 'circle',
    adjust: 50,
    animating: false,
    animationProgress: 1,
    ...initialState,
  };

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function render(): void {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.42;

    ctx.clearRect(0, 0, w, h);
    drawCheckerboard(ctx, w, h);

    offCtx.clearRect(0, 0, w, h);
    offCtx.save();

    const clipPath = getClipPathScaled(state.shape, state.adjust, cx, cy, r, state.animationProgress);
    offCtx.clip(clipPath);
    drawGradientRect(offCtx, cx - r, cy - r, r * 2, r * 2);
    offCtx.restore();

    ctx.drawImage(offscreen, 0, 0, w, h);

    ctx.save();
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(cx - r, cy - r, r * 2, r * 2);
    ctx.restore();

    events.emit('render', { state });
  }

  function animationLoop(ts: number): void {
    if (!animStart) animStart = ts;
    const elapsed = ts - animStart;
    const progress = Math.min(1, elapsed / ANIM_DURATION);
    const eased = 1 - Math.pow(1 - progress, 3);
    state.animationProgress = eased;

    render();

    if (progress < 1) {
      rafId = requestAnimationFrame(animationLoop);
    } else {
      state.animating = false;
      state.animationProgress = 1;
      events.emit('animationEnd', null);
    }
  }

  function playAnimation(): void {
    if (state.animating) return;
    state.animating = true;
    state.animationProgress = 0;
    animStart = 0;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(animationLoop);
  }

  function setState(partial: Partial<ClipState>): void {
    const shouldAnimate = partial.shape !== undefined && partial.shape !== state.shape;
    Object.assign(state, partial);
    if (shouldAnimate) {
      playAnimation();
    } else {
      render();
    }
  }

  function destroy(): void {
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
  }

  events.on('setState', (data) => setState(data as Partial<ClipState>));

  window.addEventListener('resize', resize);
  resize();
  render();

  return {
    events,
    render,
    getCanvas: () => canvas,
    destroy,
  };
}

export function renderMaskPreview(canvas: HTMLCanvasElement, initialState?: Partial<MaskState>): PreviewInstance {
  const events = new EventEmitter();
  const offscreen = document.createElement('canvas');
  const offCtx = offscreen.getContext('2d')!;
  const ctx = canvas.getContext('2d')!;

  let rafId: number | null = null;
  let animStart = 0;
  const ANIM_DURATION = 500;

  const state: MaskState = {
    type: 'linear',
    threshold: 128,
    invert: false,
    animating: false,
    animationProgress: 1,
    ...initialState,
  };

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawMask(w: number, h: number, revealTop: number): void {
    offCtx.save();
    offCtx.globalCompositeOperation = 'source-over';
    offCtx.clearRect(0, 0, w, h);

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = offscreen.width;
    maskCanvas.height = offscreen.height;
    const maskCtx = maskCanvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    maskCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.42;

    switch (state.type) {
      case 'linear': {
        const grad = maskCtx.createLinearGradient(0, cy - r, 0, cy + r);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        maskCtx.fillStyle = grad;
        maskCtx.fillRect(cx - r, cy - r, r * 2, r * 2);
        break;
      }
      case 'radial': {
        const grad = maskCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.7, 'rgba(255,255,255,0.6)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        maskCtx.fillStyle = grad;
        maskCtx.fillRect(cx - r, cy - r, r * 2, r * 2);
        break;
      }
      case 'text': {
        maskCtx.fillStyle = 'rgba(255,255,255,1)';
        maskCtx.font = `bold ${Math.floor(r * 0.8)}px -apple-system, sans-serif`;
        maskCtx.textAlign = 'center';
        maskCtx.textBaseline = 'middle';
        maskCtx.fillText('MASK', cx, cy);
        break;
      }
      case 'noise': {
        const imgData = maskCtx.createImageData(Math.floor(r * 2 * dpr), Math.floor(r * 2 * dpr));
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const v = Math.floor(Math.random() * 256);
          data[i] = v;
          data[i + 1] = v;
          data[i + 2] = v;
          data[i + 3] = 255;
        }
        maskCtx.putImageData(imgData, (cx - r) * dpr, (cy - r) * dpr);
        break;
      }
    }

    if (state.threshold !== 128 || state.invert) {
      const imgData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
        let alpha: number;
        if (state.invert) {
          alpha = lum < state.threshold ? 255 : 0;
        } else {
          alpha = lum >= state.threshold ? 255 : 0;
        }
        d[i + 3] = alpha;
      }
      maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      maskCtx.putImageData(imgData, 0, 0);
    }

    offCtx.globalCompositeOperation = 'source-over';
    offCtx.drawImage(maskCanvas, 0, 0, w, h);

    offCtx.globalCompositeOperation = 'source-in';
    drawGradientRect(offCtx, cx - r, cy - r, r * 2, r * 2);
    offCtx.restore();

    const sweepY = revealTop;
    if (sweepY > 0) {
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = offscreen.width;
      tmpCanvas.height = offscreen.height;
      const tmpCtx = tmpCanvas.getContext('2d')!;
      tmpCtx.drawImage(offscreen, 0, 0);
      offCtx.clearRect(0, 0, w, h);
      offCtx.drawImage(tmpCanvas, 0, sweepY, w, h - sweepY, 0, sweepY, w, h - sweepY);
    }
  }

  function render(): void {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const totalH = h;
    const sweepY = (1 - state.animationProgress) * totalH;

    ctx.clearRect(0, 0, w, h);
    drawCheckerboard(ctx, w, h);

    offCtx.clearRect(0, 0, w, h);
    drawMask(w, h, sweepY);

    ctx.drawImage(offscreen, 0, 0, w, h);
    events.emit('render', { state });
  }

  function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function animationLoop(ts: number): void {
    if (!animStart) animStart = ts;
    const elapsed = ts - animStart;
    const progress = Math.min(1, elapsed / ANIM_DURATION);
    state.animationProgress = easeInOutCubic(progress);

    render();

    if (progress < 1) {
      rafId = requestAnimationFrame(animationLoop);
    } else {
      state.animating = false;
      state.animationProgress = 1;
      events.emit('animationEnd', null);
    }
  }

  function playAnimation(): void {
    if (state.animating) return;
    state.animating = true;
    state.animationProgress = 0;
    animStart = 0;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(animationLoop);
  }

  function setState(partial: Partial<MaskState>): void {
    const shouldAnimate = partial.type !== undefined && partial.type !== state.type;
    Object.assign(state, partial);
    if (shouldAnimate) {
      playAnimation();
    } else {
      render();
    }
  }

  function destroy(): void {
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
  }

  events.on('setState', (data) => setState(data as Partial<MaskState>));

  window.addEventListener('resize', resize);
  resize();
  render();

  return {
    events,
    render,
    getCanvas: () => canvas,
    destroy,
  };
}
