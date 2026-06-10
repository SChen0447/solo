import { Frame, CANVAS_SIZE, PICO8_PALETTE, ExportProjectData } from '@/types';
import { renderFrameToCanvas, renderTransparentBackground } from './pixelUtils';

export function exportSpriteSheetPNG(frames: Frame[]): void {
  const spacing = 2;
  const pixelScale = 4;
  const framePixelSize = CANVAS_SIZE * pixelScale;
  const width = frames.length * framePixelSize + (frames.length - 1) * spacing;
  const height = framePixelSize;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.imageSmoothingEnabled = false;

  frames.forEach((frame, index) => {
    const offsetX = index * (framePixelSize + spacing);
    renderTransparentBackground(ctx, framePixelSize, framePixelSize, pixelScale);
    ctx.save();
    renderFrameToCanvas(ctx, frame.pixels, pixelScale, offsetX, 0);
    ctx.restore();
  });

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pixel-spritesheet.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

export function exportProjectJSON(
  frames: Frame[],
  customColors: string[]
): void {
  const data: ExportProjectData = {
    frames,
    palette: PICO8_PALETTE,
    customColors,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pixel-project.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importProjectJSON(file: File): Promise<ExportProjectData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as ExportProjectData;
        if (!data.frames || !Array.isArray(data.frames)) {
          reject(new Error('Invalid project file format'));
          return;
        }
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function triggerFileImport(
  callback: (data: ExportProjectData) => void
): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const data = await importProjectJSON(file);
      callback(data);
    } catch (err) {
      alert('导入失败：无效的项目文件');
    }
  };
  input.click();
}
