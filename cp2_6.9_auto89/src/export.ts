import type { Stroke } from './brush';
import { BrushManager } from './brush';

export function exportToPNG(
  strokes: Stroke[],
  width: number,
  height: number
): void {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = width;
  exportCanvas.height = height;

  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, width, height);

  const brush = new BrushManager({ baseWidth: 8, color: '#000000' });

  for (const stroke of strokes) {
    brush.drawEntireStroke(ctx, stroke);
  }

  const dataURL = exportCanvas.toDataURL('image/png');

  const link = document.createElement('a');
  link.download = 'user_signature.png';
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
