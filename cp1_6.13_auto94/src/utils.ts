export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export type EasingFn = (t: number) => number;

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function rgbToString(rgb: RGB, alpha = 1): string {
  const r = Math.round(clamp(rgb.r, 0, 255));
  const g = Math.round(clamp(rgb.g, 0, 255));
  const b = Math.round(clamp(rgb.b, 0, 255));
  if (alpha >= 1) {
    return `rgb(${r}, ${g}, ${b})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function gradientColor(start: RGB, end: RGB, t: number): RGB {
  const clampedT = clamp(t, 0, 1);
  return {
    r: lerp(start.r, end.r, clampedT),
    g: lerp(start.g, end.g, clampedT),
    b: lerp(start.b, end.b, clampedT)
  };
}

export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

const NOISE_SEED = 12345.6789;

export function noise1D(x: number, seed = NOISE_SEED): number {
  const n = Math.sin(x * seed) * 43758.5453123;
  return n - Math.floor(n);
}

export function smoothNoise1D(x: number, seed?: number): number {
  const intX = Math.floor(x);
  const fracX = x - intX;
  const v1 = noise1D(intX, seed);
  const v2 = noise1D(intX + 1, seed);
  return lerp(v1, v2, easeInOutSine(fracX));
}

export function midiToFrequency(midiNote: number): number {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

export function distance(p1: Vec2, p2: Vec2): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function degToRad(degrees: number): number {
  return degrees * Math.PI / 180;
}

export function radToDeg(radians: number): number {
  return radians * 180 / Math.PI;
}

const COLOR_CACHE = new Map<string, string>();

export function cachedRgbToString(rgb: RGB, alpha = 1): string {
  const key = `${rgb.r.toFixed(0)},${rgb.g.toFixed(0)},${rgb.b.toFixed(0)},${alpha.toFixed(2)}`;
  if (COLOR_CACHE.has(key)) {
    return COLOR_CACHE.get(key)!;
  }
  const result = rgbToString(rgb, alpha);
  COLOR_CACHE.set(key, result);
  return result;
}

export function clearColorCache(): void {
  COLOR_CACHE.clear();
}
