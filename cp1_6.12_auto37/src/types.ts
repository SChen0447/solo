export interface BlockPosition {
  x: number;
  y: number;
  z: number;
}

export interface BlockSize {
  x: number;
  y: number;
  z: number;
}

export interface BlockData {
  id: string;
  position: BlockPosition;
  size: BlockSize;
  color: string;
  rotation: number;
}

export type ActionType = 'add' | 'delete' | 'move' | 'color' | 'rotate';

export interface HistoryAction {
  type: ActionType;
  blocks: BlockData[];
  previousBlocks: BlockData[];
}

export interface BlockTemplate {
  size: BlockSize;
  label: string;
}

export const LEGO_COLORS = [
  '#e53935',
  '#1e88e5',
  '#fdd835',
  '#43a047',
  '#ffffff',
  '#212121',
];

export const BLOCK_TEMPLATES: BlockTemplate[] = [
  { size: { x: 2, y: 1, z: 2 }, label: '2x2' },
  { size: { x: 2, y: 1, z: 4 }, label: '2x4' },
  { size: { x: 2, y: 1, z: 6 }, label: '2x6' },
  { size: { x: 1, y: 1, z: 2 }, label: '1x2' },
  { size: { x: 1, y: 1, z: 4 }, label: '1x4' },
  { size: { x: 1, y: 1, z: 8 }, label: '1x8' },
];

export const UNIT_SIZE = 1;
export const BLOCK_HEIGHT = 1;
