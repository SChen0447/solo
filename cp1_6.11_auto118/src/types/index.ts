export type ShapeType = 'line' | 'curve' | 'rect' | 'circle';

export interface Point {
  x: number;
  y: number;
}

export interface Shape {
  id: string;
  type: ShapeType;
  color: string;
  strokeWidth: number;
  points?: Point[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  startPoint?: Point;
  endPoint?: Point;
  controlPoint1?: Point;
  controlPoint2?: Point;
}

export interface Note {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  text: string;
}

export interface User {
  id: string;
  socketId?: string;
  name: string;
  color: string;
}

export interface CanvasState {
  shapes: Shape[];
  notes: Note[];
}

export type ToolType = 'select' | 'line' | 'curve' | 'rect' | 'circle' | 'pan';

export interface HistoryAction {
  type: string;
  data: any;
  timestamp: number;
}

export const NOTE_COLORS = [
  '#ff6b6b',
  '#ffd93d',
  '#6bcb77',
  '#4d96ff',
  '#ff8fab',
  '#a66cff',
  '#00b4d8',
  '#e0e1dd',
];

export const COLOR_PALETTE = [
  '#ffffff', '#000000', '#ff6b6b', '#ffd93d',
  '#6bcb77', '#4d96ff', '#ff8fab', '#a66cff',
  '#00b4d8', '#e0e1dd', '#ff9f43', '#1dd1a1',
];
