export interface FilterParams {
  intensity: number;
  noise?: boolean;
  grain?: boolean;
  border?: boolean;
  vignette?: number;
}

export type FilterType =
  | 'vintage'
  | 'bw'
  | 'warm'
  | 'cool'
  | 'bleach'
  | 'darkcorner'
  | 'watercolor'
  | 'cyberpunk';

export interface FilterConfig {
  type: FilterType;
  params: FilterParams;
}

const clamp = (v: number): number => Math.max(0, Math.min(255, v));

const mixChannels = (
  r: number,
  g: number,
  b: number,
  factor: number,
  targetR: number,
  targetG: number,
  targetB: number
): [number, number, number] => {
  return [
    clamp(r + (targetR - r) * factor),
    clamp(g + (targetG - g) * factor),
    clamp(b + (targetB - b) * factor),
  ];
};

const applyVintage = (data: Uint8ClampedArray, intensity: number): void => {
  const f = intensity / 100;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const tr = r * 0.9 + 40;
    const tg = g * 0.7 + 20;
    const tb = b * 0.5;
    [data[i], data[i + 1], data[i + 2]] = mixChannels(r, g, b, f, tr, tg, tb);
  }
};

const applyBW = (data: Uint8ClampedArray, intensity: number): void => {
  const f = intensity / 100;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = r * 0.299 + g * 0.587 + b * 0.114;
    [data[i], data[i + 1], data[i + 2]] = mixChannels(r, g, b, f, gray, gray, gray);
  }
};

const applyWarm = (data: Uint8ClampedArray, intensity: number): void => {
  const f = intensity / 100;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const tr = clamp(r + 30);
    const tg = clamp(g + 10);
    const tb = clamp(b - 20);
    [data[i], data[i + 1], data[i + 2]] = mixChannels(r, g, b, f, tr, tg, tb);
  }
};

const applyCool = (data: Uint8ClampedArray, intensity: number): void => {
  const f = intensity / 100;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const tr = clamp(r - 20);
    const tg = clamp(g + 10);
    const tb = clamp(b + 40);
    [data[i], data[i + 1], data[i + 2]] = mixChannels(r, g, b, f, tr, tg, tb);
  }
};

const applyBleach = (data: Uint8ClampedArray, intensity: number): void => {
  const f = intensity / 100;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = r * 0.299 + g * 0.587 + b * 0.114;
    const tr = clamp(gray + 60);
    const tg = clamp(gray + 50);
    const tb = clamp(gray + 55);
    [data[i], data[i + 1], data[i + 2]] = mixChannels(r, g, b, f, tr, tg, tb);
  }
};

const applyDarkCorner = (
  data: Uint8ClampedArray,
  intensity: number,
  width: number,
  height: number
): void => {
  const f = intensity / 100;
  const cx = width / 2;
  const cy = height / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);
  let px = 0;
  let py = 0;
  for (let i = 0; i < data.length; i += 4) {
    px = (i / 4) % width;
    py = Math.floor(i / 4 / width);
    const dist = Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));
    const vignette = clamp(1 - (dist / maxDist) * 1.5);
    const darkFactor = 1 - f * (1 - vignette);
    data[i] = clamp(data[i] * darkFactor);
    data[i + 1] = clamp(data[i + 1] * darkFactor);
    data[i + 2] = clamp(data[i + 2] * darkFactor);
  }
};

const applyWatercolor = (data: Uint8ClampedArray, intensity: number, width: number): void => {
  const f = intensity / 100;
  const original = new Uint8ClampedArray(data);
  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % width;
    const y = Math.floor(i / 4 / width);
    let sr = 0;
    let sg = 0;
    let sb = 0;
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0) {
          const idx = (ny * width + nx) * 4;
          if (idx < original.length) {
            sr += original[idx];
            sg += original[idx + 1];
            sb += original[idx + 2];
            count++;
          }
        }
      }
    }
    const tr = clamp(sr / count);
    const tg = clamp(sg / count + 10);
    const tb = clamp(sb / count + 15);
    [data[i], data[i + 1], data[i + 2]] = mixChannels(
      original[i],
      original[i + 1],
      original[i + 2],
      f,
      tr,
      tg,
      tb
    );
  }
};

const applyCyberpunk = (data: Uint8ClampedArray, intensity: number): void => {
  const f = intensity / 100;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const tr = clamp(r * 1.2 - 20);
    const tg = clamp(g * 0.6 + 20);
    const tb = clamp(b * 1.4 + 30);
    const contrast = 1.2;
    const cr = clamp((tr - 128) * contrast + 128);
    const cg = clamp((tg - 128) * contrast + 128);
    const cb = clamp((tb - 128) * contrast + 128);
    [data[i], data[i + 1], data[i + 2]] = mixChannels(r, g, b, f, cr, cg, cb);
  }
};

const applyNoise = (data: Uint8ClampedArray, intensity: number): void => {
  const f = intensity / 100;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 50 * f;
    data[i] = clamp(data[i] + noise);
    data[i + 1] = clamp(data[i + 1] + noise);
    data[i + 2] = clamp(data[i + 2] + noise);
  }
};

const applyGrain = (data: Uint8ClampedArray, intensity: number): void => {
  const f = intensity / 100;
  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 30 * f;
    data[i] = clamp(data[i] + grain);
    data[i + 1] = clamp(data[i + 1] + grain * 0.8);
    data[i + 2] = clamp(data[i + 2] + grain * 0.6);
  }
};

const applyBorder = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  intensity: number
): void => {
  const borderWidth = Math.max(2, Math.floor(Math.min(width, height) * 0.02 * (intensity / 100)));
  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % width;
    const y = Math.floor(i / 4 / width);
    if (x < borderWidth || x >= width - borderWidth || y < borderWidth || y >= height - borderWidth) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
    }
  }
};

export const applyFilter = (
  imageData: ImageData,
  config: FilterConfig
): ImageData => {
  const { type, params } = config;
  const data = new Uint8ClampedArray(imageData.data);
  const { width, height } = imageData;
  const result = new ImageData(data, width, height);

  switch (type) {
    case 'vintage':
      applyVintage(result.data, params.intensity);
      break;
    case 'bw':
      applyBW(result.data, params.intensity);
      break;
    case 'warm':
      applyWarm(result.data, params.intensity);
      break;
    case 'cool':
      applyCool(result.data, params.intensity);
      break;
    case 'bleach':
      applyBleach(result.data, params.intensity);
      break;
    case 'darkcorner':
      applyDarkCorner(result.data, params.intensity, width, height);
      break;
    case 'watercolor':
      applyWatercolor(result.data, params.intensity, width);
      break;
    case 'cyberpunk':
      applyCyberpunk(result.data, params.intensity);
      break;
  }

  if (params.noise) {
    applyNoise(result.data, params.intensity);
  }
  if (params.grain) {
    applyGrain(result.data, params.intensity);
  }
  if (params.border) {
    applyBorder(result.data, width, height, params.intensity);
  }

  return result;
};

export const applyFilters = (
  imageData: ImageData,
  configs: FilterConfig[]
): ImageData => {
  let result = imageData;
  for (const config of configs) {
    result = applyFilter(result, config);
  }
  return result;
};
