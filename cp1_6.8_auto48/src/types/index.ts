export type TextureType = 'pencil' | 'watercolor' | 'oil' | 'charcoal' | 'marker' | 'airbrush';

export type BlendMode = 'multiply' | 'screen' | 'overlay';

export interface TextureInfo {
  id: TextureType;
  name: string;
  defaultColor: string;
}

export interface MixState {
  textureA: TextureType;
  textureB: TextureType;
  colorA: string;
  colorB: string;
  blendMode: BlendMode;
  opacityA: number;
  opacityB: number;
  intensity: number;
}

export interface HistoryItem {
  id: number;
  timestamp: number;
  state: MixState;
  thumbnail: string;
}

export const TEXTURE_LIST: TextureInfo[] = [
  { id: 'pencil', name: '铅笔排线', defaultColor: '#4a4a4a' },
  { id: 'watercolor', name: '水彩晕染', defaultColor: '#5b9bd5' },
  { id: 'oil', name: '油画堆叠', defaultColor: '#d4a574' },
  { id: 'charcoal', name: '炭笔擦痕', defaultColor: '#2d2d2d' },
  { id: 'marker', name: '马克笔平涂', defaultColor: '#e74c3c' },
  { id: 'airbrush', name: '喷枪渐变', defaultColor: '#9b59b6' },
];

export const BLEND_MODES: { id: BlendMode; name: string }[] = [
  { id: 'multiply', name: '正片叠底' },
  { id: 'screen', name: '滤色' },
  { id: 'overlay', name: '叠加' },
];
