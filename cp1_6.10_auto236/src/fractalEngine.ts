import type { Viewport, FractalParams, FractalType, ColorStop } from './types';

interface RGB {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

function buildColorLUT(stops: ColorStop[], size: number): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(size * 3);
  const sortedStops = [...stops].sort((a, b) => a.position - b.position);

  for (let i = 0; i < size; i++) {
    const t = i / (size - 1);
    let idx = 0;
    while (idx < sortedStops.length - 1 && sortedStops[idx + 1].position < t) {
      idx++;
    }

    const start = sortedStops[idx];
    const end = sortedStops[Math.min(idx + 1, sortedStops.length - 1)];
    const range = end.position - start.position;
    const localT = range > 0 ? (t - start.position) / range : 0;

    const c1 = hexToRgb(start.color);
    const c2 = hexToRgb(end.color);

    lut[i * 3] = Math.round(c1.r + (c2.r - c1.r) * localT);
    lut[i * 3 + 1] = Math.round(c1.g + (c2.g - c1.g) * localT);
    lut[i * 3 + 2] = Math.round(c1.b + (c2.b - c1.b) * localT);
  }

  return lut;
}

function mandelbrotIter(cx: number, cy: number, maxIter: number): number {
  let x = 0;
  let y = 0;
  let x2 = 0;
  let y2 = 0;
  let iter = 0;

  while (x2 + y2 <= 4 && iter < maxIter) {
    y = 2 * x * y + cy;
    x = x2 - y2 + cx;
    x2 = x * x;
    y2 = y * y;
    iter++;
  }

  if (iter === maxIter) return maxIter;

  const logZn = Math.log(x2 + y2) / 2;
  const nu = Math.log(logZn / Math.log(2)) / Math.log(2);
  return iter + 1 - nu;
}

function juliaIter(zx: number, zy: number, cx: number, cy: number, maxIter: number): number {
  let x = zx;
  let y = zy;
  let x2 = x * x;
  let y2 = y * y;
  let iter = 0;

  while (x2 + y2 <= 4 && iter < maxIter) {
    y = 2 * x * y + cy;
    x = x2 - y2 + cx;
    x2 = x * x;
    y2 = y * y;
    iter++;
  }

  if (iter === maxIter) return maxIter;

  const logZn = Math.log(x2 + y2) / 2;
  const nu = Math.log(logZn / Math.log(2)) / Math.log(2);
  return iter + 1 - nu;
}

function burningShipIter(cx: number, cy: number, maxIter: number): number {
  let x = 0;
  let y = 0;
  let x2 = 0;
  let y2 = 0;
  let iter = 0;

  while (x2 + y2 <= 4 && iter < maxIter) {
    y = Math.abs(2 * x * y) + cy;
    x = x2 - y2 + cx;
    x2 = x * x;
    y2 = y * y;
    iter++;
  }

  if (iter === maxIter) return maxIter;

  const logZn = Math.log(x2 + y2) / 2;
  const nu = Math.log(logZn / Math.log(2)) / Math.log(2);
  return iter + 1 - nu;
}

function getIterFunc(
  type: FractalType,
  juliaC: { re: number; im: number } | undefined
): (x: number, y: number, maxIter: number) => number {
  switch (type) {
    case 'julia':
      return (x, y, maxIter) => juliaIter(x, y, juliaC?.re ?? -0.7, juliaC?.im ?? 0.27015, maxIter);
    case 'burningship':
      return (x, y, maxIter) => burningShipIter(x, y, maxIter);
    case 'mandelbrot':
    default:
      return (x, y, maxIter) => mandelbrotIter(x, y, maxIter);
  }
}

const LUT_SIZE = 1024;
let cachedLutKey = '';
let cachedLut: Uint8ClampedArray | null = null;

function getColorLUT(stops: ColorStop[]): Uint8ClampedArray {
  const key = stops.map(s => `${s.position}:${s.color}`).join('|');
  if (key === cachedLutKey && cachedLut) return cachedLut;
  cachedLut = buildColorLUT(stops, LUT_SIZE);
  cachedLutKey = key;
  return cachedLut;
}

export function renderFractal(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  viewport: Viewport,
  params: FractalParams
): void {
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  const lut = getColorLUT(params.colorScheme.stops);
  const iterFunc = getIterFunc(params.fractalType, params.juliaConstant);
  const maxIter = params.maxIterations;

  const aspectRatio = width / height;
  const baseScale = 3 / viewport.zoom;
  const scaleX = baseScale * aspectRatio;
  const scaleY = baseScale;

  const minX = viewport.centerX - scaleX / 2;
  const minY = viewport.centerY - scaleY / 2;
  const stepX = scaleX / width;
  const stepY = scaleY / height;

  for (let py = 0; py < height; py++) {
    const cy = minY + py * stepY;
    const rowStart = py * width * 4;

    for (let px = 0; px < width; px++) {
      const cx = minX + px * stepX;
      const iter = iterFunc(cx, cy, maxIter);
      const pixel = rowStart + px * 4;

      if (iter >= maxIter) {
        data[pixel] = 0;
        data[pixel + 1] = 0;
        data[pixel + 2] = 0;
        data[pixel + 3] = 255;
      } else {
        const smoothT = (iter % 1);
        const idx1 = Math.floor(iter) % LUT_SIZE;
        const idx2 = (idx1 + 1) % LUT_SIZE;
        const i1 = idx1 * 3;
        const i2 = idx2 * 3;

        data[pixel] = Math.round(lut[i1] + (lut[i2] - lut[i1]) * smoothT);
        data[pixel + 1] = Math.round(lut[i1 + 1] + (lut[i2 + 1] - lut[i1 + 1]) * smoothT);
        data[pixel + 2] = Math.round(lut[i1 + 2] + (lut[i2 + 2] - lut[i1 + 2]) * smoothT);
        data[pixel + 3] = 255;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

export function renderFractalHighRes(
  width: number,
  height: number,
  viewport: Viewport,
  params: FractalParams
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  renderFractal(ctx, width, height, viewport, params);
  return canvas;
}
