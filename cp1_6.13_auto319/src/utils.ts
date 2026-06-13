export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  };
}

export function rgbToHex(rgb: RGB): string {
  return '#' + [rgb.r, rgb.g, rgb.b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

export function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const result: RGB = {
    r: lerp(c1.r, c2.r, t),
    g: lerp(c1.g, c2.g, t),
    b: lerp(c1.b, c2.b, t)
  };
  return rgbToHex(result);
}

export function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function distSq(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

export function circleCollisionSq(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number
): boolean {
  const rr = r1 + r2;
  return distSq(x1, y1, x2, y2) <= rr * rr;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const BEST_SCORE_KEY = 'light_trail_best_score';
const BEST_TIME_KEY = 'light_trail_best_time';

export function saveBestScore(score: number, time: number): void {
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(score));
    localStorage.setItem(BEST_TIME_KEY, String(time));
  } catch (e) {
    console.warn('Cannot save to localStorage:', e);
  }
}

export function getBestScore(): { score: number; time: number } {
  try {
    const score = parseInt(localStorage.getItem(BEST_SCORE_KEY) || '0', 10);
    const time = parseFloat(localStorage.getItem(BEST_TIME_KEY) || '0');
    return {
      score: isNaN(score) ? 0 : score,
      time: isNaN(time) ? 0 : time
    };
  } catch (e) {
    console.warn('Cannot read from localStorage:', e);
    return { score: 0, time: 0 };
  }
}

export function angleDiff(a: number, b: number): number {
  let diff = a - b;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}
