import type { PlantType, PlantConfig } from '../types';

export const PLANT_CONFIGS: Record<PlantType, PlantConfig> = {
  basil: {
    name: '罗勒',
    emoji: '🌿',
    maxGrowth: 120,
    preferredLight: [60, 90],
    preferredWater: [50, 80],
    preferredFertilizer: [30, 60],
  },
  mint: {
    name: '薄荷',
    emoji: '🌱',
    maxGrowth: 100,
    preferredLight: [50, 80],
    preferredWater: [60, 90],
    preferredFertilizer: [20, 50],
  },
  tomato: {
    name: '番茄',
    emoji: '🍅',
    maxGrowth: 150,
    preferredLight: [70, 100],
    preferredWater: [60, 85],
    preferredFertilizer: [50, 80],
  },
  strawberry: {
    name: '草莓',
    emoji: '🍓',
    maxGrowth: 130,
    preferredLight: [60, 90],
    preferredWater: [55, 80],
    preferredFertilizer: [40, 70],
  },
  lavender: {
    name: '薰衣草',
    emoji: '💜',
    maxGrowth: 140,
    preferredLight: [70, 100],
    preferredWater: [30, 50],
    preferredFertilizer: [20, 40],
  },
};

export const PLANT_TYPES: PlantType[] = ['basil', 'mint', 'tomato', 'strawberry', 'lavender'];

export const HEALTH_STATUS_COLORS: Record<string, string> = {
  healthy: '#4caf50',
  thirsty: '#2196f3',
  needsLight: '#ff9800',
  needsFertilizer: '#f44336',
};

export const HEALTH_STATUS_LABELS: Record<string, string> = {
  healthy: '健康',
  thirsty: '缺水',
  needsLight: '缺光',
  needsFertilizer: '缺肥',
};
