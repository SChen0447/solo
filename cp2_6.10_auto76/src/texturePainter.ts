import type { NoiseMap } from './noiseGenerator';
import { type BiomePalette, sampleGradient, lerpColor, type RGB } from './biomePalette';

export const TEXTURE_SIZE = 512;

export interface TexturePaintOptions {
  noiseMap: NoiseMap;
  palette: BiomePalette;
  detailAmount?: number;
}

export function paintTexture(options: TexturePaintOptions): ImageData {
  const { noiseMap, palette, detailAmount = 0.15 } = options;

  const imageData = new ImageData(TEXTURE_SIZE, TEXTURE_SIZE);
  const data = imageData.data;

  for (let y = 0; y < TEXTURE_SIZE; y++) {
    for (let x = 0; x < TEXTURE_SIZE; x++) {
      const idx = y * TEXTURE_SIZE + x;
      const noiseVal = noiseMap[idx];

      let color = sampleGradient(palette.gradient, noiseVal);

      const detailNoise = (noiseVal - Math.floor(noiseVal * 10) / 10) * 2 - 1;
      const detailMix = Math.abs(detailNoise) * detailAmount;
      color = lerpColor(color, palette.detailColor, detailMix * 0.3);

      const pixelIdx = idx * 4;
      data[pixelIdx] = color[0];
      data[pixelIdx + 1] = color[1];
      data[pixelIdx + 2] = color[2];
      data[pixelIdx + 3] = 255;
    }
  }

  return imageData;
}

export function renderImageData(
  ctx: CanvasRenderingContext2D,
  imageData: ImageData,
  displayWidth: number = TEXTURE_SIZE,
  displayHeight: number = TEXTURE_SIZE
): void {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = TEXTURE_SIZE;
  tempCanvas.height = TEXTURE_SIZE;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.putImageData(imageData, 0, 0);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, displayWidth, displayHeight);
  ctx.drawImage(tempCanvas, 0, 0, displayWidth, displayHeight);
}

export function blendImageData(
  fromData: ImageData,
  toData: ImageData,
  t: number
): ImageData {
  const result = new ImageData(fromData.width, fromData.height);
  const from = fromData.data;
  const to = toData.data;
  const out = result.data;
  const clampedT = Math.max(0, Math.min(1, t));

  for (let i = 0; i < from.length; i += 4) {
    out[i] = Math.round(from[i] + (to[i] - from[i]) * clampedT);
    out[i + 1] = Math.round(from[i + 1] + (to[i + 1] - from[i + 1]) * clampedT);
    out[i + 2] = Math.round(from[i + 2] + (to[i + 2] - from[i + 2]) * clampedT);
    out[i + 3] = 255;
  }

  return result;
}

export interface DissolveAnimation {
  running: boolean;
  progress: number;
  fromData: ImageData | null;
  toData: ImageData | null;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
}

export function createDissolveAnimation(): DissolveAnimation {
  return {
    running: false,
    progress: 0,
    fromData: null,
    toData: null
  };
}

export function startDissolve(
  anim: DissolveAnimation,
  fromData: ImageData,
  toData: ImageData,
  onProgress?: (progress: number) => void,
  onComplete?: () => void
): void {
  anim.fromData = fromData;
  anim.toData = toData;
  anim.progress = 0;
  anim.running = true;
  anim.onProgress = onProgress;
  anim.onComplete = onComplete;
}

export function tickDissolve(
  anim: DissolveAnimation,
  ctx: CanvasRenderingContext2D,
  displayWidth: number,
  displayHeight: number
): boolean {
  if (!anim.running || !anim.fromData || !anim.toData) return false;

  anim.progress += 0.1;
  if (anim.progress >= 1) {
    anim.progress = 1;
    anim.running = false;
    renderImageData(ctx, anim.toData, displayWidth, displayHeight);
    if (anim.onProgress) anim.onProgress(1);
    if (anim.onComplete) anim.onComplete();
    return false;
  }

  const blended = blendImageData(anim.fromData, anim.toData, anim.progress);
  renderImageData(ctx, blended, displayWidth, displayHeight);
  if (anim.onProgress) anim.onProgress(anim.progress);
  return true;
}

export function exportAsPNG(canvas: HTMLCanvasElement, filename: string = 'terrain_texture.png'): void {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = TEXTURE_SIZE;
  exportCanvas.height = TEXTURE_SIZE;
  const exportCtx = exportCanvas.getContext('2d')!;

  const srcCtx = canvas.getContext('2d')!;
  const srcImageData = srcCtx.getImageData(0, 0, canvas.width, canvas.height);

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.putImageData(srcImageData, 0, 0);

  exportCtx.imageSmoothingEnabled = true;
  exportCtx.imageSmoothingQuality = 'high';
  exportCtx.drawImage(tempCanvas, 0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  const link = document.createElement('a');
  link.download = filename;
  link.href = exportCanvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function createThumbnail(imageData: ImageData, size: number = 64): HTMLCanvasElement {
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = size;
  thumbCanvas.height = size;
  const thumbCtx = thumbCanvas.getContext('2d')!;

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = TEXTURE_SIZE;
  srcCanvas.height = TEXTURE_SIZE;
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.putImageData(imageData, 0, 0);

  thumbCtx.imageSmoothingEnabled = true;
  thumbCtx.imageSmoothingQuality = 'medium';
  thumbCtx.drawImage(srcCanvas, 0, 0, size, size);

  return thumbCanvas;
}
