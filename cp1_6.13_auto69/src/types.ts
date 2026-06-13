export type VolcanoState = 'dormant' | 'erupting' | 'cooling';

export interface EruptionProgress {
  percentage: number;
  phase: 'dormant' | 'early' | 'peak' | 'cooling';
}

export interface ParticleData {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  color: { r: number; g: number; b: number };
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  active: boolean;
}
