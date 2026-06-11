export interface Point {
  x: number;
  y: number;
}

export interface Material {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export type ElementType = 'fire' | 'water' | 'earth' | 'wind';

export interface SaveData {
  runePoints: Point[][];
  materials: string[];
  potionColor: string;
  element: ElementType | null;
  timestamp: number;
}

export interface RuneStroke {
  points: Point[];
}
