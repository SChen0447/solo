import { Vector2, TILE_SIZE } from './types';

export function distance(a: Vector2, b: Vector2): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function normalize(v: Vector2): Vector2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function checkCollision(pos: Vector2, tiles: number[][]): boolean {
  const margin = 8;
  const corners = [
    { x: pos.x - margin, y: pos.y - margin },
    { x: pos.x + margin, y: pos.y - margin },
    { x: pos.x - margin, y: pos.y + margin },
    { x: pos.x + margin, y: pos.y + margin }
  ];

  for (const corner of corners) {
    const gridX = Math.floor(corner.x / TILE_SIZE);
    const gridY = Math.floor(corner.y / TILE_SIZE);
    if (tiles[gridY]?.[gridX] === 1) {
      return true;
    }
  }
  return false;
}

export function getRandomWalkablePosition(tiles: number[][]): Vector2 {
  const rows = tiles.length;
  const cols = tiles[0].length;
  let attempts = 0;

  while (attempts < 100) {
    const x = Math.floor(Math.random() * cols);
    const y = Math.floor(Math.random() * rows);
    if (tiles[y][x] === 0) {
      return {
        x: x * TILE_SIZE + TILE_SIZE / 2,
        y: y * TILE_SIZE + TILE_SIZE / 2
      };
    }
    attempts++;
  }

  return { x: TILE_SIZE * 2, y: TILE_SIZE * 2 };
}

export function lightToColor(lightAmount: number, maxLight: number): string {
  const t = lightAmount / maxLight;
  const r = Math.floor(lerp(135, 255, t));
  const g = Math.floor(lerp(206, 215, t));
  const b = Math.floor(lerp(235, 0, t));
  return `rgb(${r}, ${g}, ${b})`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 255, g: 255, b: 255 };
}

export function noise(x: number, y: number, time: number): number {
  return (
    Math.sin(x * 0.01 + time) * Math.cos(y * 0.01 + time * 0.7) * 0.5 +
    Math.sin(x * 0.02 + time * 1.3) * Math.cos(y * 0.02 + time * 0.5) * 0.3 +
    0.5
  );
}
