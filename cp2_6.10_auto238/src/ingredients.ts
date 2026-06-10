import { v4 as uuidv4 } from 'uuid';

export enum Rarity {
  COMMON = 'common',
  RARE = 'rare',
  LEGENDARY = 'legendary'
}

export interface Ingredient {
  id: string;
  name: string;
  color: string;
  rarity: Rarity;
  effects: Record<string, number>;
  pixels: number[][];
}

export interface Potion {
  id: string;
  name: string;
  color: string;
  rarity: Rarity;
  ingredients: string[];
}

export interface Recipe {
  id: string;
  potionId: string;
  unlocked: boolean;
}

export interface Order {
  id: string;
  potionId: string;
  reward: number;
}

export interface GameState {
  coins: number;
  inventory: Record<string, number>;
  recipes: Recipe[];
  currentOrder: Order | null;
  cauldronSlots: (string | null)[];
  potionsBrewed: number;
  newlyBrewedPotions: Set<string>;
}

function P(rows: string[]): number[][] {
  return rows.map(r => r.split('').map(c => c === '#' ? 1 : 0));
}

export const INGREDIENTS: Ingredient[] = [
  {
    id: 'moonlight_herb',
    name: '月光草',
    color: '#c0c0ff',
    rarity: Rarity.COMMON,
    effects: { healing: 3, calm: 2 },
    pixels: P([
      '................',
      '.......##.......',
      '......####......',
      '.....######.....',
      '....########....',
      '.....######.....',
      '......####......',
      '.......##.......',
      '......####......',
      '.....######.....',
      '....##....##....',
      '...##......##...',
      '..##........##..',
      '.##..........##.',
      '................',
      '................'
    ])
  },
  {
    id: 'fire_fern',
    name: '火焰蕨',
    color: '#ff6b35',
    rarity: Rarity.COMMON,
    effects: { warmth: 4, energy: 3 },
    pixels: P([
      '.......##.......',
      '......####......',
      '.....##..##.....',
      '....##....##....',
      '...##......##...',
      '..##...##...##..',
      '.##...####...##.',
      '##...######...##',
      '.##...####...##.',
      '..##...##...##..',
      '...##......##...',
      '....##....##....',
      '.....##..##.....',
      '......####......',
      '.......##.......',
      '................'
    ])
  },
  {
    id: 'frost_moss',
    name: '冰晶苔',
    color: '#88ddff',
    rarity: Rarity.RARE,
    effects: { frost: 4, protection: 2 },
    pixels: P([
      '................',
      '...#....#....#..',
      '..###..###..###.',
      '.##############.',
      '..###..###..###.',
      '...#....#....#..',
      '................',
      '.#....#....#....',
      '###..###..###...',
      '##############..',
      '###..###..###...',
      '.#....#....#....',
      '................',
      '...#....#....#..',
      '..###..###..###.',
      '................'
    ])
  },
  {
    id: 'shadow_mushroom',
    name: '暗影菇',
    color: '#8b5cf6',
    rarity: Rarity.RARE,
    effects: { stealth: 4, wisdom: 2 },
    pixels: P([
      '................',
      '.....######.....',
      '....########....',
      '...##########...',
      '..############..',
      '..############..',
      '...##########...',
      '....########....',
      '......####......',
      '......####......',
      '.....######.....',
      '......####......',
      '......####......',
      '.....######.....',
      '................',
      '................'
    ])
  },
  {
    id: 'starlight_flower',
    name: '星光花',
    color: '#ffd700',
    rarity: Rarity.LEGENDARY,
    effects: { magic: 5, luck: 4 },
    pixels: P([
      '.......##.......',
      '.......##.......',
      '....#.####.#....',
      '.....######.....',
      '##...######...##',
      '.####.####.####.',
      '..############..',
      '.....######.....',
      '..############..',
      '.####.####.####.',
      '##...######...##',
      '.....######.....',
      '....#.####.#....',
      '.......##.......',
      '.......##.......',
      '................'
    ])
  },
  {
    id: 'dragon_scale',
    name: '龙鳞草',
    color: '#22c55e',
    rarity: Rarity.LEGENDARY,
    effects: { strength: 5, defense: 4 },
    pixels: P([
      '......####......',
      '.....######.....',
      '....########....',
      '...##.####.##...',
      '..###########...',
      '.#############..',
      '###############.',
      '##.#########.##.',
      '###############.',
      '.#############..',
      '..###########...',
      '...##.####.##...',
      '....########....',
      '.....######.....',
      '......####......',
      '................'
    ])
  }
];

