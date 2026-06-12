export type ElementType = 'fire' | 'water' | 'earth' | 'air';

export type ParticleType = 
  | ElementType 
  | 'steam' 
  | 'lava' 
  | 'mud' 
  | 'explosion' 
  | 'ice' 
  | 'energyBall'
  | 'shockwave';

export interface Particle {
  id: number;
  type: ParticleType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  life: number;
  maxLife: number;
  createdAt: number;
  frozen: boolean;
  frozenUntil: number;
  rotation: number;
  collecting: boolean;
  collectStartTime: number;
}

export interface Shockwave {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  startTime: number;
  duration: number;
}

export interface ReactionResult {
  type: ParticleType | null;
  x: number;
  y: number;
  removeParticles: number[];
  spawnEnergyBall: boolean;
  additionalParticles?: Particle[];
}

export interface ChainReactionState {
  isActive: boolean;
  reactionCount: number;
  lastReactionTime: number;
  firstReactionX: number;
  firstReactionY: number;
  lastReactionX: number;
  lastReactionY: number;
}

export interface GameState {
  energy: number;
  selectedElement: ElementType;
  isMouseDown: boolean;
  mouseX: number;
  mouseY: number;
  chainReaction: ChainReactionState;
}

export interface SpatialHashGrid {
  cellSize: number;
  cells: Map<string, number[]>;
}

export interface ReactionRule {
  result: ParticleType;
  producesEnergy: boolean;
  additionalParticleCount?: number;
  additionalParticleType?: ParticleType;
}
