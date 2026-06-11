export interface GearType {
  id: string;
  name: string;
  teeth: number;
  size: number;
  color: string;
  description: string;
  hasCam?: boolean;
  isDual?: boolean;
  dualTeeth?: number;
  isHollow?: boolean;
}

export interface PlacedGear {
  instanceId: string;
  typeId: string;
  slotIndex: number;
  rotation: number;
}

export interface RuneStone {
  index: number;
  name: string;
  symbol: string;
  isLit: boolean;
  litProgress: number;
}

export interface SandTimerState {
  sandRatio: number;
  isFlipping: boolean;
  flowSpeed: number;
}

export type GamePhase = 'idle' | 'running' | 'flipping' | 'victory';

export interface GameState {
  phase: GamePhase;
  currentHour: number;
  litRunes: number[];
  totalTime: number;
  placedGears: PlacedGear[];
  sandTimer: SandTimerState;
  runes: RuneStone[];
  warning: boolean;
  flowDuration: number;
}

export const SHICHEN = [
  { name: '子', symbol: '⿰' },
  { name: '丑', symbol: '⿱' },
  { name: '寅', symbol: '⿲' },
  { name: '卯', symbol: '⿳' },
  { name: '辰', symbol: '⿴' },
  { name: '巳', symbol: '⿵' },
  { name: '午', symbol: '⿶' },
  { name: '未', symbol: '⿷' },
  { name: '申', symbol: '⿸' },
  { name: '酉', symbol: '⿹' },
  { name: '戌', symbol: '⿺' },
  { name: '亥', symbol: '⿻' }
];

export const GEAR_TYPES: GearType[] = [
  {
    id: 'bronze-large',
    name: '大青铜齿轮',
    teeth: 12,
    size: 130,
    color: '#b87333',
    description: '齿数12，深铜色'
  },
  {
    id: 'brass-medium',
    name: '中黄铜齿轮',
    teeth: 8,
    size: 110,
    color: '#daa520',
    description: '齿数8，金色'
  },
  {
    id: 'tin-small',
    name: '小锡齿轮',
    teeth: 4,
    size: 80,
    color: '#c0c0c0',
    description: '齿数4，银灰'
  },
  {
    id: 'eccentric',
    name: '偏心齿轮',
    teeth: 6,
    size: 95,
    color: '#8b4513',
    description: '齿数6+凸轮，锈色',
    hasCam: true
  },
  {
    id: 'dual',
    name: '双联齿轮',
    teeth: 5,
    size: 105,
    color: '#a0522d',
    description: '齿数5+3，红铜',
    isDual: true,
    dualTeeth: 3
  },
  {
    id: 'hollow',
    name: '镂空齿轮',
    teeth: 10,
    size: 120,
    color: '#cd853f',
    description: '齿数10，镂空图案，古铜',
    isHollow: true
  }
];
