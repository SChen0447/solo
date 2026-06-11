import { v4 as uuidv4 } from 'uuid';
import type { ColorStop, PaletteItem } from '../types';
import { generateStopsForLinearGradientCtx, sortColorStops } from './gradient';

const THUMB_W = 100;
const THUMB_H = 60;

export const generateGradientThumbnail = (
  stops: ColorStop[],
  angleDeg: number
): string => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = THUMB_W;
    canvas.height = THUMB_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const rad = (angleDeg * Math.PI) / 180;
    const halfDiag = Math.sqrt(THUMB_W * THUMB_W + THUMB_H * THUMB_H) / 2;
    const cx = THUMB_W / 2;
    const cy = THUMB_H / 2;

    const x0 = cx - Math.sin(rad) * halfDiag;
    const y0 = cy - Math.cos(rad) * halfDiag;
    const x1 = cx + Math.sin(rad) * halfDiag;
    const y1 = cy + Math.cos(rad) * halfDiag;

    const grad = generateStopsForLinearGradientCtx(ctx, stops, x0, y0, x1, y1);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, THUMB_W, THUMB_H);
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
};

export const createPaletteItem = (
  colorStops: ColorStop[],
  angle: number
): PaletteItem => {
  const sorted = sortColorStops(colorStops);
  const thumb = generateGradientThumbnail(sorted, angle);
  return {
    id: uuidv4(),
    colorStops: sorted,
    angle,
    thumbnail: thumb,
    createdAt: Date.now()
  };
};
