export interface AnnotationPoint {
  x: number;
  y: number;
}

export interface Annotation {
  id: string;
  color: string;
  thickness: number;
  opacity: number;
  points: AnnotationPoint[];
}

export interface PageAnnotations {
  [pageNumber: number]: Annotation[];
}

export type BrushColor = '#1a1a1a' | '#c0392b' | '#2980b9' | '#f39c12' | '#8e44ad';
export type BrushThickness = 1 | 2 | 4;
