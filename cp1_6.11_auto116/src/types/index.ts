export type LayerType = 'sticker' | 'photo' | 'text' | 'drawing';

export type FilterType = 'none' | 'vintage' | 'faded' | 'grain';

export type BrushType = 'ballpoint' | 'marker' | 'brush';

export type StickerCategory = 'stamp' | 'plant' | 'polka' | 'geometric' | 'label';

export interface Sticker {
  id: string;
  name: string;
  category: StickerCategory;
  emoji: string;
  defaultColor: string;
}

export interface BaseLayer {
  id: string;
  type: LayerType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  filter: FilterType;
}

export interface StickerLayer extends BaseLayer {
  type: 'sticker';
  stickerId: string;
  emoji: string;
  color: string;
}

export interface TextLayer extends BaseLayer {
  type: 'text';
  content: string;
  fontSize: number;
  fontFamily: string;
  color: string;
}

export interface PhotoLayer extends BaseLayer {
  type: 'photo';
  imageUrl: string;
  brightness: number;
  contrast: number;
}

export interface DrawingPath {
  points: { x: number; y: number }[];
  brushType: BrushType;
  color: string;
  isStraightLine: boolean;
}

export interface DrawingLayer extends BaseLayer {
  type: 'drawing';
  paths: DrawingPath[];
}

export type Layer = StickerLayer | TextLayer | PhotoLayer | DrawingLayer;

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface EditPanelState {
  visible: boolean;
  layerId: string | null;
  position: ContextMenuPosition;
}

export const BRUSH_SIZES: Record<BrushType, number> = {
  ballpoint: 1,
  marker: 4,
  brush: 8,
};

export const BRUSH_ICONS: Record<BrushType, string> = {
  ballpoint: '✏️',
  marker: '🖊️',
  brush: '🖌️',
};

export const BRUSH_NAMES: Record<BrushType, string> = {
  ballpoint: '圆珠笔',
  marker: '记号笔',
  brush: '毛笔',
};

export const COLOR_PALETTE = [
  '#8b4513',
  '#a52a2a',
  '#2f4f4f',
  '#556b2f',
  '#b8860b',
  '#4a3728',
  '#8b7355',
  '#d4a574',
  '#6b4423',
  '#8b0000',
  '#191970',
  '#2e8b57',
];

export const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'none', label: '无滤镜' },
  { value: 'vintage', label: '老照片' },
  { value: 'faded', label: '褪色' },
  { value: 'grain', label: '胶片颗粒' },
];

export const STICKER_CATEGORIES: { value: StickerCategory; label: string }[] = [
  { value: 'stamp', label: '复古邮票' },
  { value: 'plant', label: '手绘植物' },
  { value: 'polka', label: '波点图案' },
  { value: 'geometric', label: '几何图形' },
  { value: 'label', label: '文字标签' },
];

export const STICKERS: Sticker[] = [
  { id: 'stamp-1', name: '复古邮票1', category: 'stamp', emoji: '📮', defaultColor: '#8b4513' },
  { id: 'stamp-2', name: '复古邮票2', category: 'stamp', emoji: '✉️', defaultColor: '#a52a2a' },
  { id: 'stamp-3', name: '复古邮票3', category: 'stamp', emoji: '📨', defaultColor: '#2f4f4f' },
  { id: 'stamp-4', name: '复古邮票4', category: 'stamp', emoji: '📯', defaultColor: '#556b2f' },
  { id: 'plant-1', name: '手绘植物1', category: 'plant', emoji: '🌿', defaultColor: '#556b2f' },
  { id: 'plant-2', name: '手绘植物2', category: 'plant', emoji: '🍃', defaultColor: '#2e8b57' },
  { id: 'plant-3', name: '手绘植物3', category: 'plant', emoji: '🌱', defaultColor: '#556b2f' },
  { id: 'plant-4', name: '手绘植物4', category: 'plant', emoji: '🌾', defaultColor: '#b8860b' },
  { id: 'polka-1', name: '波点图案1', category: 'polka', emoji: '⚪', defaultColor: '#8b7355' },
  { id: 'polka-2', name: '波点图案2', category: 'polka', emoji: '🔴', defaultColor: '#a52a2a' },
  { id: 'polka-3', name: '波点图案3', category: 'polka', emoji: '🔵', defaultColor: '#2f4f4f' },
  { id: 'polka-4', name: '波点图案4', category: 'polka', emoji: '🟤', defaultColor: '#8b4513' },
  { id: 'geometric-1', name: '几何图形1', category: 'geometric', emoji: '⬛', defaultColor: '#4a3728' },
  { id: 'geometric-2', name: '几何图形2', category: 'geometric', emoji: '🔶', defaultColor: '#d4a574' },
  { id: 'geometric-3', name: '几何图形3', category: 'geometric', emoji: '🔷', defaultColor: '#191970' },
  { id: 'geometric-4', name: '几何图形4', category: 'geometric', emoji: '💎', defaultColor: '#2f4f4f' },
  { id: 'label-1', name: '文字标签1', category: 'label', emoji: '📌', defaultColor: '#8b0000' },
  { id: 'label-2', name: '文字标签2', category: 'label', emoji: '🏷️', defaultColor: '#b8860b' },
  { id: 'label-3', name: '文字标签3', category: 'label', emoji: '📝', defaultColor: '#6b4423' },
  { id: 'label-4', name: '文字标签4', category: 'label', emoji: '🎀', defaultColor: '#a52a2a' },
];

export const MAX_LAYERS = 30;
export const MIN_SCALE = 0.3;
export const MAX_SCALE = 2.0;
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
