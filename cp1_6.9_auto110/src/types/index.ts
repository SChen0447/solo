import * as THREE from 'three';

export interface PlateSettings {
  driftSpeed: number;
  upliftAmount: number;
  opacity: number;
}

export interface PlateInfo {
  id: string;
  name: string;
  color: string;
  currentSpeed: number;
  collisionCount: number;
}

export interface CollisionEvent {
  plateAId: string;
  plateBId: string;
  point: THREE.Vector3;
  timestamp: number;
}

export interface RiftData {
  id: string;
  plateAId: string;
  plateBId: string;
  startPoint: THREE.Vector3;
  endPoint: THREE.Vector3;
  width: number;
}

export const PLATE_COLORS: string[] = [
  '#d9534f',
  '#5cb85c',
  '#428bca',
  '#f0ad4e',
  '#5bc0de',
  '#f5a623'
];

export const PLATE_NAMES: string[] = [
  '太平洋板块',
  '亚欧板块',
  '非洲板块',
  '美洲板块',
  '印度洋板块',
  '南极洲板块'
];
