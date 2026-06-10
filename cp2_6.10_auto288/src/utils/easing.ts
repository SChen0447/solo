export type EasingFunction = (t: number) => number;

export const easeInOutQuad: EasingFunction = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export const easeInOutCubic: EasingFunction = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeInOutSine: EasingFunction = (t: number): number =>
  -(Math.cos(Math.PI * t) - 1) / 2;

export const easeOutCubic: EasingFunction = (t: number): number =>
  1 - Math.pow(1 - t, 3);

export const easeInCubic: EasingFunction = (t: number): number =>
  t * t * t;

export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);
