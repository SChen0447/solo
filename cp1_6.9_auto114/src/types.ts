export interface RuneFragment {
  id: number;
  x: number;
  y: number;
  initialX: number;
  initialY: number;
  radius: number;
  color: string;
  rotation: number;
  targetRotation: number;
  scale: number;
  pulsePhase: number;
  isHovered: boolean;
  isConnected: boolean;
  isUnlocking: boolean;
  unlockProgress: number;
  flashAlpha: number;
  flashCount: number;
  disappearProgress: number;
  hasDisappeared: boolean;
}

export interface Connection {
  fromId: number;
  toId: number;
  color: string;
  alpha: number;
  fadeProgress: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  color: string;
  timestamp: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  progress: number;
}

export interface PatternDef {
  id: string;
  name: string;
  pointCount: number;
  points: { x: number; y: number }[];
}

export interface TreeBranch {
  x: number;
  y: number;
  angle: number;
  length: number;
  depth: number;
  progress: number;
  children: TreeBranch[];
  hasChildren: boolean;
}

export type GameState = 'playing' | 'victory';
