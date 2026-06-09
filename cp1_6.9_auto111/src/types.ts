export type BuildingType = 'residential' | 'commercial' | 'park';

export interface Building {
  gridX: number;
  gridZ: number;
  type: BuildingType;
  userId?: string;
}

export interface User {
  id: string;
  color: string;
}

export interface LightingState {
  hour: number;
  color: string;
}

export interface CityState {
  buildings: Building[];
  lighting: LightingState;
  users: User[];
  currentUser?: User;
}

export type TurnDirection = 'left' | 'straight' | 'right';

export interface Vehicle {
  id: number;
  color: string;
}

export const BUILDING_CONFIG: Record<BuildingType, { height: number; color: string; label: string }> = {
  residential: { height: 2, color: '#8fa3b0', label: '住宅' },
  commercial: { height: 3, color: '#c9a96e', label: '商业' },
  park: { height: 1, color: '#7cb342', label: '公园' },
};

export const VEHICLE_COLORS = [
  '#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22'
];

export const LIGHT_PRESETS = [
  '#ffffff',
  '#ff8c00',
  '#1a1a4a',
  '#87ceeb',
  '#ff69b4',
  '#ffa500',
];

export const GRID_SIZE = 10;
export const ROAD_WIDTH = 2;
export const CELL_SIZE = 1;
export const VEHICLE_SPEED = 1.5;
export const DECELERATION_FACTOR = 0.3;
export const MIN_GAP = 1.0;
export const TRAFFIC_LIGHT_CYCLE = 30;
