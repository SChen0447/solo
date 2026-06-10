export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Panel {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  imageData: HTMLImageElement | null;
  imageSrc: string;
  cropRect: CropRect | null;
  originalWidth: number;
  originalHeight: number;
}

export interface LayoutConfig {
  gap: number;
  padding: number;
  direction: 'horizontal' | 'vertical';
  autoHeight: boolean;
}

export interface ExportTemplate {
  id: string;
  name: string;
  width: number;
  height: number;
  description: string;
}

export const EXPORT_TEMPLATES: ExportTemplate[] = [
  {
    id: 'vertical-strip',
    name: '竖长条 (1080×auto)',
    width: 1080,
    height: 0,
    description: '适合手机阅读的竖长条图'
  },
  {
    id: 'a4-landscape',
    name: 'A4横排 (297mm×210mm)',
    width: 3508,
    height: 2480,
    description: '适合打印的A4横排版（300 DPI）'
  }
];

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null;

export interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  panelId: string | null;
  resizeHandle: ResizeHandle;
  originalX: number;
  originalY: number;
  originalWidth: number;
  originalHeight: number;
  aspectRatio: number;
}

export interface CropState {
  isActive: boolean;
  panelId: string | null;
  startPoint: Point | null;
  currentRect: Rect | null;
}
