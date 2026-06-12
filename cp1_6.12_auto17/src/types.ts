export type ToolType = 'pen' | 'rectangle' | 'circle';

export interface Point {
  x: number;
  y: number;
}

export interface BaseShape {
  id: string;
  userId: string;
  tool: ToolType;
  strokeColor: string;
  strokeWidth: number;
  fillColor?: string;
  timestamp: number;
}

export interface PenShape extends BaseShape {
  tool: 'pen';
  points: Point[];
}

export interface RectangleShape extends BaseShape {
  tool: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleShape extends BaseShape {
  tool: 'circle';
  cx: number;
  cy: number;
  radius: number;
}

export type Shape = PenShape | RectangleShape | CircleShape;

export type WSMessageType =
  | 'draw'
  | 'undo'
  | 'redo'
  | 'clear'
  | 'init'
  | 'sync';

export interface WSMessage {
  type: WSMessageType;
  userId: string;
  payload?: unknown;
}

export interface DrawMessage extends WSMessage {
  type: 'draw';
  payload: Shape;
}

export interface UndoMessage extends WSMessage {
  type: 'undo';
  payload: { shapeId: string };
}

export interface RedoMessage extends WSMessage {
  type: 'redo';
  payload: Shape;
}

export interface ClearMessage extends WSMessage {
  type: 'clear';
}
