import * as THREE from 'three';

export type VehicleType = 'car' | 'bus';
export type LightColor = 'red' | 'yellow' | 'green';

export interface Vehicle {
  id: number;
  type: VehicleType;
  position: THREE.Vector3;
  velocity: number;
  maxVelocity: number;
  color: number;
  lane: number;
  direction: 'north' | 'south' | 'east' | 'west';
  mesh: THREE.Group;
  stopState: boolean;
  brakeLightDuration: number;
  waitTime: number;
  isWaiting: boolean;
  acceleration: number;
}

export interface TrafficLight {
  id: number;
  position: THREE.Vector3;
  currentColor: LightColor;
  timer: number;
  manualMode: boolean;
  direction: 'horizontal' | 'vertical';
  mesh: THREE.Group;
  redLight: THREE.Mesh;
  yellowLight: THREE.Mesh;
  greenLight: THREE.Mesh;
  glowMesh: THREE.Mesh;
}

export interface RoadNetwork {
  trafficLights: TrafficLight[];
}
