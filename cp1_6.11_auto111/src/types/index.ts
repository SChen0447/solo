export const CLASSIC_8BIT_COLORS = [
  '#000000',
  '#ffffff',
  '#ff0044',
  '#ffa500',
  '#ffff00',
  '#00ff44',
  '#00aaff',
  '#4444ff',
  '#ff44ff',
  '#8b4513',
  '#808080',
  '#c0c0c0'
];

export const CANVAS_SIZE = 32;
export const CARD_SIZE = 128;
export const CARD_GAP = 10;
export const CELL_SIZE = CARD_SIZE + CARD_GAP;

export type PixelData = string[][];

export interface PixelCard {
  id: string;
  authorId: string;
  authorName: string;
  pixelData: PixelData;
  likes: number;
  createdAt: number;
  gridX: number;
  gridY: number;
}

export interface User {
  id: string;
  name: string;
}

export interface Danmaku {
  id: string;
  text: string;
  color: string;
  duration: number;
  top: number;
  createdAt: number;
}
