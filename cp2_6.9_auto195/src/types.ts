export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  color: string;
  progress: number;
  relatedBooks: string[];
  relationStrength: number[];
  review: string;
}

export interface BookNodePosition {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface ConnectionLineData {
  sourceId: string;
  targetId: string;
  strength: number;
}
