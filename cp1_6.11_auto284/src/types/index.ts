export type ArrangementType = 'array' | 'staggered' | 'cluster';

export interface GreeneryConfig {
  greenArea: number;
  treeHeight: number;
  arrangement: ArrangementType;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  alive: boolean;
  captured: boolean;
  age: number;
  trail: { x: number; y: number; z: number }[];
}

export interface Building {
  id: number;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
}

export interface TreeData {
  id: number;
  x: number;
  z: number;
  height: number;
  trunkRadius: number;
  crownRadius: number;
  crownHeight: number;
}

export interface SimStats {
  totalConcentration: number;
  captureEfficiency: number;
  totalParticles: number;
  capturedParticles: number;
}

export interface WindField {
  getWindAt: (x: number, y: number, z: number) => { vx: number; vy: number; vz: number };
}
