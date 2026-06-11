import * as THREE from 'three';

export interface GenotypeParams {
  branchDensity: number;
  spiralAngle: number;
  branchLength: number;
  recursionDepth: number;
  colorVariation: number;
  stemTwist: number;
  tipBulge: number;
  growthSpeed: number;
}

export interface BranchNode {
  id: string;
  level: number;
  position: THREE.Vector3;
  endPosition: THREE.Vector3;
  direction: THREE.Vector3;
  length: number;
  radius: number;
  color: THREE.Color;
  children: BranchNode[];
  isTip: boolean;
}

export interface PresetConfig {
  name: string;
  params: Partial<GenotypeParams>;
  gradient: { bottom: string; top: string };
}

export const DEFAULT_PARAMS: GenotypeParams = {
  branchDensity: 1.0,
  spiralAngle: 45,
  branchLength: 1.0,
  recursionDepth: 4,
  colorVariation: 0.3,
  stemTwist: 2,
  tipBulge: 1.0,
  growthSpeed: 1.5
};

export const DEFAULT_GRADIENT = {
  bottom: '#3b0a45',
  top: '#ff6b35'
};
