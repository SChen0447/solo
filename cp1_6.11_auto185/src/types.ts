export type ElementType = 'fire' | 'earth' | 'light' | 'water' | 'wind';

export interface Crystal {
  id: string;
  element: ElementType;
}

export interface LiquidEssence {
  id: string;
  element: ElementType;
  color: string;
}

export interface AltarSlot {
  position: number;
  expectedElement: ElementType;
  currentElement: ElementType | null;
  activated: boolean;
}

export interface SpiritParticle {
  id: number;
  angle: number;
  orbitRadiusX: number;
  orbitRadiusY: number;
  color: string;
  speed: number;
  size: number;
}

export interface Spirit {
  id: string;
  elements: ElementType[];
  name: string;
  colors: string[];
  radius: number;
  particles: SpiritParticle[];
  createdAt: number;
}

export interface SummonRecord {
  id: string;
  spirit: Spirit;
  time: string;
}

export const ELEMENT_CYCLE: ElementType[] = ['fire', 'earth', 'light', 'water', 'wind'];

export const ELEMENT_INFO: Record<ElementType, {
  name: string;
  crystalName: string;
  color: string;
  glowColor: string;
  symbol: string;
}> = {
  fire: {
    name: '火',
    crystalName: '赤焰晶',
    color: '#ff3322',
    glowColor: '#ff6a33',
    symbol: '🔥',
  },
  earth: {
    name: '土',
    crystalName: '琥珀晶',
    color: '#cc8800',
    glowColor: '#ffaa33',
    symbol: '🪨',
  },
  light: {
    name: '金',
    crystalName: '圣辉晶',
    color: '#ffdd00',
    glowColor: '#ffee66',
    symbol: '✦',
  },
  water: {
    name: '水',
    crystalName: '霜蓝晶',
    color: '#33aaff',
    glowColor: '#66ccff',
    symbol: '💧',
  },
  wind: {
    name: '木',
    crystalName: '翠风晶',
    color: '#33cc66',
    glowColor: '#66ff99',
    symbol: '🌿',
  },
};

export const ELEMENT_NAMES: Record<ElementType, string> = {
  fire: '赤焰',
  earth: '琥珀',
  light: '圣辉',
  water: '霜蓝',
  wind: '翠风',
};
