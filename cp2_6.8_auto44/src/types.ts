export type EasingType = 'cubic-bezier' | 'steps' | 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'step-start' | 'step-end';

export interface EasingConfig {
  id: string;
  name: string;
  type: EasingType;
  p1x?: number;
  p1y?: number;
  p2x?: number;
  p2y?: number;
  steps?: number;
  stepPosition?: 'start' | 'end';
  color: string;
}

export interface CustomBezier {
  p1x: number;
  p1y: number;
  p2x: number;
  p2y: number;
}

export const PRESET_EASINGS: Omit<EasingConfig, 'id' | 'color'>[] = [
  { name: 'ease', type: 'ease' },
  { name: 'linear', type: 'linear' },
  { name: 'ease-in', type: 'ease-in' },
  { name: 'ease-out', type: 'ease-out' },
  { name: 'ease-in-out', type: 'ease-in-out' },
  { name: 'step-start', type: 'step-start' },
  { name: 'step-end', type: 'step-end' },
  { name: 'steps(4, end)', type: 'steps', steps: 4, stepPosition: 'end' },
];

export const COLOR_PALETTE = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];

export const BEZIER_MAP: Record<string, { p1x: number; p1y: number; p2x: number; p2y: number }> = {
  ease: { p1x: 0.25, p1y: 0.1, p2x: 0.25, p2y: 1 },
  linear: { p1x: 0, p1y: 0, p2x: 1, p2y: 1 },
  'ease-in': { p1x: 0.42, p1y: 0, p2x: 1, p2y: 1 },
  'ease-out': { p1x: 0, p1y: 0, p2x: 0.58, p2y: 1 },
  'ease-in-out': { p1x: 0.42, p1y: 0, p2x: 0.58, p2y: 1 },
};
