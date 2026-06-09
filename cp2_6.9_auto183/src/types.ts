export interface Point2D {
  x: number;
  y: number;
}

export interface Vertex3D {
  x: number;
  y: number;
  z: number;
}

export interface ProjectedVertex {
  x: number;
  y: number;
  z: number;
  depth: number;
}

export type GlazeColorId = '#70B8C0' | '#C04040' | '#2A2A2A';

export interface GlazeInfo {
  color: string;
  thickness: number;
}

export interface ShapeData {
  height: number;
  radii: number[];
  heightSegments: number;
  radialSegments: number;
  viewAngle: number;
  targetViewAngle: number;
  glazeMap: Map<number, GlazeInfo>;
  baseColor: string;
  isGlazing: boolean;
  selectedGlazeColor: string | null;
  glazeThickness: number;
  animationTime: number;
  ripples: RippleEffect[];
}

export interface RippleEffect {
  heightIndex: number;
  startTime: number;
  duration: number;
  color: string;
  thickness: number;
}

export interface MouseState {
  isDragging: boolean;
  lastX: number;
  lastY: number;
  lastMoveTime: number;
  velocityX: number;
  velocityY: number;
}
