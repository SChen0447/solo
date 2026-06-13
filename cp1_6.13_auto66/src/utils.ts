export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function pointInRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

export function pointInCircle(px: number, py: number, cx: number, cy: number, r: number): boolean {
  return dist(px, py, cx, cy) <= r;
}

export function breathe(now: number, cycle: number): number {
  const t = (now % cycle) / cycle;
  const sin = Math.sin(t * Math.PI * 2);
  return 0.9 + sin * 0.1;
}
