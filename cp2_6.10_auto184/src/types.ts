export interface Point {
  x: number;
  y: number;
}

export type HoldType = 'hold' | 'anchor';

export interface Hold {
  id: string;
  type: HoldType;
  x: number;
  y: number;
  radius: number;
}

export interface Rope {
  id: string;
  startHoldId: string;
  endHoldId: string;
  segments: Point[];
}

export interface Character {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ropeId: string;
  progress: number;
  trail: Point[];
}

export interface RouteData {
  holds: Hold[];
  ropes: Rope[];
}

export type EditorMode = 'select' | 'hold' | 'anchor' | 'rope';

export interface DragState {
  isDragging: boolean;
  holdId: string | null;
  offsetX: number;
  offsetY: number;
}

export interface RopeCreationState {
  isCreating: boolean;
  startHoldId: string | null;
  mouseX: number;
  mouseY: number;
}
