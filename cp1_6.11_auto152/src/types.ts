export interface ScentNote {
  id: string;
  name: string;
  category: 'top' | 'middle' | 'base';
  color: string;
  particleShape: string;
  particleColor: string;
  particleSize: number;
}

export interface ScentPercentage {
  noteId: string;
  percentage: number;
}

export interface CandleRecipe {
  id: string;
  name: string;
  waxColor: string;
  scents: ScentPercentage[];
  burnDuration: number;
  currentColor: string;
}

export interface CandleState {
  id: string;
  name: string;
  isBurning: boolean;
  burnTime: number;
  meltLevel: number;
  currentColor: string;
  waxColor: string;
  scents: ScentPercentage[];
}

export interface SaveData {
  id: string;
  name: string;
  waxColor: string;
  scents: ScentPercentage[];
  burnDuration: number;
  currentColor: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  opacity: number;
  shape: string;
  createdAt: number;
  lifespan: number;
}
