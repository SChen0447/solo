export interface Point {
  x: number;
  y: number;
}

export type ElementType = 'path' | 'rect' | 'circle' | 'triangle';

export interface SVGElementData {
  id: string;
  type: ElementType;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  points?: Point[];
  d?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  r?: number;
}

export interface IconItem {
  id: string;
  name: string;
  width: number;
  height: number;
  elements: SVGElementData[];
}
