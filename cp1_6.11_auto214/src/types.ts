export type DanceType = 'figure8' | 'round';

export type GamePhase = 'watching' | 'guessing' | 'result' | 'transition';

export type DistanceCategory = 'near' | 'far';

export interface DanceInfo {
  danceType: DanceType;
  waggleAngle: number;
  stepFrequency: number;
  distanceCategory: DistanceCategory;
  nectarGridX: number;
  nectarGridY: number;
  nectarPixelX: number;
  nectarPixelY: number;
}

export interface HoneyColor {
  id: string;
  name: string;
  color: string;
  unlocked: boolean;
  unlockScore: number;
}

export interface NectarSource {
  id: string;
  gridX: number;
  gridY: number;
  pixelX: number;
  pixelY: number;
  unlocked: boolean;
}

export interface QueenDance extends DanceInfo {
  pathColor: string;
  isCorrect: boolean;
}