export const POTIONS: Potion[] = [
  {
    id: 'healing_potion',
    name: '治疗药水',
    color: '#ff6b9d',
    rarity: Rarity.COMMON,
    ingredients: ['moonlight_herb', 'frost_moss']
  },
  {
    id: 'fire_resistance',
    name: '抗火药水',
    color: '#ff6b35',
    rarity: Rarity.COMMON,
    ingredients: ['fire_fern', 'frost_moss']
  },
  {
    id: 'night_vision',
    name: '夜视药水',
    color: '#8b5cf6',
    rarity: Rarity.COMMON,
    ingredients: ['moonlight_herb', 'shadow_mushroom']
  },
  {
    id: 'strength_potion',
    name: '力量药水',
    color: '#e8b830',
    rarity: Rarity.RARE,
    ingredients: ['fire_fern', 'shadow_mushroom']
  },
  {
    id: 'wisdom_elixir',
    name: '智慧药剂',
    color: '#3b82f6',
    rarity: Rarity.RARE,
    ingredients: ['moonlight_herb', 'shadow_mushroom', 'frost_moss']
  },
  {
    id: 'phoenix_tear',
    name: '凤凰之泪',
    color: '#ff4500',
    rarity: Rarity.LEGENDARY,
    ingredients: ['fire_fern', 'starlight_flower']
  },
  {
    id: 'dragon_breath',
    name: '龙息药水',
    color: '#22c55e',
    rarity: Rarity.LEGENDARY,
    ingredients: ['fire_fern', 'dragon_scale']
  },
  {
    id: 'celestial_nectar',
    name: '天界甘露',
    color: '#ffd700',
    rarity: Rarity.LEGENDARY,
    ingredients: ['starlight_flower', 'moonlight_herb', 'frost_moss']
  }
];

export function getRarityColor(rarity: Rarity): string {
  switch (rarity) {
    case Rarity.COMMON: return '#ffffff';
    case Rarity.RARE: return '#3b82f6';
    case Rarity.LEGENDARY: return '#e8b830';
  }
}

export function getRarityLabel(rarity: Rarity): string {
  switch (rarity) {
    case Rarity.COMMON: return '普通';
    case Rarity.RARE: return '稀有';
    case Rarity.LEGENDARY: return '传说';
  }
}

export function getIngredientById(id: string): Ingredient | undefined {
  return INGREDIENTS.find(i => i.id === id);
}

export function getPotionById(id: string): Potion | undefined {
  return POTIONS.find(p => p.id === id);
}

export function createInitialRecipes(): Recipe[] {
  return POTIONS.map((potion, index) => ({
    id: uuidv4(),
    potionId: potion.id,
    unlocked: index < 3
  }));
}

export function createInitialInventory(): Record<string, number> {
  const inventory: Record<string, number> = {};
  INGREDIENTS.forEach(ing => {
    if (ing.rarity === Rarity.COMMON) {
      inventory[ing.id] = 10;
    } else if (ing.rarity === Rarity.RARE) {
      inventory[ing.id] = 5;
    } else {
      inventory[ing.id] = 2;
    }
  });
  return inventory;
}

export function createInitialOrder(recipes: Recipe[]): Order {
  const unlockedRecipes = recipes.filter(r => r.unlocked);
  const randomRecipe = unlockedRecipes[Math.floor(Math.random() * unlockedRecipes.length)];
  const potion = getPotionById(randomRecipe.potionId)!;
  let reward = 10;
  if (potion.rarity === Rarity.RARE) reward = 20;
  if (potion.rarity === Rarity.LEGENDARY) reward = 50;
  return {
    id: uuidv4(),
    potionId: potion.id,
    reward
  };
}

export function refreshInventory(inventory: Record<string, number>): Record<string, number> {
  const newInventory = { ...inventory };
  INGREDIENTS.forEach(ing => {
    let addAmount = 0;
    if (ing.rarity === Rarity.COMMON) {
      addAmount = 3 + Math.floor(Math.random() * 3);
    } else if (ing.rarity === Rarity.RARE) {
      addAmount = 1 + Math.floor(Math.random() * 2);
    } else {
      if (Math.random() < 0.15) addAmount = 1;
    }
    newInventory[ing.id] = Math.min(99, (newInventory[ing.id] || 0) + addAmount);
  });
  return newInventory;
}

export function matchRecipe(
  slotIds: (string | null)[],
  recipes: Recipe[]
): Potion | null {
  const usedIds = slotIds.filter((id): id is string => id !== null).sort();
  if (usedIds.length === 0) return null;
  
  for (const recipe of recipes) {
    if (!recipe.unlocked) continue;
    const potion = getPotionById(recipe.potionId);
    if (!potion) continue;
    const recipeIngredients = [...potion.ingredients].sort();
    if (usedIds.length === recipeIngredients.length &&
        usedIds.every((id, idx) => id === recipeIngredients[idx])) {
      return potion;
    }
  }
  return null;
}

export function shouldUnlockRecipe(potionsBrewed: number): boolean {
  return potionsBrewed > 0 && potionsBrewed % 5 === 0;
}

export function unlockNextRecipe(recipes: Recipe[]): Recipe[] {
  const lockedIndex = recipes.findIndex(r => !r.unlocked);
  if (lockedIndex === -1) return recipes;
  const newRecipes = [...recipes];
  newRecipes[lockedIndex] = { ...newRecipes[lockedIndex], unlocked: true };
  return newRecipes;
}
