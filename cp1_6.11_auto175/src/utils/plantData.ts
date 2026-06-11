import { PlantData, PlantType } from '../types';

export const PLANT_DATA: Record<PlantType, PlantData> = {
  aristolochia: {
    type: 'aristolochia',
    name: '马兜铃',
    color: '#8B0000',
    glowColor: 'rgba(139, 0, 0, 0.6)',
    nectarLevel: 75,
    maxNectar: 100,
    growthDays: 30,
    monthlyBloomCurve: [0.3, 0.5, 0.8, 1.0, 0.9, 0.7, 0.5, 0.3, 0.2, 0.4, 0.6, 0.8],
    butterflyPreference: ['citrus_swallowtail', 'dead_leaf', 'golden_pansy']
  },
  buddleja: {
    type: 'buddleja',
    name: '醉鱼草',
    color: '#9370DB',
    glowColor: 'rgba(147, 112, 219, 0.6)',
    nectarLevel: 85,
    maxNectar: 100,
    growthDays: 45,
    monthlyBloomCurve: [0.2, 0.3, 0.5, 0.7, 0.9, 1.0, 0.9, 0.7, 0.5, 0.3, 0.2, 0.2],
    butterflyPreference: ['golden_pansy', 'cabbage_white', 'citrus_swallowtail']
  },
  hibiscus: {
    type: 'hibiscus',
    name: '扶桑花',
    color: '#DC143C',
    glowColor: 'rgba(220, 20, 60, 0.6)',
    nectarLevel: 90,
    maxNectar: 100,
    growthDays: 60,
    monthlyBloomCurve: [0.5, 0.6, 0.8, 0.9, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.5, 0.6],
    butterflyPreference: ['cabbage_white', 'golden_pansy', 'dead_leaf']
  },
  lantana: {
    type: 'lantana',
    name: '马缨丹',
    color: '#FFA500',
    glowColor: 'rgba(255, 165, 0, 0.6)',
    nectarLevel: 95,
    maxNectar: 100,
    growthDays: 40,
    monthlyBloomCurve: [0.4, 0.5, 0.7, 0.9, 1.0, 1.0, 0.9, 0.8, 0.7, 0.5, 0.4, 0.3],
    butterflyPreference: ['dead_leaf', 'citrus_swallowtail', 'cabbage_white']
  }
};

export const PLANT_TYPES: PlantType[] = ['aristolochia', 'buddleja', 'hibiscus', 'lantana'];

export const getPlantByName = (name: string): PlantData | undefined => {
  return Object.values(PLANT_DATA).find(p => p.name === name);
};

export const getButterflyAttractionScore = (plantType: PlantType, butterflySpecies: string): number => {
  const plant = PLANT_DATA[plantType];
  const index = plant.butterflyPreference.indexOf(butterflySpecies);
  if (index === -1) return 0.3;
  return 1 - index * 0.2;
};
