export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export type CreaseType = 'mountain' | 'valley';

export interface Crease {
  id: string;
  start: Point2D;
  end: Point2D;
  angle: number;
  type: CreaseType;
  cornerIndex?: number;
}

export interface TemplateStep {
  id: number;
  description: string;
  crease: Crease;
  duration: number;
}

export interface Template {
  id: string;
  name: string;
  nameEn: string;
  steps: TemplateStep[];
}

export type CornerName = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

export interface DragState {
  isDragging: boolean;
  cornerIndex: number | null;
  startPoint: Point2D | null;
  currentPoint: Point2D | null;
}

export interface PaperState {
  baseColor: string;
  creases: Crease[];
  foldProgress: number;
  isFolding: boolean;
  rotation: number;
  breathScale: number;
}

export const PAPER_SIZE = 400;

export const CORNER_POSITIONS: Record<CornerName, Point2D> = {
  topLeft: { x: 0, y: 0 },
  topRight: { x: PAPER_SIZE, y: 0 },
  bottomLeft: { x: 0, y: PAPER_SIZE },
  bottomRight: { x: PAPER_SIZE, y: PAPER_SIZE },
};

export const CORNER_NAMES: CornerName[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];

export const PAPER_COLORS = [
  { color: '#f5f0e1', name: '浅米色' },
  { color: '#e8d5b7', name: '羊皮纸色' },
  { color: '#d7ccc8', name: '灰褐色' },
  { color: '#efebe9', name: '暖白色' },
  { color: '#fff8e1', name: '淡黄色' },
  { color: '#fce4ec', name: '淡粉色' },
  { color: '#e1f5fe', name: '淡蓝色' },
];
