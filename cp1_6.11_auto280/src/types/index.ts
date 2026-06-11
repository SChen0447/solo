export type ElementType = 'fire' | 'water' | 'earth' | 'air';
export type MaterialShape = 'circle' | 'square' | 'diamond';

export interface Material {
  id: string;
  name: string;
  element: ElementType;
  color: string;
  shape: MaterialShape;
  resonanceFrequency: number;
  resonanceThreshold: number;
}

export interface RecipeMaterial {
  materialId: string;
  position: { x: number; y: number };
}

export interface OperationParams {
  temperature: number;
  stirSpeed: number;
  cooling: boolean;
  duration: number;
}

export interface Recipe {
  id: string;
  materials: RecipeMaterial[];
  operations: OperationParams;
  success: boolean;
  createdAt: Date;
  userId?: string;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  type: 'success' | 'smoke' | 'bubble';
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  requiredCount: number;
  unlocked: boolean;
  unlockedAt?: Date;
}

export interface AlchemyState {
  crucibleMaterials: RecipeMaterial[];
  temperature: number;
  stirSpeed: number;
  cooling: boolean;
  isResonating: boolean;
  resonatingMaterialIds: string[];
  synthesisResult: 'idle' | 'success' | 'fail' | 'processing';
  duration: number;
  successCount: number;
}
