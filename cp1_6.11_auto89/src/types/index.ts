export interface ColorStop {
  id: string;
  color: string;
  position: number;
}

export interface PaletteItem {
  id: string;
  colorStops: ColorStop[];
  angle: number;
  thumbnail: string;
  createdAt: number;
}

export type ShapeType = 'circle' | 'rect' | 'hexagon';

export interface GradientData {
  colorStops: ColorStop[];
  angle: number;
}
