import chroma from 'chroma-js';
import { colord } from 'colord';
import type { ColorStop } from '../types';

export const mixWithWhite = (hex: string, ratio = 0.5): string => {
  try {
    return chroma.mix(hex, '#ffffff', ratio, 'rgb').hex();
  } catch {
    return hex;
  }
};

export const brighten = (hex: string, amount = 0.5): string => {
  try {
    return chroma(hex).brighten(amount).hex();
  } catch {
    return hex;
  }
};

export const getDominantColor = (stops: ColorStop[]): string => {
  if (!stops.length) return '#4fc3f7';
  try {
    const sorted = [...stops].sort((a, b) => a.position - b.position);
    const mid = sorted[Math.floor(sorted.length / 2)];
    return colord(mid.color).toHex();
  } catch {
    return '#4fc3f7';
  }
};

export const rgbaString = (hex: string, alpha = 1): string => {
  try {
    return colord(hex).alpha(alpha).toRgbString();
  } catch {
    return `rgba(79, 195, 247, ${alpha})`;
  }
};

export const generateGlowColor = (stops: ColorStop[]): string => {
  const dom = getDominantColor(stops);
  return rgbaString(mixWithWhite(dom, 0.3), 0.85);
};
