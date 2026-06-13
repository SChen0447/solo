export function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function dist(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function pointInRect(
  px: number, py: number,
  rx: number, ry: number,
  rw: number, rh: number,
  rotation: number
): boolean {
  const cos = Math.cos(-rotation);
  const sin = Math.sin(-rotation);
  const dx = px - rx;
  const dy = py - ry;
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  return Math.abs(lx) <= rw / 2 && Math.abs(ly) <= rh / 2;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export interface AnimState {
  startTime: number;
  duration: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  fromRot: number;
  toRot: number;
  done: boolean;
}

export function createAnim(
  fromX: number, fromY: number, toX: number, toY: number,
  fromRot: number, toRot: number,
  duration: number, now: number
): AnimState {
  return { startTime: now, duration, fromX, fromY, toX, toY, fromRot, toRot, done: false };
}

export function updateAnim(anim: AnimState, now: number): { x: number; y: number; rot: number } {
  const elapsed = now - anim.startTime;
  const t = clamp(elapsed / anim.duration, 0, 1);
  const e = easeInOut(t);
  const x = lerp(anim.fromX, anim.toX, e);
  const y = lerp(anim.fromY, anim.toY, e);
  const rot = lerp(anim.fromRot, anim.toRot, e);
  if (t >= 1) anim.done = true;
  return { x, y, rot };
}

export function updateAnimEaseOut(anim: AnimState, now: number): { x: number; y: number; rot: number } {
  const elapsed = now - anim.startTime;
  const t = clamp(elapsed / anim.duration, 0, 1);
  const e = easeOut(t);
  const x = lerp(anim.fromX, anim.toX, e);
  const y = lerp(anim.fromY, anim.toY, e);
  const rot = lerp(anim.fromRot, anim.toRot, e);
  if (t >= 1) anim.done = true;
  return { x, y, rot };
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
