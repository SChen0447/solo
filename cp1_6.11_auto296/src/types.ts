import { z } from 'zod';

export interface MixFormula {
  id: string;
  volcanicAshRatio: number;
  aggregateDiameter: number;
  waterCementRatio: number;
  timestamp: number;
}

export interface TestResult {
  formulaId: string;
  compressiveStrength: number;
  elasticModulus: number;
  porosity: number;
  crackTotalLength: number;
  brittlenessIndex: number;
}

export interface CrackPoint {
  x: number;
  y: number;
}

export interface CrackBranch {
  id: string;
  points: CrackPoint[];
  width: number;
}

export interface CrackData {
  branches: CrackBranch[];
  totalLength: number;
}

export interface ForceFieldPoint {
  x: number;
  y: number;
  stress: number;
}

export interface ForceField {
  points: ForceFieldPoint[];
  gradient: string[];
}

export interface MicroParticle {
  x: number;
  y: number;
  diameter: number;
  color: string;
  rotation: number;
}

export interface MicroCrack {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
}

export interface MicroStructure {
  particles: MicroParticle[];
  cracks: MicroCrack[];
  matrixColor: string;
}

export interface MixingParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

export interface HistoryEntry {
  id: string;
  formula: MixFormula;
  result: TestResult;
  timestamp: number;
}

export interface AppState {
  currentFormula: MixFormula;
  currentResult: TestResult | null;
  isMixing: boolean;
  isLoading: boolean;
  showMicroscope: boolean;
  showCracks: boolean;
  domeDeformation: number;
  history: HistoryEntry[];
  playingHistoryId: string | null;
  showGoldParticles: boolean;
  stressAreaPosition: { x: number; y: number; z: number } | null;
}

export const MixFormulaSchema = z.object({
  id: z.string(),
  volcanicAshRatio: z.number().min(10).max(60),
  aggregateDiameter: z.number().min(3).max(20),
  waterCementRatio: z.number().min(0.3).max(0.6),
  timestamp: z.number(),
});

export const TestResultSchema = z.object({
  formulaId: z.string(),
  compressiveStrength: z.number(),
  elasticModulus: z.number(),
  porosity: z.number(),
  crackTotalLength: z.number(),
  brittlenessIndex: z.number().min(0).max(1),
});
