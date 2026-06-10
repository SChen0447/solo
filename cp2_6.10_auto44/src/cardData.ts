export type Rarity = 'common' | 'rare' | 'epic';

export interface Card {
  id: string;
  name: string;
  level: number;
  rarity: Rarity;
  attack: number;
  defense: number;
  gridX: number;
  gridY: number;
  color: string;
}

export const CARD_WIDTH = 128;
export const CARD_HEIGHT = 180;
export const CARD_GAP = 12;
export const GRID_COLS = 3;
export const GRID_ROWS = 3;

const CARD_TEMPLATES: Array<{ name: string; baseAttack: number; baseDefense: number; color: string }> = [
  { name: '烈焰战士', baseAttack: 25, baseDefense: 15, color: '#ff6644' },
  { name: '寒冰法师', baseAttack: 30, baseDefense: 10, color: '#44aaff' },
  { name: '暗影刺客', baseAttack: 35, baseDefense: 8, color: '#aa44ff' },
  { name: '圣光骑士', baseAttack: 20, baseDefense: 25, color: '#ffdd44' },
  { name: '森林守卫', baseAttack: 18, baseDefense: 28, color: '#44dd66' },
];

export const RARITY_BORDER: Record<Rarity, string> = {
  common: '#ffffff',
  rare: '#4488ff',
  epic: '#aa44ff',
};

export const RARITY_GLOW: Record<Rarity, string> = {
  common: 'transparent',
  rare: 'rgba(68, 136, 255, 0.6)',
  epic: 'rgba(170, 68, 255, 0.6)',
};

export function getRarityByLevel(level: number): Rarity {
  if (level >= 3) return 'epic';
  if (level >= 2) return 'rare';
  return 'common';
}

let cardIdCounter = 0;

function generateId(): string {
  cardIdCounter++;
  return `card_${Date.now()}_${cardIdCounter}`;
}

export function createRandomCard(gridX: number, gridY: number, level: number = 1): Card {
  const template = CARD_TEMPLATES[Math.floor(Math.random() * CARD_TEMPLATES.length)];
  const levelMultiplier = Math.pow(1.5, level - 1);
  return {
    id: generateId(),
    name: template.name,
    level,
    rarity: getRarityByLevel(level),
    attack: Math.round(template.baseAttack * levelMultiplier),
    defense: Math.round(template.baseDefense * levelMultiplier),
    gridX,
    gridY,
    color: template.color,
  };
}

export function createInitialDeck(): Card[] {
  const cards: Card[] = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      cards.push(createRandomCard(x, y, 1));
    }
  }
  return cards;
}

export function getTemplateByName(name: string): { baseAttack: number; baseDefense: number; color: string } | undefined {
  return CARD_TEMPLATES.find(t => t.name === name);
}
