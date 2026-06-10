import * as THREE from 'three';

export interface StratumConfig {
  id: number;
  name: string;
  thickness: number;
  color: string;
  era: string;
}

export interface StratumMesh {
  id: number;
  config: StratumConfig;
  mesh: THREE.Mesh;
  wireframe: THREE.LineSegments;
  topY: number;
  bottomY: number;
  artifacts: ArtifactData[];
}

export interface ArtifactData {
  id: string;
  name: string;
  era: string;
  position: THREE.Vector3;
  stratumId: number;
  stratumName: string;
}

export interface ArtifactMesh {
  data: ArtifactData;
  mesh: THREE.Mesh;
  label: HTMLElement;
}

export interface ControlParams {
  depthSlice: number;
  opacity: number;
  stratumVisibility: Record<number, boolean>;
  sliceMode: boolean;
  sliceZ: number;
  autoRotate: boolean;
}

export interface AppState {
  params: ControlParams;
  strata: StratumMesh[];
  artifacts: ArtifactMesh[];
}
