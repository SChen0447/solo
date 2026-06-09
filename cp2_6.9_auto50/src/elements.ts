export enum ElementType {
  EMPTY = 0,
  SAND = 1,
  WATER = 2,
  LAVA = 3,
  WOOD = 4,
  GUNPOWDER = 5,
  ROCK = 6,
  STEAM = 7,
  FIRE = 8,
  ASH = 9,
}

export interface Element {
  type: ElementType;
  updated: boolean;
  life: number;
  velocity: number;
  burnTimer: number;
  explodeTimer: number;
}

export interface ElementConfig {
  color: string;
  colorVariation: number;
  isSolid: boolean;
  isLiquid: boolean;
  isGas: boolean;
  isFlammable: boolean;
  density: number;
  friction: number;
  name: string;
}

export const ELEMENT_CONFIGS: Record<ElementType, ElementConfig> = {
  [ElementType.EMPTY]: {
    color: '#000000',
    colorVariation: 0,
    isSolid: false,
    isLiquid: false,
    isGas: false,
    isFlammable: false,
    density: 0,
    friction: 0,
    name: '空',
  },
  [ElementType.SAND]: {
    color: '#E8D5B1',
    colorVariation: 15,
    isSolid: true,
    isLiquid: false,
    isGas: false,
    isFlammable: false,
    density: 8,
    friction: 0.6,
    name: '沙子',
  },
  [ElementType.WATER]: {
    color: '#3B82F6',
    colorVariation: 20,
    isSolid: false,
    isLiquid: true,
    isGas: false,
    isFlammable: false,
    density: 4,
    friction: 0.1,
    name: '水',
  },
  [ElementType.LAVA]: {
    color: '#FF4500',
    colorVariation: 30,
    isSolid: false,
    isLiquid: true,
    isGas: false,
    isFlammable: false,
    density: 5,
    friction: 0.3,
    name: '岩浆',
  },
  [ElementType.WOOD]: {
    color: '#8B4513',
    colorVariation: 10,
    isSolid: true,
    isLiquid: false,
    isGas: false,
    isFlammable: true,
    density: 10,
    friction: 0.9,
    name: '木材',
  },
  [ElementType.GUNPOWDER]: {
    color: '#FF0000',
    colorVariation: 25,
    isSolid: true,
    isLiquid: false,
    isGas: false,
    isFlammable: true,
    density: 7,
    friction: 0.5,
    name: '火药',
  },
  [ElementType.ROCK]: {
    color: '#4A4A4A',
    colorVariation: 8,
    isSolid: true,
    isLiquid: false,
    isGas: false,
    isFlammable: false,
    density: 12,
    friction: 0.95,
    name: '岩石',
  },
  [ElementType.STEAM]: {
    color: '#E0E0E0',
    colorVariation: 10,
    isSolid: false,
    isLiquid: false,
    isGas: true,
    isFlammable: false,
    density: -2,
    friction: 0.05,
    name: '蒸汽',
  },
  [ElementType.FIRE]: {
    color: '#FF6600',
    colorVariation: 40,
    isSolid: false,
    isLiquid: false,
    isGas: true,
    isFlammable: false,
    density: -1,
    friction: 0.1,
    name: '火焰',
  },
  [ElementType.ASH]: {
    color: '#555555',
    colorVariation: 12,
    isSolid: true,
    isLiquid: false,
    isGas: false,
    isFlammable: false,
    density: 3,
    friction: 0.7,
    name: '灰烬',
  },
};

export function createElement(type: ElementType = ElementType.EMPTY): Element {
  return {
    type,
    updated: false,
    life: type === ElementType.STEAM ? 120 : type === ElementType.FIRE ? 60 : -1,
    velocity: 0,
    burnTimer: -1,
    explodeTimer: -1,
  };
}

export function getElementColor(type: ElementType, seed: number = 0): string {
  const config = ELEMENT_CONFIGS[type];
  if (config.colorVariation === 0) return config.color;

  const variation = Math.floor(((seed * 9301 + 49297) % 233280) / 233280 * config.colorVariation);
  const baseColor = config.color;
  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);

  const adjust = (c: number) => {
    const v = Math.max(0, Math.min(255, c + variation - config.colorVariation / 2));
    return Math.round(v).toString(16).padStart(2, '0');
  };

  if (type === ElementType.GUNPOWDER) {
    const flicker = Math.sin(Date.now() / 80 + seed) * 0.3 + 0.7;
    const fr = Math.min(255, Math.round(r * flicker + 40));
    const fg = Math.min(255, Math.round(g * flicker));
    const fb = Math.min(255, Math.round(b * flicker));
    return `rgb(${fr},${fg},${fb})`;
  }

  if (type === ElementType.FIRE) {
    const flicker = Math.sin(Date.now() / 60 + seed) * 0.4 + 0.6;
    const fr = Math.min(255, Math.round(255 * flicker));
    const fg = Math.min(255, Math.round(100 * flicker));
    const fb = 0;
    return `rgb(${fr},${fg},${fb})`;
  }

  if (type === ElementType.LAVA) {
    const flicker = Math.sin(Date.now() / 150 + seed) * 0.2 + 0.8;
    const fr = Math.min(255, Math.round(255 * flicker));
    const fg = Math.min(255, Math.round(80 * flicker));
    const fb = 0;
    return `rgb(${fr},${fg},${fb})`;
  }

  return `#${adjust(r)}${adjust(g)}${adjust(b)}`;
}
