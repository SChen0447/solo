import type { FractalParams } from './types';

const LOG_2 = Math.log(2);

export class FractalEngine {
  static mandelbrot(cx: number, cy: number, maxIter: number): number {
    let zx = 0;
    let zy = 0;
    let zx2 = 0;
    let zy2 = 0;
    let iter = 0;

    while (zx2 + zy2 <= 4 && iter < maxIter) {
      zy = 2 * zx * zy + cy;
      zx = zx2 - zy2 + cx;
      zx2 = zx * zx;
      zy2 = zy * zy;
      iter++;
    }

    if (iter === maxIter) {
      return maxIter;
    }

    const logZn = Math.log(zx2 + zy2) / 2;
    const nu = Math.log(logZn / LOG_2) / LOG_2;
    return iter + 1 - nu;
  }

  static julia(zx: number, zy: number, cx: number, cy: number, maxIter: number): number {
    let zx2 = zx * zx;
    let zy2 = zy * zy;
    let iter = 0;

    while (zx2 + zy2 <= 4 && iter < maxIter) {
      zy = 2 * zx * zy + cy;
      zx = zx2 - zy2 + cx;
      zx2 = zx * zx;
      zy2 = zy * zy;
      iter++;
    }

    if (iter === maxIter) {
      return maxIter;
    }

    const logZn = Math.log(zx2 + zy2) / 2;
    const nu = Math.log(logZn / LOG_2) / LOG_2;
    return iter + 1 - nu;
  }

  static hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  static mapColor(iteration: number, maxIter: number, colorOffset: number): [number, number, number, number] {
    if (iteration >= maxIter) {
      return [10, 10, 46, 255];
    }

    const t = iteration / maxIter;
    const hue = (t * 360 + colorOffset) % 360;

    let saturation: number, lightness: number;
    if (t < 0.3) {
      const localT = t / 0.3;
      saturation = 0.8 + localT * 0.2;
      lightness = 0.15 + localT * 0.25;
    } else if (t < 0.7) {
      const localT = (t - 0.3) / 0.4;
      saturation = 1.0 - localT * 0.2;
      lightness = 0.4 + localT * 0.15;
    } else {
      const localT = (t - 0.7) / 0.3;
      saturation = 0.8 - localT * 0.3;
      lightness = 0.55 + localT * 0.25;
    }

    const h = hue / 360;
    const [r, g, b] = this.hslToRgb(h, saturation, lightness);
    return [r, g, b, 255];
  }

  static calculatePixels(width: number, height: number, params: FractalParams): Uint8ClampedArray {
    const pixelData = new Uint8ClampedArray(width * height * 4);
    const { type, iterations, zoom, offsetX, offsetY, colorOffset, juliaReal, juliaImag } = params;

    const aspectRatio = width / height;
    const scale = 3 / zoom;
    const halfW = width / 2;
    const halfH = height / 2;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cx = ((x - halfW) / halfW) * scale * aspectRatio + offsetX;
        const cy = ((y - halfH) / halfH) * scale + offsetY;

        let iter: number;
        if (type === 'mandelbrot') {
          iter = this.mandelbrot(cx, cy, iterations);
        } else {
          iter = this.julia(cx, cy, juliaReal, juliaImag, iterations);
        }

        const idx = (y * width + x) * 4;
        const [r, g, b, a] = this.mapColor(iter, iterations, colorOffset);
        pixelData[idx] = r;
        pixelData[idx + 1] = g;
        pixelData[idx + 2] = b;
        pixelData[idx + 3] = a;
      }
    }

    return pixelData;
  }

  static calculatePixel(x: number, y: number, width: number, height: number, params: FractalParams): [number, number, number, number] {
    const { type, iterations, zoom, offsetX, offsetY, colorOffset, juliaReal, juliaImag } = params;

    const aspectRatio = width / height;
    const scale = 3 / zoom;
    const halfW = width / 2;
    const halfH = height / 2;

    const cx = ((x - halfW) / halfW) * scale * aspectRatio + offsetX;
    const cy = ((y - halfH) / halfH) * scale + offsetY;

    let iter: number;
    if (type === 'mandelbrot') {
      iter = this.mandelbrot(cx, cy, iterations);
    } else {
      iter = this.julia(cx, cy, juliaReal, juliaImag, iterations);
    }

    return this.mapColor(iter, iterations, colorOffset);
  }
}
