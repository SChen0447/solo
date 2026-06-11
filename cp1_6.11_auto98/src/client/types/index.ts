export interface Point {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
}

export interface StrokeData {
  points: Point[];
  color: string;
  width: number;
}

export type SealType = 'flower' | 'tree' | 'star' | 'wind';

export interface SealData {
  type: SealType;
  x: number;
  y: number;
  scale: number;
}

export interface StampPosition {
  stampId: string;
  x: number;
  y: number;
}

export interface LetterData {
  id: string;
  fromUserId: string;
  toUserId: string;
  paperColor: string;
  inkColor: string;
  strokes: StrokeData[];
  stamp?: StampPosition;
  seal?: SealData;
  createdAt: number;
  read: boolean;
  forwardCount: number;
}

export interface StampData {
  id: string;
  type: string;
  country: string;
  year: number;
  color: string;
  name: string;
}

export interface UserData {
  id: string;
  socketId: string;
  online: boolean;
  stamps: string[];
  lettersSent: number;
  lastLogin: number;
}

export type PaperColor = 'beige' | 'pink' | 'blue' | 'mint' | 'gray';

export const PAPER_COLORS: Record<PaperColor, string> = {
  beige: '#f5f0e1',
  pink: '#fce4ec',
  blue: '#e3f2fd',
  mint: '#e8f5e9',
  gray: '#eceff1'
};

export const INK_COLORS = {
  brown: '#3e2723',
  black: '#1a1a1a'
};

export const SEAL_TYPES: SealType[] = ['flower', 'tree', 'star', 'wind'];

export const STAMP_TEMPLATES: Omit<StampData, 'id'>[] = [
  { type: 'japan', country: 'Japan', year: 1970, color: '#d32f2f', name: '樱花' },
  { type: 'uk', country: 'UK', year: 1965, color: '#1976d2', name: '女王头像' },
  { type: 'usa', country: 'USA', year: 1980, color: '#388e3c', name: '自由女神' },
  { type: 'france', country: 'France', year: 1975, color: '#c2185b', name: '埃菲尔铁塔' },
  { type: 'china', country: 'China', year: 1990, color: '#f57c00', name: '长城' },
  { type: 'germany', country: 'Germany', year: 1985, color: '#7b1fa2', name: '天鹅堡' }
];
