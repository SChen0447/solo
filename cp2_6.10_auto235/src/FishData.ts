export type WaterType = 'river' | 'lake' | 'ocean';
export type Rarity = 'common' | 'rare' | 'legendary';

export interface FishSpecies {
  id: string;
  name: string;
  rarity: Rarity;
  minWeight: number;
  maxWeight: number;
  waters: WaterType[];
  color: string;
  emoji: string;
}

export interface CaughtFish {
  id: string;
  speciesId: string;
  weight: number;
  caughtAt: Date;
  water: WaterType;
}

export interface FishEntry {
  speciesId: string;
  count: number;
  firstCaughtAt: Date;
}

export const FISH_SPECIES: FishSpecies[] = [
  { id: 'carp', name: '鲫鱼', rarity: 'common', minWeight: 0.3, maxWeight: 1.5, waters: ['river', 'lake'], color: '#a8b87a', emoji: '🐟' },
  { id: 'tilapia', name: '罗非鱼', rarity: 'common', minWeight: 0.4, maxWeight: 2.0, waters: ['river', 'lake'], color: '#7a9a6a', emoji: '🐟' },
  { id: 'catfish', name: '鲶鱼', rarity: 'common', minWeight: 0.5, maxWeight: 3.0, waters: ['river'], color: '#6a5a4a', emoji: '🐡' },
  { id: 'minnow', name: '白条鱼', rarity: 'common', minWeight: 0.05, maxWeight: 0.3, waters: ['river', 'lake'], color: '#c0d0e0', emoji: '🐠' },
  { id: 'crucian', name: '鲤鱼', rarity: 'common', minWeight: 0.5, maxWeight: 4.0, waters: ['river', 'lake'], color: '#d4a047', emoji: '🐟' },
  { id: 'perch', name: '鲈鱼', rarity: 'rare', minWeight: 0.5, maxWeight: 2.5, waters: ['river', 'lake', 'ocean'], color: '#8ab8c8', emoji: '🐟' },
  { id: 'trout', name: '鳟鱼', rarity: 'rare', minWeight: 0.8, maxWeight: 3.0, waters: ['river', 'lake'], color: '#d88a8a', emoji: '🐠' },
  { id: 'salmon', name: '三文鱼', rarity: 'rare', minWeight: 2.0, maxWeight: 8.0, waters: ['ocean'], color: '#e89878', emoji: '🐟' },
  { id: 'pike', name: '狗鱼', rarity: 'rare', minWeight: 1.0, maxWeight: 6.0, waters: ['lake'], color: '#5a7a4a', emoji: '🐊' },
  { id: 'snapper', name: '鲷鱼', rarity: 'rare', minWeight: 0.5, maxWeight: 4.0, waters: ['ocean'], color: '#d87878', emoji: '🐠' },
  { id: 'mackerel', name: '鲭鱼', rarity: 'common', minWeight: 0.2, maxWeight: 1.0, waters: ['ocean'], color: '#4a6a8a', emoji: '🐟' },
  { id: 'sturgeon', name: '鲟鱼', rarity: 'legendary', minWeight: 10.0, maxWeight: 50.0, waters: ['river', 'lake'], color: '#7a8a6a', emoji: '🦈' },
  { id: 'tuna', name: '金枪鱼', rarity: 'legendary', minWeight: 20.0, maxWeight: 100.0, waters: ['ocean'], color: '#5a6a7a', emoji: '🐟' },
  { id: 'marlin', name: '马林鱼', rarity: 'legendary', minWeight: 50.0, maxWeight: 200.0, waters: ['ocean'], color: '#3a6a9a', emoji: '🐬' },
  { id: 'goldenkoi', name: '黄金锦鲤', rarity: 'legendary', minWeight: 2.0, maxWeight: 8.0, waters: ['lake'], color: '#ffd700', emoji: '✨' },
];

export const RARITY_CONFIG: Record<Rarity, { label: string; xp: number; className: string }> = {
  common: { label: '普通', xp: 10, className: 'rarity-common' },
  rare: { label: '稀有', xp: 30, className: 'rarity-rare' },
  legendary: { label: '传说', xp: 100, className: 'rarity-legendary' },
};

export const WATER_CONFIG: Record<WaterType, { label: string; bgColor: string }> = {
  river: { label: '河流', bgColor: '#2a6a5a' },
  lake: { label: '湖泊', bgColor: '#2a5a7a' },
  ocean: { label: '海洋', bgColor: '#1a4a7a' },
};

export function getFishById(id: string): FishSpecies | undefined {
  return FISH_SPECIES.find(f => f.id === id);
}

export function getFishByWater(water: WaterType): FishSpecies[] {
  return FISH_SPECIES.filter(f => f.waters.includes(water));
}
