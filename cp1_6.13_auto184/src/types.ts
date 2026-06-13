export interface Point {
  x: number;
  y: number;
}

export type ShapeType = 'rectangle' | 'circle' | 'polygon' | 'svg';
export type BlendMode = 'normal' | 'multiply' | 'screen';

export interface Shape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  points?: Point[];
  svgPath?: string;
}

export interface Layer {
  id: string;
  name: string;
  color: string;
  opacity: number;
  blendMode: BlendMode;
  halftoneDensity: number;
  visible: boolean;
  shapes: Shape[];
  zIndex: number;
}

export interface CanvasState {
  width: number;
  height: number;
  backgroundColor: string;
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface RendererOptions {
  dpi?: number;
  exportMode?: boolean;
}
