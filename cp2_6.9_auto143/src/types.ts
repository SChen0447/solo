export interface WordCard {
  id: string;
  text: string;
}

export interface PlacedWord {
  id: string;
  text: string;
  gridX: number;
  gridY: number;
  rotation: number;
  scale: number;
  opacity: number;
  zIndex: number;
}

export interface GridCell {
  x: number;
  y: number;
  occupied: boolean;
  wordId: string | null;
}

export interface HistoryState {
  placedWords: PlacedWord[];
  nextZIndex: number;
}

export type HistoryAction =
  | { type: 'PLACE'; word: PlacedWord }
  | { type: 'MOVE'; wordId: string; fromX: number; fromY: number; toX: number; toY: number }
  | { type: 'UPDATE'; wordId: string; before: Partial<PlacedWord>; after: Partial<PlacedWord> }
  | { type: 'CLEAR'; words: PlacedWord[] };

export interface DragState {
  isDragging: boolean;
  type: 'new' | 'existing' | null;
  wordId: string | null;
  text: string;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
}

export const GRID_COLS = 26;
export const GRID_ROWS = 26;
export const CELL_SIZE = 40;
export const MAX_HISTORY = 10;

export const DEFAULT_WORD_POOL = [
  '月光', '星辰', '海风', '流云', '细雨',
  '青山', '白雾', '桃花', '流水', '夕阳',
  '晨曦', '暮色', '秋思', '春意', '冬雪',
  '夏蝉', '时光', '流年', '浮生', '尘梦',
  '清风', '孤影', '残月', '落花', '涟漪',
  '幽梦', '烟波', '寒江', '晚钟', '渔火',
  '古道', '西风', '瘦马', '小桥', '人家',
  '山河', '故人', '鸿雁', '锦鲤', '青鸾'
];
