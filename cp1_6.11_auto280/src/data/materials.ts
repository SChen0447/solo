import type { Material } from '@/types';

export const MATERIALS: Material[] = [
  {
    id: 'fire_sulfur',
    name: '火硫磺',
    element: 'fire',
    color: '#ff6f00',
    shape: 'circle',
    resonanceFrequency: 450,
    resonanceThreshold: 75
  },
  {
    id: 'mercury',
    name: '水银',
    element: 'water',
    color: '#c0c0c0',
    shape: 'square',
    resonanceFrequency: 320,
    resonanceThreshold: 40
  },
  {
    id: 'earth_stone',
    name: '土石',
    element: 'earth',
    color: '#8b4513',
    shape: 'diamond',
    resonanceFrequency: 680,
    resonanceThreshold: 60
  },
  {
    id: 'air_wind',
    name: '气风',
    element: 'air',
    color: '#87ceeb',
    shape: 'circle',
    resonanceFrequency: 280,
    resonanceThreshold: 25
  },
  {
    id: 'dragon_blood',
    name: '龙血',
    element: 'fire',
    color: '#dc143c',
    shape: 'diamond',
    resonanceFrequency: 520,
    resonanceThreshold: 85
  },
  {
    id: 'moon_water',
    name: '月水',
    element: 'water',
    color: '#4169e1',
    shape: 'circle',
    resonanceFrequency: 380,
    resonanceThreshold: 15
  },
  {
    id: 'crystal_earth',
    name: '晶土',
    element: 'earth',
    color: '#daa520',
    shape: 'square',
    resonanceFrequency: 750,
    resonanceThreshold: 50
  },
  {
    id: 'thunder_air',
    name: '雷气',
    element: 'air',
    color: '#9932cc',
    shape: 'diamond',
    resonanceFrequency: 620,
    resonanceThreshold: 35
  }
];

export const getMaterialById = (id: string): Material | undefined =>
  MATERIALS.find(m => m.id === id);

export const ELEMENT_BONUS: Record<string, string[]> = {
  'fire_sulfur+dragon_blood': ['success_boost'],
  'water+earth': ['stability'],
  'air+fire': ['resonance_boost']
};
