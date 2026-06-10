import { CANVAS_SIZE } from '@/types';
import { deepClonePixels } from './pixelUtils';

export function floodFill(
  pixels: string[][],
  startX: number,
  startY: number,
  fillColor: string
): string[][] {
  const targetColor = pixels[startY]?.[startX];
  if (targetColor === undefined || targetColor === fillColor) {
    return pixels;
  }

  const newPixels = deepClonePixels(pixels);
  const queue: Array<[number, number]> = [[startX, startY]];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    const key = `${x},${y}`;

    if (visited.has(key)) continue;
    if (x < 0 || x >= CANVAS_SIZE || y < 0 || y >= CANVAS_SIZE) continue;
    if (newPixels[y][x] !== targetColor) continue;

    visited.add(key);
    newPixels[y][x] = fillColor;

    queue.push([x + 1, y]);
    queue.push([x - 1, y]);
    queue.push([x, y + 1]);
    queue.push([x, y - 1]);
  }

  return newPixels;
}
