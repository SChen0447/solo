import p5 from 'p5';

export type PrimitiveType = 'circle' | 'triangle' | 'diamond' | 'spiral';

export interface Primitive {
  type: PrimitiveType;
  size: number;
  color: string;
  offsetX: number;
  offsetY: number;
  rotation: number;
}

export interface TotemSymbol {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  rotation: number;
  targetRotation: number;
  primitives: Primitive[];
  createdAt: number;
  isMutating: boolean;
  mutationProgress: number;
  isFusing: boolean;
  fuseProgress: number;
  fusePartnerId: number | null;
  isNewBorn: boolean;
  bornProgress: number;
  scale: number;
  targetScale: number;
}

export interface EvolutionStats {
  symbolCount: number;
  mutationCount: number;
  fusionCount: number;
  generation: number;
  eventCounter: number;
}

export type SpeedLevel = 1 | 2 | 5;

export const TRIBAL_COLORS: string[] = [
  '#8b3a3a',
  '#3a6b8b',
  '#6b8b3a',
  '#8b6b3a',
  '#3a8b6b',
  '#6b3a8b',
  '#8b6b3a',
  '#6b6b3a'
];

export const ARENA_RADIUS = 350;
export const FUSION_DISTANCE = 60;
export const MUTATION_RADIUS = 40;
export const MAX_DISTANCE_CHECKS = 50;
export const MIN_SYMBOLS = 30;
export const MAX_SYMBOLS = 80;
export const MIN_SYMBOLS_MOBILE = 30;
export const MAX_SYMBOLS_MOBILE = 50;
export const INITIAL_SYMBOL_COUNT = 50;
export const INITIAL_SYMBOL_COUNT_MOBILE = 30;

export type P5Canvas = p5;
