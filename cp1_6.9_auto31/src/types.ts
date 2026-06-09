export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
}

export interface Stroke {
  id: string;
  points: StrokePoint[];
  color: string;
}

export interface Sticker {
  id: string;
  type: string;
  category: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

export interface JournalData {
  date: string;
  strokes: Stroke[];
  stickers: Sticker[];
  updatedAt?: string;
}

export interface User {
  username: string;
  token: string;
}
