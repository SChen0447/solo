export type Rarity = 'common' | 'rare' | 'epic';

export interface ElementDef {
  id: string;
  name: string;
  color: string;
  rarity: Rarity;
}

export interface RecipeDef {
  inputs: [string, string];
  output: string;
}

export const ELEMENTS: Record<string, ElementDef> = {
  fire: { id: 'fire', name: '火', color: '#FF4444', rarity: 'common' },
  water: { id: 'water', name: '水', color: '#4488FF', rarity: 'common' },
  earth: { id: 'earth', name: '土', color: '#8B5E34', rarity: 'common' },
  wind: { id: 'wind', name: '风', color: '#66DDAA', rarity: 'common' },
  steam: { id: 'steam', name: '蒸汽', color: '#CCCCCC', rarity: 'common' },
  stone: { id: 'stone', name: '石头', color: '#888888', rarity: 'common' },
  dust: { id: 'dust', name: '尘埃', color: '#AA9977', rarity: 'common' },
  lava: { id: 'lava', name: '岩浆', color: '#FF6600', rarity: 'rare' },
  mud: { id: 'mud', name: '泥浆', color: '#6B4423', rarity: 'common' },
  energy: { id: 'energy', name: '能量', color: '#FFEE44', rarity: 'rare' },
  cloud: { id: 'cloud', name: '云', color: '#EEFFFF', rarity: 'common' },
  onsen: { id: 'onsen', name: '温泉', color: '#88DDFF', rarity: 'rare' },
  plant: { id: 'plant', name: '植物', color: '#44CC44', rarity: 'common' },
  sand: { id: 'sand', name: '沙', color: '#EEDD88', rarity: 'common' },
  glass: { id: 'glass', name: '玻璃', color: '#AADDFF', rarity: 'rare' },
  metal: { id: 'metal', name: '金属', color: '#BBBBCC', rarity: 'rare' },
  life: { id: 'life', name: '生命药剂', color: '#FF6BAA', rarity: 'epic' },
  lightning: { id: 'lightning', name: '闪电', color: '#FFFF88', rarity: 'rare' },
  ice: { id: 'ice', name: '冰', color: '#AAEEFF', rarity: 'common' },
  crystal: { id: 'crystal', name: '水晶', color: '#DDAAFF', rarity: 'epic' },
};

export const RECIPES: RecipeDef[] = [
  { inputs: ['water', 'fire'], output: 'steam' },
  { inputs: ['earth', 'fire'], output: 'stone' },
  { inputs: ['earth', 'wind'], output: 'dust' },
  { inputs: ['stone', 'fire'], output: 'lava' },
  { inputs: ['earth', 'water'], output: 'mud' },
  { inputs: ['fire', 'wind'], output: 'energy' },
  { inputs: ['water', 'wind'], output: 'cloud' },
  { inputs: ['steam', 'stone'], output: 'onsen' },
  { inputs: ['mud', 'water'], output: 'plant' },
  { inputs: ['stone', 'wind'], output: 'sand' },
  { inputs: ['sand', 'fire'], output: 'glass' },
  { inputs: ['stone', 'fire'], output: 'metal' },
  { inputs: ['plant', 'water'], output: 'life' },
  { inputs: ['cloud', 'energy'], output: 'lightning' },
  { inputs: ['water', 'wind'], output: 'ice' },
  { inputs: ['lava', 'water'], output: 'stone' },
  { inputs: ['cloud', 'fire'], output: 'lightning' },
  { inputs: ['glass', 'energy'], output: 'crystal' },
  { inputs: ['metal', 'fire'], output: 'lava' },
  { inputs: ['plant', 'earth'], output: 'life' },
  { inputs: ['steam', 'wind'], output: 'cloud' },
  { inputs: ['lava', 'earth'], output: 'stone' },
  { inputs: ['ice', 'fire'], output: 'water' },
  { inputs: ['sand', 'water'], output: 'mud' },
  { inputs: ['dust', 'water'], output: 'mud' },
  { inputs: ['wind', 'energy'], output: 'lightning' },
  { inputs: ['earth', 'earth'], output: 'stone' },
  { inputs: ['fire', 'fire'], output: 'energy' },
  { inputs: ['water', 'water'], output: 'ice' },
  { inputs: ['stone', 'stone'], output: 'metal' },
];

export const BASE_ELEMENTS = ['fire', 'water', 'earth', 'wind'];
export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#A0A0A0',
  rare: '#FFD700',
  epic: '#FF6B6B',
};
