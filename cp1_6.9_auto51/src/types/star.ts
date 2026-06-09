export type SpectralType = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';

export interface StarData {
  id: number;
  name?: string;
  x: number;
  y: number;
  z: number;
  magnitude: number;
  distance: number;
  spectralType: SpectralType;
}

export interface StarFilterOptions {
  magnitudeThreshold: number;
  minDistance: number;
  maxDistance: number;
}

export const SPECTRAL_COLORS: Record<SpectralType, string> = {
  O: '#9bb0ff',
  B: '#aabfff',
  A: '#cad7ff',
  F: '#f8f7ff',
  G: '#fff4ea',
  K: '#ffd2a1',
  M: '#ffcc6f',
};

export const SPECTRAL_NAMES: Record<SpectralType, string> = {
  O: 'O型 (蓝白)',
  B: 'B型 (蓝)',
  A: 'A型 (白)',
  F: 'F型 (黄白)',
  G: 'G型 (黄)',
  K: 'K型 (橙)',
  M: 'M型 (红)',
};
