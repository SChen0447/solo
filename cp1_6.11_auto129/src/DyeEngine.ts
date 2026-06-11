export interface BindingPoint {
  x: number;
  y: number;
  id: string;
}

export interface DyeLayerData {
  color: string;
  bindingPoints: BindingPoint[];
  diffused: boolean;
  oxidized: boolean;
  washed: boolean;
}

export type DyePhase = 'idle' | 'binding' | 'dyeing' | 'oxidizing' | 'washing' | 'complete';

export const LAYER_COLORS = ['#42a5f5', '#1e88e5', '#1565c0', '#0d47a1'];

export const CANVAS_SIZE = 400;

export const BINDING_POINT_RADIUS = 4;
export const BINDING_POINT_DRAW_RADIUS = 8;
export const WASHED_RADIUS = 12;
export const DIFFUSION_SPEED = 5;

const COLOR_DEEP = { r: 13, g: 71, b: 161 };
const COLOR_DARK = { r: 26, g: 35, b: 126 };

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

function lerpColor(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
  t: number
): { r: number; g: number; b: number } {
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t),
  };
}

export function computeDistanceField(
  width: number,
  height: number,
  bindingPoints: BindingPoint[]
): Float32Array {
  const dist = new Float32Array(width * height);
  dist.fill(Infinity);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let minD = Infinity;
      for (const bp of bindingPoints) {
        const dx = x - bp.x;
        const dy = y - bp.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < minD) minD = d;
      }
      dist[y * width + x] = minD;
    }
  }

  return dist;
}

export function computeDiffusionFrame(
  width: number,
  height: number,
  distField: Float32Array,
  maxRadius: number,
  layerColor: string
): ImageData {
  const imageData = new ImageData(width, height);
  const data = imageData.data;
  const color = hexToRgb(layerColor);
  const baseColor = lerpColor(COLOR_DEEP, COLOR_DARK, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const d = distField[idx];
      const pixIdx = idx * 4;

      if (d <= BINDING_POINT_DRAW_RADIUS) {
        data[pixIdx] = 255;
        data[pixIdx + 1] = 255;
        data[pixIdx + 2] = 255;
        data[pixIdx + 3] = 255;
        continue;
      }

      if (d > maxRadius) {
        data[pixIdx] = baseColor.r;
        data[pixIdx + 1] = baseColor.g;
        data[pixIdx + 2] = baseColor.b;
        data[pixIdx + 3] = 255;
        continue;
      }

      const edgeDist = d - BINDING_POINT_DRAW_RADIUS;
      const diffusionRange = maxRadius - BINDING_POINT_DRAW_RADIUS;
      const t = Math.min(1, edgeDist / diffusionRange);

      const blendedColor = lerpColor(color, baseColor, t);

      const alphaT = t < 0.3 ? t / 0.3 : 1.0;
      const alpha = Math.round(0.8 * 255 - (0.8 - 0.2) * 255 * alphaT * t);

      const blurZone = 15;
      if (d > maxRadius - blurZone) {
        const blurT = (d - (maxRadius - blurZone)) / blurZone;
        data[pixIdx] = Math.round(blendedColor.r + (baseColor.r - blendedColor.r) * blurT);
        data[pixIdx + 1] = Math.round(blendedColor.g + (baseColor.g - blendedColor.g) * blurT);
        data[pixIdx + 2] = Math.round(blendedColor.b + (baseColor.b - blendedColor.b) * blurT);
        data[pixIdx + 3] = Math.round(alpha + (255 - alpha) * blurT * 0.5);
      } else {
        data[pixIdx] = blendedColor.r;
        data[pixIdx + 1] = blendedColor.g;
        data[pixIdx + 2] = blendedColor.b;
        data[pixIdx + 3] = alpha;
      }
    }
  }

  return imageData;
}

export function applyOxidation(
  imageData: ImageData,
  progress: number
): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
  const data = result.data;
  const deepBlue = COLOR_DEEP;
  const indigo = hexToRgb('#1565c0');

  for (let i = 0; i < data.length; i += 4) {
    if (data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255) continue;

    const current = { r: data[i], g: data[i + 1], b: data[i + 2] };
    const oxidized = lerpColor(deepBlue, indigo, 1);
    const blended = lerpColor(current, oxidized, progress);

    data[i] = blended.r;
    data[i + 1] = blended.g;
    data[i + 2] = blended.b;
  }

  return result;
}

export function applyWashing(
  imageData: ImageData,
  distField: Float32Array,
  bindingPoints: BindingPoint[]
): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
  const data = result.data;
  const width = imageData.width;

  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const d = distField[idx];
      const pixIdx = idx * 4;

      if (d <= WASHED_RADIUS) {
        const t = d / WASHED_RADIUS;
        const softness = t * t * (3 - 2 * t);

        data[pixIdx] = Math.round(255 * softness + data[pixIdx] * (1 - softness));
        data[pixIdx + 1] = Math.round(255 * softness + data[pixIdx + 1] * (1 - softness));
        data[pixIdx + 2] = Math.round(255 * softness + data[pixIdx + 2] * (1 - softness));
        data[pixIdx + 3] = 255;
      }
    }
  }

  return result;
}

export function compositeLayers(
  baseImageData: ImageData,
  layerImageData: ImageData
): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(baseImageData.data),
    baseImageData.width,
    baseImageData.height
  );
  const base = result.data;
  const layer = layerImageData.data;

  for (let i = 0; i < base.length; i += 4) {
    const layerA = layer[i + 3] / 255;
    if (layerA === 0) continue;

    if (layer[i] === 255 && layer[i + 1] === 255 && layer[i + 2] === 255 && layerA > 0.9) {
      base[i] = 255;
      base[i + 1] = 255;
      base[i + 2] = 255;
      base[i + 3] = 255;
      continue;
    }

    const outA = layerA + (1 - layerA) * (base[i + 3] / 255);
    if (outA > 0) {
      base[i] = Math.round((layer[i] * layerA + base[i] * (1 - layerA) * (base[i + 3] / 255)) / outA);
      base[i + 1] = Math.round((layer[i + 1] * layerA + base[i + 1] * (1 - layerA) * (base[i + 3] / 255)) / outA);
      base[i + 2] = Math.round((layer[i + 2] * layerA + base[i + 2] * (1 - layerA) * (base[i + 3] / 255)) / outA);
      base[i + 3] = Math.round(outA * 255);
    }
  }

  return result;
}

export function createEmptyImageData(width: number, height: number): ImageData {
  const imageData = new ImageData(width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = 255;
  }
  return imageData;
}
