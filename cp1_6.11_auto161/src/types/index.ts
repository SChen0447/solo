export type PlantType = 'basil' | 'mint' | 'tomato' | 'strawberry' | 'lavender';

export type HealthStatus = 'healthy' | 'thirsty' | 'needsLight' | 'needsFertilizer';

export interface PlantParams {
  light: number;
  water: number;
  fertilizer: number;
}

export interface PlantConfig {
  name: string;
  emoji: string;
  maxGrowth: number;
  preferredLight: [number, number];
  preferredWater: [number, number];
  preferredFertilizer: [number, number];
}

export interface HealthHistoryEntry {
  status: HealthStatus;
  timestamp: number;
}

export interface Plant {
  id: string;
  type: PlantType;
  name: string;
  growth: number;
  maxGrowth: number;
  params: PlantParams;
  healthStatus: HealthStatus;
  plantedAt: number;
  waterCount: number;
  healthHistory: HealthHistoryEntry[];
}

export interface GardenSlot {
  id: number;
  plant: Plant | null;
}
