import { BlendMode } from '../types';

export function applyBlendMode(
  ctx: CanvasRenderingContext2D,
  mode: BlendMode
): void {
  switch (mode) {
    case 'multiply':
      ctx.globalCompositeOperation = 'multiply';
      break;
    case 'screen':
      ctx.globalCompositeOperation = 'screen';
      break;
    case 'overlay':
      ctx.globalCompositeOperation = 'overlay';
      break;
  }
}

export function resetBlendMode(ctx: CanvasRenderingContext2D): void {
  ctx.globalCompositeOperation = 'source-over';
}

export function getBlendModeName(mode: BlendMode): string {
  const names: Record<BlendMode, string> = {
    multiply: '正片叠底',
    screen: '滤色',
    overlay: '叠加',
  };
  return names[mode];
}
