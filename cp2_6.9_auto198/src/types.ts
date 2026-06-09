export type BloomStatus = 'blooming' | 'budding' | 'fading' | 'dormant';

export interface Plant {
  id: string;
  gardenId: string;
  name: string;
  latinName: string;
  lat: number;
  lng: number;
  bloomStatus: BloomStatus;
  bloomPeriod: string;
  caretaker: string;
}

export interface Garden {
  id: string;
  name: string;
  color: string;
  center: [number, number];
  bounds: [number, number][];
  description: string;
  thumbnail: string;
  bloomingCount: number;
  totalCount: number;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
}

export interface Observation {
  id: string;
  plantId: string;
  description: string;
  mood: string;
  photo: string;
  timestamp: string;
}

export const BLOOM_COLORS: Record<BloomStatus, string> = {
  blooming: '#FF6B6B',
  budding: '#F39C12',
  fading: '#95A5A6',
  dormant: '#BDC3C7'
};

export const BLOOM_LABELS: Record<BloomStatus, string> = {
  blooming: '盛花期',
  budding: '含苞期',
  fading: '凋谢期',
  dormant: '休眠期'
};
