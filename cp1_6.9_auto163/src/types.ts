export interface Artwork {
  id: string;
  title: string;
  color: string;
  imageData: string;
  createdAt: number;
}

export interface TracePoint {
  x: number;
  y: number;
}

export interface LightTrace {
  id: string;
  artworkId: string;
  points: TracePoint[];
  createdAt: number;
}

export type ViewType = 'exhibition' | 'detail';
