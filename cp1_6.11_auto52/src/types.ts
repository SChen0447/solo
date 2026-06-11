export interface TemperaturePoint {
  time: number;
  temp: number;
}

export interface RoastingRecord {
  id: number;
  coffeeId: number;
  date: string;
  roaster: string;
  temperatureCurve: TemperaturePoint[];
  dropTemp: number;
  firstCrack: string;
  secondCrack?: string;
  totalTime: string;
  roastLevel: string;
}

export interface TastingNote {
  id: number;
  coffeeId: number;
  rating: number;
  dryAroma: string[];
  wetAroma: string[];
  taste: string;
  author: string;
  createdAt: string;
}

export interface MapPosition {
  x: number;
  y: number;
}

export interface Coffee {
  id: number;
  name: string;
  origin: string;
  region: string;
  altitude: number;
  process: string;
  variety: string;
  flavorNotes: string[];
  avgRating: number;
  mapPosition: MapPosition;
  roastLevel: string;
  description: string;
}

export type SortOption = 'rating-desc' | 'altitude-asc';
