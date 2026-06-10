export interface DataGroup {
  id: string;
  label: string;
  percentage: number;
  color: string;
}

export type ChartMode = 'pie' | 'donut';

export interface ChartConfig {
  groups: DataGroup[];
  mode: ChartMode;
  centerText: string;
}

export interface ChartAnimationState {
  progress: number;
  fromMode: ChartMode;
  toMode: ChartMode;
  isAnimating: boolean;
}
