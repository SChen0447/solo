export type PlantType = 'aristolochia' | 'buddleja' | 'hibiscus' | 'lantana';

export interface PlantData {
  type: PlantType;
  name: string;
  color: string;
  glowColor: string;
  nectarLevel: number;
  maxNectar: number;
  growthDays: number;
  monthlyBloomCurve: number[];
  butterflyPreference: string[];
}

export interface PlacedPlant {
  id: string;
  type: PlantType;
  gridX: number;
  gridY: number;
  nectar: number;
  lastVisitedAt: number;
  daysWithoutVisit: number;
  plantedAt: number;
}

export type ButterflySpecies = 'citrus_swallowtail' | 'golden_pansy' | 'dead_leaf' | 'cabbage_white';

export interface ButterflyColors {
  primary: string;
  secondary: string;
  accent: string;
}

export interface Butterfly {
  id: string;
  species: ButterflySpecies | string;
  speciesName: string;
  wingSize: number;
  patternDensity: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  antennaeRatio: number;
  wingspanMm: number;
  nectarPreferences: string[];
  isWild: boolean;
  isCaptured: boolean;
  capturedAt?: number;
  parentIds: string[];
  childIds: string[];
  createdAt: number;
  lastActiveAt: number;
  pollenSource?: string;
}

export interface FlyingButterfly extends Butterfly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  speed: number;
  isHovering: boolean;
  hoverEndTime: number;
  hoverPlantId?: string;
  antennaeWiggle: number;
  wingPhase: number;
  pathProgress: number;
  bezierPoints: { x: number; y: number }[];
}

export interface PedigreeRecord {
  butterflyId: string;
  speciesName: string;
  parentIds: string[];
  childCount: number;
  lastActiveAt: number;
  createdAt: number;
}

export type TabType = 'garden' | 'observation' | 'design';
