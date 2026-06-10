import type { ILayerConfig, IColorStop, BlendMode, GradientType } from './types';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function colorWithAlpha(stop: IColorStop): string {
  const { r, g, b } = hexToRgb(stop.color);
  return `rgba(${r}, ${g}, ${b}, ${stop.opacity})`;
}

function blendColors(base: number[], blend: number[], mode: BlendMode): number[] {
  const [br, bg, bb, ba] = base;
  const [fr, fg, fb, fa] = blend;

  if (fa === 0) return base;

  let rr: number, rg: number, rb: number;
  const bn = [br / 255, bg / 255, bb / 255];
  const fn = [fr / 255, fg / 255, fb / 255];

  switch (mode) {
    case 'multiply':
      rr = bn[0] * fn[0];
      rg = bn[1] * fn[1];
      rb = bn[2] * fn[2];
      break;
    case 'screen':
      rr = 1 - (1 - bn[0]) * (1 - fn[0]);
      rg = 1 - (1 - bn[1]) * (1 - fn[1]);
      rb = 1 - (1 - bn[2]) * (1 - fn[2]);
      break;
    case 'overlay':
      rr = bn[0] < 0.5 ? 2 * bn[0] * fn[0] : 1 - 2 * (1 - bn[0]) * (1 - fn[0]);
      rg = bn[1] < 0.5 ? 2 * bn[1] * fn[1] : 1 - 2 * (1 - bn[1]) * (1 - fn[1]);
      rb = bn[2] < 0.5 ? 2 * bn[2] * fn[2] : 1 - 2 * (1 - bn[2]) * (1 - fn[2]);
      break;
    case 'normal':
    default:
      rr = fn[0];
      rg = fn[1];
      rb = fn[2];
      break;
  }

  const outA = fa + ba * (1 - fa);
  if (outA === 0) return [0, 0, 0, 0];

  const outR = (rr * 255 * fa + br * ba * (1 - fa)) / outA;
  const outG = (rg * 255 * fa + bg * ba * (1 - fa)) / outA;
  const outB = (rb * 255 * fa + bb * ba * (1 - fa)) / outA;

  return [outR, outG, outB, outA];
}

export function renderLayersToCanvas(
  ctx: CanvasRenderingContext2D,
  layers: ILayerConfig[],
  width: number,
  height: number
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = width;
  offscreenCanvas.height = height;
  const offCtx = offscreenCanvas.getContext('2d')!;

  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = width;
  resultCanvas.height = height;
  const resultCtx = resultCanvas.getContext('2d')!;

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];

    offCtx.clearRect(0, 0, width, height);
    drawSingleLayer(offCtx, layer, width, height);

    if (i === 0 && layer.blendMode === 'normal') {
      resultCtx.drawImage(offscreenCanvas, 0, 0);
    } else {
      compositeLayer(resultCtx, offscreenCanvas, layer.blendMode, width, height);
    }
  }

  ctx.drawImage(resultCanvas, 0, 0);
}

function drawSingleLayer(
  ctx: CanvasRenderingContext2D,
  layer: ILayerConfig,
  width: number,
  height: number
): void {
  let gradient: CanvasGradient;

  if (layer.type === 'linear') {
    const angleRad = (layer.angle * Math.PI) / 180;
    const cx = width / 2;
    const cy = height / 2;
    const length = Math.sqrt(width * width + height * height) / 2;
    const x1 = cx - Math.cos(angleRad) * length;
    const y1 = cy - Math.sin(angleRad) * length;
    const x2 = cx + Math.cos(angleRad) * length;
    const y2 = cy + Math.sin(angleRad) * length;

    gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  } else {
    const cx = width / 2;
    const cy = height / 2;
    gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, layer.radius);
  }

  gradient.addColorStop(0, colorWithAlpha(layer.startColor));
  gradient.addColorStop(1, colorWithAlpha(layer.endColor));

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function compositeLayer(
  resultCtx: CanvasRenderingContext2D,
  layerCanvas: HTMLCanvasElement,
  blendMode: BlendMode,
  width: number,
  height: number
): void {
  const baseData = resultCtx.getImageData(0, 0, width, height);
  const blendData = layerCanvas.getContext('2d')!.getImageData(0, 0, width, height);
  const outData = resultCtx.createImageData(width, height);

  for (let i = 0; i < baseData.data.length; i += 4) {
    const basePixel = [
      baseData.data[i],
      baseData.data[i + 1],
      baseData.data[i + 2],
      baseData.data[i + 3] / 255,
    ];
    const blendPixel = [
      blendData.data[i],
      blendData.data[i + 1],
      blendData.data[i + 2],
      blendData.data[i + 3] / 255,
    ];

    const result = blendColors(basePixel, blendPixel, blendMode);
    outData.data[i] = result[0];
    outData.data[i + 1] = result[1];
    outData.data[i + 2] = result[2];
    outData.data[i + 3] = result[3] * 255;
  }

  resultCtx.putImageData(outData, 0, 0);
}

