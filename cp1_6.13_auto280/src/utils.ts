import * as THREE from 'three';

export const RAINBOW_COLORS: number[] = [
  0xff6b6b,
  0xff9ff3,
  0x48dbfb,
  0xfeca57,
  0x54a0ff,
  0xa29bfe,
];

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function mapColorIndexToFrequency(index: number, total: number): number {
  const t = index / (total - 1);
  return lerp(220, 880, t);
}

export function getRainbowColor(t: number): number {
  const clampedT = Math.max(0, Math.min(1, t));
  const scaled = clampedT * (RAINBOW_COLORS.length - 1);
  const index = Math.floor(scaled);
  const fraction = scaled - index;

  if (index >= RAINBOW_COLORS.length - 1) {
    return RAINBOW_COLORS[RAINBOW_COLORS.length - 1];
  }

  const color1 = new THREE.Color(RAINBOW_COLORS[index]);
  const color2 = new THREE.Color(RAINBOW_COLORS[index + 1]);
  const result = color1.clone().lerp(color2, fraction);
  return result.getHex();
}

export function boostBrightness(color: number, factor: number): number {
  const c = new THREE.Color(color);
  const r = Math.min(1, c.r * factor);
  const g = Math.min(1, c.g * factor);
  const b = Math.min(1, c.b * factor);
  return new THREE.Color(r, g, b).getHex();
}

export function randomColorOffset(color: number, range: number = 0.1): number {
  const c = new THREE.Color(color);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  hsl.h = (hsl.h + randomRange(-range, range) + 1) % 1;
  hsl.s = Math.max(0, Math.min(1, hsl.s + randomRange(-range * 0.5, range * 0.5)));
  hsl.l = Math.max(0, Math.min(1, hsl.l + randomRange(-range * 0.3, range * 0.3)));
  return new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l).getHex();
}
