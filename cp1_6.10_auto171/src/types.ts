export interface Point {
  x: number;
  y: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  scale: number;
  scaleSpeed: number;
  opacity: number;
  life: number;
  maxLife: number;
  curveOffset: number;
  curveSpeed: number;
}

export interface MemoryCard {
  id: number;
  x: number;
  y: number;
  vy: number;
  targetX: number;
  year: number;
  phrase: string;
  width: number;
  height: number;
  fallProgress: number;
  isCollected: boolean;
  collectProgress: number;
  collectStartX: number;
  collectStartY: number;
  collectTargetX: number;
  collectTargetY: number;
  swayOffset: number;
  swaySpeed: number;
}

export interface CollectedCard {
  id: number;
  year: number;
  phrase: string;
  thumbnailX: number;
}

export interface Note {
  id: number;
  x: number;
  y: number;
  vy: number;
  symbol: string;
  opacity: number;
  life: number;
  maxLife: number;
}

export interface RadioState {
  knobAngle: number;
  targetKnobAngle: number;
  frequency: number;
  isDragging: boolean;
}

export type CardPhase = 'falling' | 'collecting' | 'collected';
