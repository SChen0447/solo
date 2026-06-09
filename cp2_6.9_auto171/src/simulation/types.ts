import * as THREE from 'three';

export interface PlanetState {
  id: number;
  name: string;
  mass: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radius: number;
  color: string;
  inclination: number;
  orbitRadius: number;
  eccentricity: number;
}

export interface SimulationConfig {
  G: number;
  showOrbits: boolean;
  showVelocity: boolean;
  showFieldLines: boolean;
  showGrid: boolean;
  timeScale: number;
}

export interface GravityWave {
  position: THREE.Vector3;
  startTime: number;
  duration: number;
  maxRadius: number;
}

export function getColorForMass(mass: number): string {
  if (mass < 5) return '#00BCD4';
  if (mass < 15) return '#4CAF50';
  if (mass < 30) return '#FF9800';
  return '#F44336';
}

export function getRadiusForMass(mass: number): number {
  const t = (mass - 0.5) / (50 - 0.5);
  return 0.2 + t * 1.8;
}
