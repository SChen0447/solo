export const CANVAS_SIZE = 32;
export const MAX_HISTORY = 20;

export interface Frame {
  id: string;
  pixels: string[][];
}

export type ToolType = 'brush' | 'eraser' | 'fill' | 'picker';

export interface HistoryState {
  past: Frame[][];
  future: Frame[][];
}

export interface EditorState {
  frames: Frame[];
  currentFrameIndex: number;
  currentColor: string;
  currentTool: ToolType;
  brushSize: number;
  recentColors: string[];
  customColors: string[];
  isPlaying: boolean;
  fps: number;
  history: HistoryState;
}

export interface ExportProjectData {
  frames: Frame[];
  palette: string[];
  customColors: string[];
}

export const PICO8_PALETTE: string[] = [
  '#000000', '#1D2B53', '#7E2553', '#008751', '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8',
  '#FF004D', '#FFA300', '#FFEC27', '#00E436', '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA',
  '#1D1D2E', '#3A3A5A', '#7B4F7B', '#2E8B57', '#A0522D', '#8B8682', '#D3D3D3', '#FFE4C4',
  '#FF6B6B', '#FFB347', '#FFFF99', '#90EE90', '#87CEEB', '#B0A8B9', '#FFB6C1', '#FFE4B5'
];
