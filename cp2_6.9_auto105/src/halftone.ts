export interface HalftoneParams {
  style: 'circle' | 'diamond' | 'lines' | 'wave';
  density: number;
  colorPalette?: string[];
}

export interface ExtractedColors {
  primary: string;
  contrast: string;
  palette: string[];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return [h * 360, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ];
}

function rgbToCmykApprox(r: number, g: number, b: number): [number, number, number] {
  const rp = r / 255;
  const gp = g / 255;
  const bp = b / 255;
  const k = 1 - Math.max(rp, gp, bp);
  if (k === 1) return [0, 0, 0];
  const c = (1 - rp - k) / (1 - k);
  const m = (1 - gp - k) / (1 - k);
  const y = (1 - bp - k) / (1 - k);
  return [
    Math.round(c * 255),
    Math.round(m * 255),
    Math.round(y * 255)
  ];
}

export function extractDominantColors(image: HTMLImageElement, canvas?: HTMLCanvasElement): ExtractedColors {
  const sampleCanvas = canvas || document.createElement('canvas');
  const sampleSize = 50;
  sampleCanvas.width = sampleSize;
  sampleCanvas.height = sampleSize;
  const ctx = sampleCanvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0, sampleSize, sampleSize);
  const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
  const data = imageData.data;

  const colorCounts = new Map<string, { count: number; r: number; g: number; b: number }>();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 125) continue;

    const bucketR = Math.floor(r / 32) * 32;
    const bucketG = Math.floor(g / 32) * 32;
    const bucketB = Math.floor(b / 32) * 32;
    const key = `${bucketR},${bucketG},${bucketB}`;

    const existing = colorCounts.get(key);
    if (existing) {
      existing.count++;
      existing.r += r;
      existing.g += g;
      existing.b += b;
    } else {
      colorCounts.set(key, { count: 1, r, g, b });
    }
  }

  const sorted = Array.from(colorCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map(c => ({
      r: Math.round(c.r / c.count),
      g: Math.round(c.g / c.count),
      b: Math.round(c.b / c.count)
    }));

  const palette = sorted.map(c => rgbToHex(c.r, c.g, c.b));
  const primary = palette[0] || '#FF6B35';

  const [pr, pg, pb] = hexToRgb(primary);
  const [ph, ps, pl] = rgbToHsl(pr, pg, pb);
  const contrastHue = (ph + 180) % 360;
  const contrastLightness = pl > 50 ? 15 : 85;
  const [cr, cg, cb] = hslToRgb(contrastHue, Math.max(ps, 70), contrastLightness);
  const contrast = rgbToHex(cr, cg, cb);

  return { primary, contrast, palette };
}

