import { Rect, Vector2 } from './types';

const SINE_TABLE_SIZE = 4096;
const sineTable: number[] = new Array(SINE_TABLE_SIZE);

for (let i = 0; i < SINE_TABLE_SIZE; i++) {
  sineTable[i] = Math.sin((i / SINE_TABLE_SIZE) * Math.PI * 2);
}

export function fastSin(angle: number): number {
  let normalized = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const index = Math.floor((normalized / (Math.PI * 2)) * SINE_TABLE_SIZE) % SINE_TABLE_SIZE;
  return sineTable[index];
}

export function fastCos(angle: number): number {
  return fastSin(angle + Math.PI / 2);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function circleRectOverlap(cx: number, cy: number, cr: number, rect: Rect): boolean {
  const closestX = clamp(cx, rect.x, rect.x + rect.width);
  const closestY = clamp(cy, rect.y, rect.y + rect.height);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < cr * cr;
}

export function distance(a: Vector2, b: Vector2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randInt(min: number, max: number): number {
  return Math.floor(randRange(min, max + 1));
}
