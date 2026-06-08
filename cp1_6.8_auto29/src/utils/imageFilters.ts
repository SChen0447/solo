import { StyleId } from '../types';

export async function applyStyleFilter(
  imageUrl: string,
  styleId: StyleId
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = Math.min(img.width, img.height);
      const x = (img.width - size) / 2;
      const y = (img.height - size) / 2;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, x, y, size, size, 0, 0, size, size);

      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;

      switch (styleId) {
        case 'watercolor':
          applyWatercolor(data, size, size);
          break;
        case 'sketch':
          applySketch(data, size, size);
          break;
        case 'pixel':
          applyPixel(ctx, data, size, size);
          break;
        case 'oil':
          applyOil(data, size, size);
          break;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = imageUrl;
  });
}

function applyWatercolor(data: Uint8ClampedArray, width: number, height: number) {
  const copy = new Uint8ClampedArray(data);
  const kernelSize = 5;
  const half = Math.floor(kernelSize / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, count = 0;

      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const i = (ny * width + nx) * 4;
            r += copy[i];
            g += copy[i + 1];
            b += copy[i + 2];
            count++;
          }
        }
      }

      const i = (y * width + x) * 4;
      data[i] = Math.min(255, r / count * 1.1);
      data[i + 1] = Math.min(255, g / count * 1.05);
      data[i + 2] = Math.min(255, b / count * 1.15);
    }
  }

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 20;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise * 0.8));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise * 0.6));
  }
}

function applySketch(data: Uint8ClampedArray, width: number, height: number) {
  const copy = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const gray = (copy[i] * 0.299 + copy[i + 1] * 0.587 + copy[i + 2] * 0.114);
      data[i] = data[i + 1] = data[i + 2] = 255 - gray;
    }
  }

  const copy2 = new Uint8ClampedArray(data);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4;
      const left = copy2[((y * width + (x - 1)) * 4)];
      const right = copy2[((y * width + (x + 1)) * 4)];
      const top = copy2[(((y - 1) * width + x) * 4)];
      const bottom = copy2[(((y + 1) * width + x) * 4)];

      const edge = Math.abs(left - right) + Math.abs(top - bottom);
      const val = Math.min(255, edge * 3);
      data[i] = 255 - val;
      data[i + 1] = 255 - val;
      data[i + 2] = 255 - val;
    }
  }
}

function applyPixel(ctx: CanvasRenderingContext2D, _data: Uint8ClampedArray, width: number, height: number) {
  const pixelSize = Math.max(4, Math.floor(width / 80));
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  for (let y = 0; y < height; y += pixelSize) {
    for (let x = 0; x < width; x += pixelSize) {
      let r = 0, g = 0, b = 0, count = 0;

      for (let dy = 0; dy < pixelSize && y + dy < height; dy++) {
        for (let dx = 0; dx < pixelSize && x + dx < width; dx++) {
          const i = ((y + dy) * width + (x + dx)) * 4;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
      }

      r = Math.floor(r / count);
      g = Math.floor(g / count);
      b = Math.floor(b / count);

      for (let dy = 0; dy < pixelSize && y + dy < height; dy++) {
        for (let dx = 0; dx < pixelSize && x + dx < width; dx++) {
          const i = ((y + dy) * width + (x + dx)) * 4;
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

function applyOil(data: Uint8ClampedArray, width: number, height: number) {
  const copy = new Uint8ClampedArray(data);
  const radius = 3;
  const intensityLevels = 20;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rCount: number[] = new Array(intensityLevels).fill(0);
      const gCount: number[] = new Array(intensityLevels).fill(0);
      const bCount: number[] = new Array(intensityLevels).fill(0);
      const iCount: number[] = new Array(intensityLevels).fill(0);

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const i = (ny * width + nx) * 4;
            const r = copy[i];
            const g = copy[i + 1];
            const b = copy[i + 2];
            const intensity = Math.floor(
              ((r + g + b) / 3) * intensityLevels / 256
            );
            const idx = Math.min(intensity, intensityLevels - 1);
            rCount[idx] += r;
            gCount[idx] += g;
            bCount[idx] += b;
            iCount[idx]++;
          }
        }
      }

      let maxIdx = 0;
      let maxCount = 0;
      for (let j = 0; j < intensityLevels; j++) {
        if (iCount[j] > maxCount) {
          maxCount = iCount[j];
          maxIdx = j;
        }
      }

      const i = (y * width + x) * 4;
      if (iCount[maxIdx] > 0) {
        data[i] = rCount[maxIdx] / iCount[maxIdx];
        data[i + 1] = gCount[maxIdx] / iCount[maxIdx];
        data[i + 2] = bCount[maxIdx] / iCount[maxIdx];
      }
    }
  }

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, data[i] * 1.1);
    data[i + 1] = Math.min(255, data[i + 1] * 1.05);
    data[i + 2] = Math.min(255, data[i + 2] * 1.1);
  }
}

export function createThumbnail(imageUrl: string, size: number = 120): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;

      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = imageUrl;
  });
}
