export type ToolType = 'pen' | 'rect' | 'circle' | 'text' | 'select';

export interface Point {
  x: number;
  y: number;
}

export interface BaseElement {
  id: string;
  type: 'pen' | 'rect' | 'circle' | 'text';
  color: string;
  strokeWidth: number;
}

export interface PenElement extends BaseElement {
  type: 'pen';
  points: Point[];
}

export interface RectElement extends BaseElement {
  type: 'rect';
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

export type CanvasElement = PenElement | RectElement | CircleElement | TextElement;

export interface UserInfo {
  id: string;
  name: string;
}

export type HistoryAction =
  | { type: 'add'; element: CanvasElement }
  | { type: 'update'; before: CanvasElement; after: CanvasElement }
  | { type: 'delete'; element: CanvasElement };
