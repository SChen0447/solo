export type GridType = 'square' | 'hexagon';

export type PassType = 'passable' | 'blocked' | 'oneway';

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface TileColor {
  key: string;
  value: string;
  name: string;
}

export interface Tile {
  row: number;
  col: number;
  color: string;
  label: string;
  passType: PassType;
  onewayDirection?: Direction;
  isStart?: boolean;
  isEnd?: boolean;
}

export interface GridConfig {
  type: GridType;
  rows: number;
  cols: number;
  tileSize: number;
}

export interface PieceColor {
  key: string;
  value: string;
  name: string;
}

export interface Piece {
  id: string;
  color: string;
  colorKey: string;
  row: number;
  col: number;
  prevRow?: number;
  prevCol?: number;
  steps: number;
  visitedTiles: Set<string>;
  repeatVisits: number;
  path: Array<{ row: number; col: number; timestamp: number }>;
  alive: boolean;
}

export interface PieceStats {
  id: string;
  color: string;
  colorKey: string;
  steps: number;
  visitedCount: number;
  repeatVisits: number;
  coverageRate: number;
}

export interface TileVisitInfo {
  tileKey: string;
  totalVisits: number;
  lastVisitorColor: string | null;
  visitByPiece: Map<string, number>;
}

export interface Snapshot {
  id: string;
  timestamp: number;
  tileMap: Tile[][];
  pieces: Piece[];
  thumbnailDataUrl: string;
}

export interface HighlightPath {
  path: Array<{ row: number; col: number }>;
  targetRow: number;
  targetCol: number;
  distance: number;
}

export const PRESET_COLORS: TileColor[] = [
  { key: 'danger', value: '#ff6b6b', name: '危险区' },
  { key: 'safe', value: '#51cf66', name: '安全区' },
  { key: 'treasure', value: '#ffd43b', name: '宝箱' },
  { key: 'start', value: '#339af0', name: '起点' },
  { key: 'end', value: '#cc5de8', name: '终点' },
  { key: 'neutral', value: '#868e96', name: '中立' }
];

export const PIECE_COLORS: PieceColor[] = [
  { key: 'red', value: '#e74c3c', name: '红' },
  { key: 'blue', value: '#3498db', name: '蓝' },
  { key: 'green', value: '#2ecc71', name: '绿' },
  { key: 'yellow', value: '#f1c40f', name: '黄' }
];
