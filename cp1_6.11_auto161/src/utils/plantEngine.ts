import { v4 as uuidv4 } from 'uuid';
import type { Plant, PlantType, PlantParams, HealthStatus, PlantConfig } from '../types';
import { PLANT_CONFIGS } from '../constants/plants';

export function calculateGrowth(params: PlantParams): number {
  const growthIncrement = (params.light * 0.3 + params.water * 0.4 + params.fertilizer * 0.2) * 0.01;
  return growthIncrement;
}

export function determineHealthStatus(
  currentParams: PlantParams,
  config: PlantConfig
): HealthStatus {
  const { light, water, fertilizer } = currentParams;
  const { preferredLight, preferredWater, preferredFertilizer } = config;

  if (water < preferredWater[0]) {
    return 'thirsty';
  }
  if (light < preferredLight[0]) {
    return 'needsLight';
  }
  if (fertilizer < preferredFertilizer[0]) {
    return 'needsFertilizer';
  }

  return 'healthy';
}

export function createPlant(type: PlantType): Plant {
  const config = PLANT_CONFIGS[type];
  const defaultParams: PlantParams = {
    light: Math.floor((config.preferredLight[0] + config.preferredLight[1]) / 2),
    water: Math.floor((config.preferredWater[0] + config.preferredWater[1]) / 2),
    fertilizer: Math.floor((config.preferredFertilizer[0] + config.preferredFertilizer[1]) / 2),
  };

  const initialHealth = determineHealthStatus(defaultParams, config);

  return {
    id: uuidv4(),
    type,
    name: config.name,
    growth: 0,
    maxGrowth: config.maxGrowth,
    params: defaultParams,
    healthStatus: initialHealth,
    plantedAt: Date.now(),
    waterCount: 0,
    healthHistory: [
      {
        status: initialHealth,
        timestamp: Date.now(),
      },
    ],
  };
}
