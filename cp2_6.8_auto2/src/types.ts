export type ToolType = 'pen' | 'rectangle' | 'circle' | 'text';

export interface Point {
  x: number;
  y: number;
}

export interface BaseElement {
  id: string;
  type: string;
  color: string;
  strokeWidth: number;
  userId: string;
}

export interface PenElement extends BaseElement {
  type: 'pen';
  points: Point[];
}

export interface RectangleElement extends BaseElement {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleElement extends BaseElement {
  type: 'circle';
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
}

export type CanvasElement = PenElement | RectangleElement | CircleElement | TextElement;

export type ClientToServerEvents = {
  draw: (element: CanvasElement) => void;
  clear: () => void;
  syncRequest: () => void;
  undo: (elementId: string) => void;
  redo: (element: CanvasElement) => void;
  pong: () => void;
};

export type ServerToClientEvents = {
  draw: (element: CanvasElement) => void;
  clear: () => void;
  sync: (elements: CanvasElement[]) => void;
  undo: (elementId: string) => void;
  redo: (element: CanvasElement) => void;
  ping: () => void;
  userJoined: (userId: string) => void;
  userLeft: (userId: string) => void;
};
