import { colord } from 'colord';
import type { ColorStop } from '../types';

export const sortColorStops = (stops: ColorStop[]): ColorStop[] => {
  return [...stops].sort((a, b) => a.position - b.position);
};

export const normalizeColor = (color: string): string => {
  try {
    return colord(color).toHex().toUpperCase();
  } catch {
    return '#FFFFFF';
  }
};

export const stopsToCssLinearGradient = (stops: ColorStop[], angle: number): string => {
  const sorted = sortColorStops(stops);
  const stopsStr = sorted
    .map((s) => `${normalizeColor(s.color)} ${s.position}%`)
    .join(', ');
  return `linear-gradient(${angle}deg, ${stopsStr})`;
};

export const validateAndClampPosition = (pos: number): number => {
  return Math.max(0, Math.min(100, pos));
};

export const clampAngle = (angle: number): number => {
  let a = angle % 360;
  if (a < 0) a += 360;
  return a;
};

export const generateStopsForLinearGradientCtx = (
  ctx: CanvasRenderingContext2D,
  stops: ColorStop[],
  x0: number,
  y0: number,
  x1: number,
  y1: number
): CanvasGradient => {
  const sorted = sortColorStops(stops);
  const grad = ctx.createLinearGradient(x0, y0, x1, y1);
  sorted.forEach((s) => {
    grad.addColorStop(s.position / 100, normalizeColor(s.color));
  });
  return grad;
};
