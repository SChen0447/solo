export interface Layer {
  id: string;
  type: 'image' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  imageUrl?: string;
  imageElement?: HTMLImageElement;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontColor?: string;
  isEditing?: boolean;
}

export enum ActionType {
  ADD_LAYER = 'ADD_LAYER',
  MOVE_LAYER = 'MOVE_LAYER',
  DELETE_LAYER = 'DELETE_LAYER',
  EDIT_TEXT = 'EDIT_TEXT',
  REORDER_LAYER = 'REORDER_LAYER',
  RESIZE_LAYER = 'RESIZE_LAYER',
  ROTATE_LAYER = 'ROTATE_LAYER',
}

export const MAX_HISTORY = 30;

export const FONT_FAMILIES = [
  { name: 'Noto Sans SC', label: '思源黑体' },
  { name: 'ZCOOL QingKe HuangYou', label: '站酷庆科黄油体' },
  { name: 'Ma Shan Zheng', label: '马善政楷体' },
  { name: 'ZCOOL XiaoWei', label: '站酷小薇体' },
];

export const DEFAULT_TEXT_LAYER: Partial<Layer> = {
  type: 'text',
  text: '双击编辑文字',
  fontFamily: FONT_FAMILIES[0].name,
  fontSize: 24,
  fontColor: '#333333',
  width: 200,
  height: 60,
  rotation: 0,
};
