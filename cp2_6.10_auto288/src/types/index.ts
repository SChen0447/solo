import * as THREE from 'three';

export interface VentInfo {
  id: string;
  name: string;
  depth: number;
  temperature: number;
  description: string;
}

export interface SpeciesInfo {
  id: string;
  name: string;
  type: 'tubeWorm' | 'blindShrimp' | 'giantClam' | 'ventCrab' | 'snail';
  depth: string;
  temperature: string;
  description: string;
}

export type InfoData = VentInfo | SpeciesInfo;

export interface VentData {
  position: THREE.Vector3;
  info: VentInfo;
  mesh: THREE.Group;
  light: THREE.PointLight;
  particleSystem: THREE.Points;
  particleVelocities: Float32Array;
  particleLifetimes: Float32Array;
}

export interface CreatureData {
  id: string;
  info: SpeciesInfo;
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  ventId: string;
}
