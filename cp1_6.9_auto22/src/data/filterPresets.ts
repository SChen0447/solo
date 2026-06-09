import { FilterConfig, FilterType, applyFilter } from '../utils/filterEngine';

export interface FilterPreset {
  type: FilterType;
  name: string;
  defaultParams: FilterConfig['params'];
}

export const FILTER_PRESETS: FilterPreset[] = [
  {
    type: 'vintage',
    name: '复古',
    defaultParams: { intensity: 70, grain: true, noise: false, border: false },
  },
  {
    type: 'bw',
    name: '黑白',
    defaultParams: { intensity: 100, grain: false, noise: false, border: false },
  },
  {
    type: 'warm',
    name: '暖阳',
    defaultParams: { intensity: 60, grain: false, noise: false, border: false },
  },
  {
    type: 'cool',
    name: '冷调',
    defaultParams: { intensity: 65, grain: false, noise: false, border: false },
  },
  {
    type: 'bleach',
    name: '漂白',
    defaultParams: { intensity: 55, grain: false, noise: false, border: false },
  },
  {
    type: 'darkcorner',
    name: '暗角',
    defaultParams: { intensity: 80, grain: false, noise: false, border: false },
  },
  {
    type: 'watercolor',
    name: '水彩',
    defaultParams: { intensity: 65, grain: true, noise: false, border: false },
  },
  {
    type: 'cyberpunk',
    name: '赛博朋克',
    defaultParams: { intensity: 85, grain: false, noise: true, border: true },
  },
];

export const getFilterPreset = (type: FilterType): FilterPreset | undefined => {
  return FILTER_PRESETS.find((p) => p.type === type);
};

export const generateThumbnail = (
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  filterType: FilterType,
  size: number = 50
): string => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.drawImage(sourceImage, 0, 0, size, size);

  const imageData = ctx.getImageData(0, 0, size, size);
  const preset = getFilterPreset(filterType);
  if (preset) {
    const filtered = applyFilter(imageData, {
      type: filterType,
      params: preset.defaultParams,
    });
    ctx.putImageData(filtered, 0, 0);
  }

  return canvas.toDataURL();
};

export const generateAllThumbnails = (
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  size: number = 50
): Record<FilterType, string> => {
  const result = {} as Record<FilterType, string>;
  for (const preset of FILTER_PRESETS) {
    result[preset.type] = generateThumbnail(sourceImage, preset.type, size);
  }
  return result;
};
