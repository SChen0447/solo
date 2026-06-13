export enum BrushMode {
  WATERCOLOR = 'watercolor',
  OIL = 'oil'
}

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface PaintColor {
  name: string;
  hex: string;
  rgb: { r: number; g: number; b: number };
}

export const PAINT_COLORS: PaintColor[] = [
  { name: '靛蓝',   hex: '#1e487a', rgb: { r: 30,  g: 72,  b: 122 } },
  { name: '赭石',   hex: '#a0522d', rgb: { r: 160, g: 82,  b: 45  } },
  { name: '茜红',   hex: '#c14a4a', rgb: { r: 193, g: 74,  b: 74  } },
  { name: '藤黄',   hex: '#e6b800', rgb: { r: 230, g: 184, b: 0   } },
  { name: '翠绿',   hex: '#2e8b57', rgb: { r: 46,  g: 139, b: 87  } },
  { name: '钛白',   hex: '#fafafa', rgb: { r: 250, g: 250, b: 250 } },
  { name: '煤黑',   hex: '#1a1a1a', rgb: { r: 26,  g: 26,  b: 26  } },
  { name: '群青',   hex: '#3f51b5', rgb: { r: 63,  g: 81,  b: 181 } },
  { name: '熟褐',   hex: '#5c3317', rgb: { r: 92,  g: 51,  b: 23  } },
  { name: '玫瑰红', hex: '#d97a97', rgb: { r: 217, g: 122, b: 151 } },
  { name: '柠檬黄', hex: '#fff44f', rgb: { r: 255, g: 244, b: 79  } },
  { name: '钴紫',   hex: '#6a4c93', rgb: { r: 106, g: 76,  b: 147 } }
];

export interface DiffusionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: { r: number; g: number; b: number };
  alpha: number;
  size: number;
  life: number;
  maxLife: number;
  branchingChance: number;
  mode: BrushMode;
}

export interface PaintStroke {
  id: number;
  color: { r: number; g: number; b: number };
  alpha: number;
  points: { x: number; y: number; speed: number; pressure: number; time: number }[];
  mode: BrushMode;
  timestamp: number;
  settled: boolean;
}

export interface SplashParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: { r: number; g: number; b: number };
  alpha: number;
  size: number;
  life: number;
}

export interface ResetParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
}

export interface EngineConfig {
  canvasWidth: number;
  canvasHeight: number;
  paperColor: { r: number; g: number; b: number };
  targetFPS: number;
  physicsHz: number;
}

export interface EngineState {
  humidity: number;
  brushMode: BrushMode;
  currentColor: { r: number; g: number; b: number } | null;
  currentAlpha: number;
  isResetting: boolean;
  resetProgress: number;
}
