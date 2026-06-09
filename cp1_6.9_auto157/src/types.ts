export type TextureType = 'matte' | 'velvet' | 'pearl' | 'metallic';

export interface Ink {
  id: string;
  name: string;
  color: string;
  textureType: TextureType;
  glossiness: number;
  viscosity: number;
  signature: string;
  notes: string;
  createdAt: string;
}

export interface Filters {
  search: string;
  textureType: TextureType | 'all';
  glossinessRange: 'all' | 'low' | 'medium' | 'high';
  colorFamily: 'all' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'brown' | 'gray';
}

export const TEXTURE_LABELS: Record<TextureType, string> = {
  matte: '哑光',
  velvet: '丝绒',
  pearl: '珍珠',
  metallic: '金属',
};

export const PRESET_COLORS: string[] = [
  '#2C3E50', '#34495E', '#7F8C8D', '#95A5A6',
  '#BDC3C7', '#D5D8DC', '#E8E8E8', '#F5F5F5',
  '#8B7355', '#A0826D', '#B8A08A', '#C9B8A6',
  '#6B5B73', '#847596', '#9E91AC', '#B8AFC4',
  '#5D6B7A', '#7A8A9A', '#98A8B8', '#B6C4D0',
  '#8B6B61', '#A08078', '#B89890', '#D0B0AA',
];
