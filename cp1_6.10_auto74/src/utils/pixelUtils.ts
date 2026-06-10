import { v4 as uuidv4 } from 'uuid';
import { Frame, CANVAS_SIZE } from '@/types';

export function createEmptyPixels(): string[][] {
  return Array.from({ length: CANVAS_SIZE }, () =>
    Array.from({ length: CANVAS_SIZE }, () => '')
  );
}

export function createEmptyFrame(): Frame {
  return {
    id: uuidv4(),
    pixels: createEmptyPixels(),
  };
}

export function cloneFrame(frame: Frame): Frame {
  return {
    id: uuidv4(),
    pixels: frame.pixels.map((row) => [...row]),
  };
}

export function cloneFrames(frames: Frame[]): Frame[] {
  return frames.map(cloneFrame);
}

export function deepClonePixels(pixels: string[][]): string[][] {
  return pixels.map((row) => [...row]);
}

export function drawPixel(
  pixels: string[][],
  x: number,
  y: number,
  color: string,
  size: number = 1
): string[][] {
  const newPixels = deepClonePixels(pixels);
  const half = Math.floor(size / 2);

  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < CANVAS_SIZE && ny >= 0 && ny < CANVAS_SIZE) {
        newPixels[ny][nx] = color;
      }
    }
  }
  return newPixels;
}

export function erasePixel(
  pixels: string[][],
  x: number,
  y: number,
  size: number = 1
): string[][] {
  return drawPixel(pixels, x, y, '', size);
}

export function renderFrameToCanvas(
  ctx: CanvasRenderingContext2D,
  pixels: string[][],
  scale: number = 1,
  offsetX: number = 0,
  offsetY: number = 0
): void {
  for (let y = 0; y < CANVAS_SIZE; y++) {
    for (let x = 0; x < CANVAS_SIZE; x++) {
      const color = pixels[y][x];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(
          offsetX + x * scale,
          offsetY + y * scale,
          scale,
          scale
        );
      }
    }
  }
}

export function renderTransparentBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cellSize: number = 16
): void {
  for (let y = 0; y < height; y += cellSize) {
    for (let x = 0; x < width; x += cellSize) {
      const isDark = ((x / cellSize) + (y / cellSize)) % 2 === 0;
      ctx.fillStyle = isDark ? '#1a1a1a' : '#222222';
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }
}

export function generateThumbnail(pixels: string[][]): string {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  ctx.imageSmoothingEnabled = false;
  renderTransparentBackground(ctx, 64, 64, 4);
  renderFrameToCanvas(ctx, pixels, 2);
  
  return canvas.toDataURL();
}
