export type RuneElement = 'fire' | 'water' | 'thunder' | 'earth';

export interface Rune {
  id: string;
  element: RuneElement;
  x: number;
  y: number;
  gridX: number;
  gridY: number;
  glowIntensity: number;
  placed: boolean;
  isDormant: boolean;
  chargeCount: number;
  scale: number;
  animOffset: number;
}

export interface DragState {
  isDragging: boolean;
  rune: Rune | null;
  offsetX: number;
  offsetY: number;
  source: 'drawer' | 'grid';
  drawerIndex: number;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  resultName: string;
  scoreBonus: number;
  energyCost: number;
}

export interface SynthesisResult {
  success: boolean;
  recipe?: Recipe;
  positions?: { x: number; y: number }[];
  message?: string;
}

export type EventType = 'rampage' | 'dormant' | 'energyRain';

export interface GameEvent {
  type: EventType;
  element?: RuneElement;
  startTime: number;
  duration: number;
}

export interface HistoryEntry {
  id: string;
  recipeName: string;
  resultName: string;
  timestamp: number;
  slideIn: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface BackgroundParticle {
  x: number;
  y: number;
  baseY: number;
  size: number;
  opacity: number;
  phase: number;
  speed: number;
}

export interface SlotBreakParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
}

export const ELEMENT_COLORS: Record<RuneElement, string> = {
  fire: '#ff6b35',
  water: '#4a9eff',
  thunder: '#ffd700',
  earth: '#8b5e2b',
};

export const ELEMENT_NAMES: Record<RuneElement, string> = {
  fire: '火',
  water: '水',
  thunder: '雷',
  earth: '土',
};

export const GRID_SIZE = 10;
export const CELL_SIZE = 48;
export const INITIAL_ENERGY = 100;
export const DRAWER_INVENTORY = 8;
export const MAX_HISTORY = 5;

export const RECIPES: Recipe[] = [
  {
    id: 'line3',
    name: '直线三连',
    description: '同属性直线3连',
    resultName: '强化符文',
    scoreBonus: 10,
    energyCost: 10,
  },
  {
    id: 'triangle',
    name: '三角排列',
    description: '三种不同属性三角',
    resultName: '能量药剂',
    scoreBonus: 10,
    energyCost: 15,
  },
  {
    id: 'lshape',
    name: 'L形排列',
    description: 'L形两种属性',
    resultName: '随机碎片',
    scoreBonus: 10,
    energyCost: 8,
  },
  {
    id: 'hexagon',
    name: '六边形',
    description: '四属性各两枚',
    resultName: '稀有符文',
    scoreBonus: 40,
    energyCost: 30,
  },
];
