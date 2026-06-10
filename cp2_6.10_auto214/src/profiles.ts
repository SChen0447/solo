export interface LayerProfile {
  id: string;
  name: string;
  nameEn: string;
  minAltitude: number;
  maxAltitude: number;
  color: [number, number, number, number];
  emissive: [number, number, number];
  avgTemp: string;
  composition: string[];
  description: string;
}

export const LAYER_PROFILES: LayerProfile[] = [
  {
    id: 'troposphere',
    name: '对流层',
    nameEn: 'Troposphere',
    minAltitude: 0,
    maxAltitude: 12,
    color: [0.529, 0.808, 0.922, 0.3],
    emissive: [0.05, 0.1, 0.15],
    avgTemp: '15°C → -56°C',
    composition: ['N₂ 78%', 'O₂ 21%', 'Ar 0.9%', 'CO₂ 0.04%', 'H₂O 变量'],
    description: '天气现象发生层，温度随高度递减'
  },
  {
    id: 'stratosphere',
    name: '平流层',
    nameEn: 'Stratosphere',
    minAltitude: 12,
    maxAltitude: 50,
    color: [0.702, 0.616, 0.859, 0.25],
    emissive: [0.08, 0.05, 0.12],
    avgTemp: '-56°C → -2°C',
    composition: ['N₂ 78%', 'O₂ 21%', 'O₃ (臭氧层)'],
    description: '臭氧层位于此层，温度随高度递增'
  },
  {
    id: 'mesosphere',
    name: '中间层',
    nameEn: 'Mesosphere',
    minAltitude: 50,
    maxAltitude: 85,
    color: [0.753, 0.753, 0.753, 0.2],
    emissive: [0.04, 0.04, 0.04],
    avgTemp: '-2°C → -90°C',
    composition: ['N₂', 'O₂', 'O', 'NO⁺', 'O₂⁺'],
    description: '流星在此燃烧，温度随高度递减'
  },
  {
    id: 'thermosphere',
    name: '热层',
    nameEn: 'Thermosphere',
    minAltitude: 85,
    maxAltitude: 120,
    color: [1.0, 0.8, 0.502, 0.15],
    emissive: [0.15, 0.1, 0.05],
    avgTemp: '-90°C → 1200°C',
    composition: ['O', 'N₂', 'O₂', 'He', 'H'],
    description: '极光出现区域，温度随高度剧增'
  }
];

export function generateTemperatureProfile(altitudeKm: number): number {
  if (altitudeKm <= 12) {
    return 15 - 6.5 * altitudeKm;
  } else if (altitudeKm <= 20) {
    return -56 + 0 * (altitudeKm - 12);
  } else if (altitudeKm <= 50) {
    return -56 + 1.8 * (altitudeKm - 20);
  } else if (altitudeKm <= 85) {
    return -2 - 2.5 * (altitudeKm - 50);
  } else {
    return -90 + 3.5 * (altitudeKm - 85);
  }
}

export interface TempPoint {
  altitude: number;
  temperature: number;
}

export function generateTemperatureCurve(maxAltitudeKm: number = 80, stepKm: number = 0.5): TempPoint[] {
  const points: TempPoint[] = [];
  for (let alt = 0; alt <= maxAltitudeKm; alt += stepKm) {
    points.push({
      altitude: alt,
      temperature: generateTemperatureProfile(alt)
    });
  }
  return points;
}

export const TEMPERATURE_CURVE: TempPoint[] = generateTemperatureCurve(80, 0.5);

export const TOTAL_HEIGHT_KM = 80;
export const HEIGHT_SCALE = 1;
