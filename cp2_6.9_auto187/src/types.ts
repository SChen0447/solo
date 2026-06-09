export interface Plant {
  id: string;
  name: string;
  scientificName: string;
  family: string;
  genus: string;
  description: string;
  lightRequirement: 'strong' | 'medium' | 'weak';
  waterRequirement: 'dry' | 'medium' | 'wet';
  temperatureRange: string;
  colorSeed: number;
  shapeType: 'leafy' | 'tall' | 'bushy' | 'vine' | 'cactus' | 'fern';
}

export interface AppState {
  plants: Plant[];
  selectedPlantId: string | null;
  favoriteIds: Set<string>;
  searchQuery: string;
}

export type LightLevel = 'strong' | 'medium' | 'weak';
export type HumidityLevel = 'dry' | 'medium' | 'wet';

export interface GreenhouseCell {
  light: LightLevel;
  humidity: HumidityLevel;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlacedPlant {
  plantId: string;
  cellIndex: number;
  x: number;
  y: number;
  size: number;
  saturation: number;
  growing: boolean;
}

export interface Particle {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  life: number;
  maxLife: number;
}

export type StateListener = (state: AppState) => void;
