export interface AnalyzedImage {
  url: string;
  name: string;
  width: number;
  height: number;
  dominantColors: string[];
  avgSaturation: number;
  compositionDensity: number;
  weight: number;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h, s, l };
}

function getDominantColors(imageData: ImageData, count: number = 3): string[] {
  const { data, width, height } = imageData;
  const colorMap = new Map<string, number>();
  const step = Math.max(1, Math.floor((width * height) / 10000));

  for (let i = 0; i < data.length; i += 4 * step) {
    const r = Math.round(data[i] / 16) * 16;
    const g = Math.round(data[i + 1] / 16) * 16;
    const b = Math.round(data[i + 2] / 16) * 16;
    const key = `${r},${g},${b}`;
    colorMap.set(key, (colorMap.get(key) || 0) + 1);
  }

  const sorted = [...colorMap.entries()].sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, count).map(([key]) => {
    const [r, g, b] = key.split(',').map(Number);
    return rgbToHex(r, g, b);
  });
}

function getAverageSaturation(imageData: ImageData): number {
  const { data } = imageData;
  let totalSaturation = 0;
  let pixelCount = 0;
  const step = 4 * 4;

  for (let i = 0; i < data.length; i += step) {
    const { s } = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    totalSaturation += s;
    pixelCount++;
  }

  return totalSaturation / pixelCount;
}

function getCompositionDensity(imageData: ImageData): number {
  const { data, width, height } = imageData;
  let totalGradient = 0;
  let count = 0;

  const gray = new Float32Array(width * height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  const step = Math.max(2, Math.floor(width / 200));
  for (let y = step; y < height - step; y += step) {
    for (let x = step; x < width - step; x += step) {
      const idx = y * width + x;
      const gx = Math.abs(gray[idx + step] - gray[idx - step]);
      const gy = Math.abs(gray[idx + step * width] - gray[idx - step * width]);
      totalGradient += Math.sqrt(gx * gx + gy * gy);
      count++;
    }
  }

  const avgGradient = count > 0 ? totalGradient / count : 0;
  return Math.min(1, avgGradient / 80);
}

function calculateWeight(avgSaturation: number, compositionDensity: number): number {
  const saturationScore = Math.min(100, avgSaturation * 100 * 1.2);
  const densityScore = compositionDensity * 100;
  const bonus = avgSaturation > 0.7 ? 10 : 0;
  return Math.min(100, Math.round(saturationScore * 0.5 + densityScore * 0.5 + bonus));
}

export function analyzeImage(file: File): Promise<AnalyzedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      const url = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 200;
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = Math.max(1, Math.floor(img.width * scale));
        canvas.height = Math.max(1, Math.floor(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const dominantColors = getDominantColors(imageData);
        const avgSaturation = getAverageSaturation(imageData);
        const compositionDensity = getCompositionDensity(imageData);
        const weight = calculateWeight(avgSaturation, compositionDensity);

        resolve({
          url,
          name: file.name,
          width: img.width,
          height: img.height,
          dominantColors,
          avgSaturation: Math.round(avgSaturation * 100),
          compositionDensity: Math.round(compositionDensity * 100),
          weight
        });
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  });
}

export function extractTitle(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  const name = dotIndex > 0 ? filename.substring(0, dotIndex) : filename;
  return name.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