export function getPixelsFromLayers(
  layers: ILayerConfig[],
  width: number,
  height: number
): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  renderLayersToCanvas(ctx, layers, width, height);
  return ctx.getImageData(0, 0, width, height);
}

export function exportToPNG(
  layers: ILayerConfig[],
  width: number,
  height: number
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  renderLayersToCanvas(ctx, layers, width, height);
  return canvas.toDataURL('image/png');
}

function cssBlendMode(mode: BlendMode): string {
  return mode === 'normal' ? 'normal' : mode;
}

function cssGradientLayer(layer: ILayerConfig, width: number, height: number): string {
  const startC = colorWithAlpha(layer.startColor);
  const endC = colorWithAlpha(layer.endColor);

  if (layer.type === 'linear') {
    return `linear-gradient(${layer.angle}deg, ${startC}, ${endC})`;
  } else {
    const cx = width / 2;
    const cy = height / 2;
    const percentR = (layer.radius / Math.max(width, height)) * 100;
    return `radial-gradient(circle at ${cx}px ${cy}px, ${startC} 0%, ${endC} ${percentR}%)`;
  }
}

export function exportToCSS(
  layers: ILayerConfig[],
  width: number,
  height: number
): string {
  const gradients = [...layers].reverse().map((l) => cssGradientLayer(l, width, height));
  const background = gradients.join(', ');
  const blendModes = [...layers].reverse().map((l) => cssBlendMode(l.blendMode)).join(', ');

  return `.gradient-background {
  width: ${width}px;
  height: ${height}px;
  background: ${background};
  background-blend-mode: ${blendModes};
}`;
}

export function exportToSVG(
  layers: ILayerConfig[],
  width: number,
  height: number
): string {
  const defs: string[] = [];
  const rects: string[] = [];

  layers.forEach((layer, index) => {
    const gradId = `grad_${index}`;
    const startC = colorWithAlpha(layer.startColor);
    const endC = colorWithAlpha(layer.endColor);

    if (layer.type === 'linear') {
      const angleRad = (layer.angle * Math.PI) / 180;
      const x1 = 50 - Math.cos(angleRad) * 50;
      const y1 = 50 - Math.sin(angleRad) * 50;
      const x2 = 50 + Math.cos(angleRad) * 50;
      const y2 = 50 + Math.sin(angleRad) * 50;

      defs.push(`    <linearGradient id="${gradId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
      <stop offset="0%" stop-color="${startC}" />
      <stop offset="100%" stop-color="${endC}" />
    </linearGradient>`);
    } else {
      defs.push(`    <radialGradient id="${gradId}" cx="50%" cy="50%" r="${(layer.radius / Math.max(width, height)) * 100}%">
      <stop offset="0%" stop-color="${startC}" />
      <stop offset="100%" stop-color="${endC}" />
    </radialGradient>`);
    }

    const mixMode = layer.blendMode === 'normal' ? '' : ` mix-blend-mode="${layer.blendMode}"`;
    rects.push(`  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#${gradId})"${mixMode} />`);
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
${defs.join('\n')}
  </defs>
${rects.join('\n')}
</svg>`;
}