function getPixelBrightness(data: Uint8ClampedArray, x: number, y: number, width: number): number {
  const idx = (y * width + x) * 4;
  const r = data[idx];
  const g = data[idx + 1];
  const b = data[idx + 2];
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function getPixelCMYK(data: Uint8ClampedArray, x: number, y: number, width: number): [number, number, number] {
  const idx = (y * width + x) * 4;
  return rgbToCmykApprox(data[idx], data[idx + 1], data[idx + 2]);
}

function drawCircleStyle(
  ctx: CanvasRenderingContext2D,
  sourceData: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  density: number
) {
  const cellSize = 8;
  const scaleX = sourceWidth / targetWidth;
  const scaleY = sourceHeight / targetHeight;
  const densityFactor = density / 100;

  for (let y = 0; y < targetHeight; y += cellSize) {
    for (let x = 0; x < targetWidth; x += cellSize) {
      const sx = Math.min(Math.floor(x * scaleX), sourceWidth - 1);
      const sy = Math.min(Math.floor(y * scaleY), sourceHeight - 1);

      const brightness = 1 - getPixelBrightness(sourceData, sx, sy, sourceWidth);
      const [c, m, yVal] = getPixelCMYK(sourceData, sx, sy, sourceWidth);

      const baseDiameter = 2 + brightness * 6 * densityFactor;
      const jitter = (Math.random() - 0.5) * 2;
      const diameter = Math.max(2, Math.min(8, baseDiameter + jitter));

      if (brightness * densityFactor > 0.15) {
        const cr = Math.round(c * 0.8 + (1 - brightness) * 50);
        const cg = Math.round(m * 0.6 + yVal * 0.4 + (1 - brightness) * 50);
        const cb = Math.round(yVal * 0.9 + (1 - brightness) * 50);

        ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
        ctx.beginPath();
        ctx.arc(x + cellSize / 2, y + cellSize / 2, diameter / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawDiamondStyle(
  ctx: CanvasRenderingContext2D,
  sourceData: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  density: number
) {
  const cellSize = 10;
  const scaleX = sourceWidth / targetWidth;
  const scaleY = sourceHeight / targetHeight;
  const densityFactor = density / 100;

  ctx.save();
  ctx.translate(targetWidth / 2, targetHeight / 2);
  ctx.rotate(Math.PI / 4);
  ctx.translate(-targetWidth / 2, -targetHeight / 2);

  const offset = -targetWidth * 0.3;
  for (let y = offset; y < targetHeight + targetWidth; y += cellSize) {
    for (let x = offset; x < targetWidth + targetWidth; x += cellSize) {
      const sx = Math.min(Math.floor(x * scaleX), sourceWidth - 1);
      const sy = Math.min(Math.floor(y * scaleY), sourceHeight - 1);
      if (sx < 0 || sy < 0 || sx >= sourceWidth || sy >= sourceHeight) continue;

      const brightness = 1 - getPixelBrightness(sourceData, sx, sy, sourceWidth);
      const [c, m, yVal] = getPixelCMYK(sourceData, sx, sy, sourceWidth);

      const size = 3 + brightness * 7 * densityFactor;

      if (brightness * densityFactor > 0.15) {
        const cr = Math.round(c * 0.8 + (1 - brightness) * 50);
        const cg = Math.round(m * 0.6 + yVal * 0.4 + (1 - brightness) * 50);
        const cb = Math.round(yVal * 0.9 + (1 - brightness) * 50);

        ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
        ctx.save();
        ctx.translate(x + cellSize / 2, y + cellSize / 2);
        ctx.fillRect(-size / 2, -size / 2, size, size);
        ctx.restore();
      }
    }
  }
  ctx.restore();
}

function drawLinesStyle(
  ctx: CanvasRenderingContext2D,
  sourceData: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  density: number
) {
  const lineSpacing = 6;
  const scaleX = sourceWidth / targetWidth;
  const scaleY = sourceHeight / targetHeight;
  const densityFactor = density / 100;

  ctx.save();
  ctx.translate(targetWidth / 2, targetHeight / 2);
  ctx.rotate(Math.PI / 3);
  ctx.translate(-targetWidth / 2, -targetHeight / 2);

  const padding = targetWidth;
  for (let y = -padding; y < targetHeight + padding; y += lineSpacing) {
    for (let x = -padding; x < targetWidth + padding; x += 2) {
      const sx = Math.min(Math.max(0, Math.floor(x * scaleX)), sourceWidth - 1);
      const sy = Math.min(Math.max(0, Math.floor(y * scaleY)), sourceHeight - 1);

      const brightness = 1 - getPixelBrightness(sourceData, sx, sy, sourceWidth);
      const [c, m, yVal] = getPixelCMYK(sourceData, sx, sy, sourceWidth);

      const lineWidth = 0.5 + brightness * 5 * densityFactor;

      if (brightness * densityFactor > 0.1) {
        const cr = Math.round(c * 0.8 + (1 - brightness) * 50);
        const cg = Math.round(m * 0.6 + yVal * 0.4 + (1 - brightness) * 50);
        const cb = Math.round(yVal * 0.9 + (1 - brightness) * 50);

        ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
        ctx.fillRect(x, y - lineWidth / 2, 2.5, lineWidth);
      }
    }
  }
  ctx.restore();

  ctx.save();
  ctx.translate(targetWidth / 2, targetHeight / 2);
  ctx.rotate(-Math.PI / 3);
  ctx.translate(-targetWidth / 2, -targetHeight / 2);

  for (let y = -padding; y < targetHeight + padding; y += lineSpacing) {
    for (let x = -padding; x < targetWidth + padding; x += 2) {
      const sx = Math.min(Math.max(0, Math.floor(x * scaleX)), sourceWidth - 1);
      const sy = Math.min(Math.max(0, Math.floor(y * scaleY)), sourceHeight - 1);

      const brightness = 1 - getPixelBrightness(sourceData, sx, sy, sourceWidth);
      const [c, m, yVal] = getPixelCMYK(sourceData, sx, sy, sourceWidth);

      const lineWidth = 0.5 + brightness * 3 * densityFactor;

      if (brightness * densityFactor > 0.2) {
        const cr = Math.round(c * 0.6 + (1 - brightness) * 40);
        const cg = Math.round(m * 0.5 + yVal * 0.3 + (1 - brightness) * 40);
        const cb = Math.round(yVal * 0.7 + (1 - brightness) * 40);

        ctx.fillStyle = `rgba(${cr},${cg},${cb},0.7)`;
        ctx.fillRect(x, y - lineWidth / 2, 2.5, lineWidth);
      }
    }
  }
  ctx.restore();
}

function drawWaveStyle(
  ctx: CanvasRenderingContext2D,
  sourceData: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  density: number
) {
  const waveSpacing = 10;
  const amplitude = 8;
  const scaleX = sourceWidth / targetWidth;
  const scaleY = sourceHeight / targetHeight;
  const densityFactor = density / 100;

  for (let y = 0; y < targetHeight; y += waveSpacing) {
    ctx.beginPath();
    let first = true;

    for (let x = 0; x < targetWidth; x += 2) {
      const sx = Math.min(Math.floor(x * scaleX), sourceWidth - 1);
      const sy = Math.min(Math.floor(y * scaleY), sourceHeight - 1);

      const brightness = 1 - getPixelBrightness(sourceData, sx, sy, sourceWidth);
      const waveY = y + Math.sin(x * 0.05) * amplitude * brightness;

      if (first) {
        ctx.moveTo(x, waveY);
        first = false;
      } else {
        ctx.lineTo(x, waveY);
      }
    }

    const midY = Math.min(Math.floor((y + waveSpacing / 2) * scaleY), sourceHeight - 1);
    const midX = Math.floor(targetWidth / 2 * scaleX);
    const brightness = 1 - getPixelBrightness(sourceData, Math.min(midX, sourceWidth - 1), Math.max(0, midY), sourceWidth);
    const [c, m, yVal] = getPixelCMYK(sourceData, Math.min(midX, sourceWidth - 1), Math.max(0, midY), sourceWidth);

    const lineWidth = 1 + brightness * 6 * densityFactor;
    const cr = Math.round(c * 0.8 + (1 - brightness) * 50);
    const cg = Math.round(m * 0.6 + yVal * 0.4 + (1 - brightness) * 50);
    const cb = Math.round(yVal * 0.9 + (1 - brightness) * 50);

    ctx.strokeStyle = `rgb(${cr},${cg},${cb})`;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  for (let x = 0; x < targetWidth; x += waveSpacing) {
    ctx.beginPath();
    let first = true;

    for (let y = 0; y < targetHeight; y += 2) {
      const sx = Math.min(Math.floor(x * scaleX), sourceWidth - 1);
      const sy = Math.min(Math.floor(y * scaleY), sourceHeight - 1);

      const brightness = 1 - getPixelBrightness(sourceData, sx, sy, sourceWidth);
      const waveX = x + Math.sin(y * 0.05) * amplitude * brightness * 0.6;

      if (first) {
        ctx.moveTo(waveX, y);
        first = false;
      } else {
        ctx.lineTo(waveX, y);
      }
    }

    const midX = Math.min(Math.floor((x + waveSpacing / 2) * scaleX), sourceWidth - 1);
    const midY = Math.floor(targetHeight / 2 * scaleY);
    const brightness = 1 - getPixelBrightness(sourceData, Math.max(0, midX), Math.min(midY, sourceHeight - 1), sourceWidth);
    const [c, m, yVal] = getPixelCMYK(sourceData, Math.max(0, midX), Math.min(midY, sourceHeight - 1), sourceWidth);

    const lineWidth = 0.5 + brightness * 3 * densityFactor;
    const cr = Math.round(c * 0.6 + (1 - brightness) * 40);
    const cg = Math.round(m * 0.5 + yVal * 0.3 + (1 - brightness) * 40);
    const cb = Math.round(yVal * 0.7 + (1 - brightness) * 40);

    ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.5)`;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

export async function transformImage(
  inputImage: HTMLImageElement,
  params: HalftoneParams
): Promise<HTMLCanvasElement> {
  const maxPreviewWidth = 800;
  const maxPreviewHeight = 600;
  let targetWidth = inputImage.naturalWidth;
  let targetHeight = inputImage.naturalHeight;

  const aspectRatio = targetWidth / targetHeight;
  if (targetWidth > maxPreviewWidth) {
    targetWidth = maxPreviewWidth;
    targetHeight = targetWidth / aspectRatio;
  }
  if (targetHeight > maxPreviewHeight) {
    targetHeight = maxPreviewHeight;
    targetWidth = targetHeight * aspectRatio;
  }

  targetWidth = Math.floor(targetWidth);
  targetHeight = Math.floor(targetHeight);

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = inputImage.naturalWidth;
  sourceCanvas.height = inputImage.naturalHeight;
  const sourceCtx = sourceCanvas.getContext('2d')!;
  sourceCtx.drawImage(inputImage, 0, 0);
  const sourceData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height).data;

  const targetCanvas = document.createElement('canvas');
  targetCanvas.width = targetWidth;
  targetCanvas.height = targetHeight;
  const targetCtx = targetCanvas.getContext('2d')!;

  targetCtx.fillStyle = '#FFFFFF';
  targetCtx.fillRect(0, 0, targetWidth, targetHeight);

  const { style, density } = params;

  switch (style) {
    case 'circle':
      drawCircleStyle(targetCtx, sourceData, sourceCanvas.width, sourceCanvas.height, targetWidth, targetHeight, density);
      break;
    case 'diamond':
      drawDiamondStyle(targetCtx, sourceData, sourceCanvas.width, sourceCanvas.height, targetWidth, targetHeight, density);
      break;
    case 'lines':
      drawLinesStyle(targetCtx, sourceData, sourceCanvas.width, sourceCanvas.height, targetWidth, targetHeight, density);
      break;
    case 'wave':
      drawWaveStyle(targetCtx, sourceData, sourceCanvas.width, sourceCanvas.height, targetWidth, targetHeight, density);
      break;
    default:
      drawCircleStyle(targetCtx, sourceData, sourceCanvas.width, sourceCanvas.height, targetWidth, targetHeight, density);
  }

  return targetCanvas;
}

export async function renderExportCanvas(
  inputImage: HTMLImageElement,
  params: HalftoneParams,
  textConfig: {
    text: string;
    fontFamily: string;
    align: CanvasTextAlign;
    color: string;
    x: number;
    y: number;
  },
  borderColor: string
): Promise<HTMLCanvasElement> {
  const exportWidth = 1200;
  const exportHeight = 1600;
  const borderWidth = 15;
  const borderRadius = 8;

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = exportWidth;
  exportCanvas.height = exportHeight;
  const ctx = exportCanvas.getContext('2d')!;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, exportWidth, exportHeight);

  const contentX = borderWidth;
  const contentY = borderWidth;
  const contentWidth = exportWidth - borderWidth * 2;
  const contentHeight = exportHeight - borderWidth * 2;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = contentWidth;
  tempCanvas.height = contentHeight;
  const tempCtx = tempCanvas.getContext('2d')!;

  tempCtx.fillStyle = '#FFFFFF';
  tempCtx.fillRect(0, 0, contentWidth, contentHeight);

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = inputImage.naturalWidth;
  sourceCanvas.height = inputImage.naturalHeight;
  const sourceCtx = sourceCanvas.getContext('2d')!;
  sourceCtx.drawImage(inputImage, 0, 0);
  const sourceData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height).data;

  const { style, density } = params;

  switch (style) {
    case 'circle':
      drawCircleStyle(tempCtx, sourceData, sourceCanvas.width, sourceCanvas.height, contentWidth, contentHeight, density);
      break;
    case 'diamond':
      drawDiamondStyle(tempCtx, sourceData, sourceCanvas.width, sourceCanvas.height, contentWidth, contentHeight, density);
      break;
    case 'lines':
      drawLinesStyle(tempCtx, sourceData, sourceCanvas.width, sourceCanvas.height, contentWidth, contentHeight, density);
      break;
    case 'wave':
      drawWaveStyle(tempCtx, sourceData, sourceCanvas.width, sourceCanvas.height, contentWidth, contentHeight, density);
      break;
    default:
      drawCircleStyle(tempCtx, sourceData, sourceCanvas.width, sourceCanvas.height, contentWidth, contentHeight, density);
  }

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 4;
  ctx.shadowBlur = 8;

  roundRect(ctx, contentX, contentY, contentWidth, contentHeight, borderRadius);
  ctx.clip();
  ctx.drawImage(tempCanvas, contentX, contentY);
  ctx.restore();

  if (textConfig.text) {
    ctx.save();
    ctx.font = `bold 48px ${textConfig.fontFamily}`;
    ctx.fillStyle = textConfig.color;
    ctx.textAlign = textConfig.align;
    ctx.textBaseline = 'top';

    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.shadowBlur = 4;

    const textX = contentX + textConfig.x * (contentWidth / 400);
    const textY = contentY + textConfig.y * (contentHeight / 300);
    ctx.fillText(textConfig.text, textX, textY);
    ctx.restore();
  }

  ctx.save();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderWidth;
  roundRect(ctx, borderWidth / 2, borderWidth / 2, exportWidth - borderWidth, exportHeight - borderWidth, borderRadius + 4);
  ctx.stroke();
  ctx.restore();

  return exportCanvas;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
