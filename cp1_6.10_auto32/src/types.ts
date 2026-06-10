import * as THREE from 'three';

export interface ParticleData {
  originalPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  baseSize: number;
  baseColor: THREE.Color;
  warmColorMix: number;
  phaseOffset: number;
  floatAmplitude: number;
  floatSpeed: number;
}

export interface SceneConfig {
  particleCount: number;
  galaxyRadius: number;
  galaxyThickness: number;
  rotationSpeed: number;
  gravityRadius: number;
  gravityStrength: number;
  damping: number;
  elasticity: number;
  minZoom: number;
  maxZoom: number;
  cameraSmoothing: number;
}

export const DEFAULT_CONFIG: SceneConfig = {
  particleCount: 5000,
  galaxyRadius: 150,
  galaxyThickness: 30,
  rotationSpeed: 0.0003,
  gravityRadius: 100,
  gravityStrength: 8.0,
  damping: 0.85,
  elasticity: 0.05,
  minZoom: 20,
  maxZoom: 500,
  cameraSmoothing: 0.1,
};
