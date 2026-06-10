export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type BaitType = 'pumpkin' | 'book' | 'crystal' | 'none';
export type RoomType = 'attic' | 'basement' | 'study';

export interface GhostConfig {
  id: string;
  name: string;
  rarity: Rarity;
  rarityStars: number;
  color: string;
  glowColor: string;
  preferredBait: BaitType;
  spawnRooms: RoomType[];
  baseCatchRate: number;
  animation: {
    floatAmplitude: number;
    floatPeriod: number;
    blinkInterval: number;
    size: number;
  };
  recipe?: string[];
}

export const RARITY_CONFIG: Record<Rarity, {
  label: string;
  stars: number;
  color: string;
  glowColor: string;
  spawnWeight: number;
  catchMultiplier: number;
}> = {
  common: {
    label: '普通',
    stars: 1,
    color: '#a0a0c0',
    glowColor: '#c0c0e0',
    spawnWeight: 50,
    catchMultiplier: 1.0
  },
  rare: {
    label: '稀有',
    stars: 2,
    color: '#4fd1c5',
    glowColor: '#7ff8e8',
    spawnWeight: 30,
    catchMultiplier: 0.8
  },
  epic: {
    label: '史诗',
    stars: 3,
    color: '#b56cf5',
    glowColor: '#d58cff',
    spawnWeight: 15,
    catchMultiplier: 0.6
  },
  legendary: {
    label: '传说',
    stars: 5,
    color: '#ffd700',
    glowColor: '#ffef80',
    spawnWeight: 5,
    catchMultiplier: 0.4
  }
};

export const GHOSTS: GhostConfig[] = [
  {
    id: 'dust_spirit',
    name: '尘埃幽灵',
    rarity: 'common',
    rarityStars: 1,
    color: '#a0a0c0',
    glowColor: '#c0c0e0',
    preferredBait: 'none',
    spawnRooms: ['attic', 'basement', 'study'],
    baseCatchRate: 0.8,
    animation: { floatAmplitude: 8, floatPeriod: 2, blinkInterval: 3, size: 36 }
  },
  {
    id: 'candle_wisp',
    name: '烛光精灵',
    rarity: 'common',
    rarityStars: 1,
    color: '#c8b890',
    glowColor: '#ffd880',
    preferredBait: 'pumpkin',
    spawnRooms: ['attic', 'basement'],
    baseCatchRate: 0.8,
    animation: { floatAmplitude: 8, floatPeriod: 2.2, blinkInterval: 2.5, size: 34 },
    recipe: ['dust_spirit', 'dust_spirit', 'dust_spirit']
  },
  {
    id: 'bookmark_ghost',
    name: '书签幽灵',
    rarity: 'common',
    rarityStars: 1,
    color: '#8a9fb0',
    glowColor: '#aabfc0',
    preferredBait: 'book',
    spawnRooms: ['study', 'attic'],
    baseCatchRate: 0.8,
    animation: { floatAmplitude: 8, floatPeriod: 1.8, blinkInterval: 3.5, size: 32 }
  },
  {
    id: 'crystal_phantom',
    name: '水晶幻影',
    rarity: 'common',
    rarityStars: 1,
    color: '#a0c0ff',
    glowColor: '#c0d8ff',
    preferredBait: 'crystal',
    spawnRooms: ['basement', 'study'],
    baseCatchRate: 0.8,
    animation: { floatAmplitude: 8, floatPeriod: 2.4, blinkInterval: 2.8, size: 38 }
  },

  {
    id: 'shadow_crawler',
    name: '暗影爬行者',
    rarity: 'rare',
    rarityStars: 2,
    color: '#4fd1c5',
    glowColor: '#7ff8e8',
    preferredBait: 'pumpkin',
    spawnRooms: ['basement', 'attic'],
    baseCatchRate: 0.2,
    animation: { floatAmplitude: 8, floatPeriod: 1.6, blinkInterval: 2, size: 44 },
    recipe: ['candle_wisp', 'candle_wisp', 'candle_wisp']
  },
  {
    id: 'ink_specter',
    name: '墨迹幽灵',
    rarity: 'rare',
    rarityStars: 2,
    color: '#6fa8ff',
    glowColor: '#9fc8ff',
    preferredBait: 'book',
    spawnRooms: ['study'],
    baseCatchRate: 0.2,
    animation: { floatAmplitude: 8, floatPeriod: 2, blinkInterval: 2.2, size: 46 },
    recipe: ['bookmark_ghost', 'bookmark_ghost', 'bookmark_ghost']
  },
  {
    id: 'prism_wraith',
    name: '棱镜怨灵',
    rarity: 'rare',
    rarityStars: 2,
    color: '#c084fc',
    glowColor: '#e0a4ff',
    preferredBait: 'crystal',
    spawnRooms: ['basement', 'study'],
    baseCatchRate: 0.2,
    animation: { floatAmplitude: 8, floatPeriod: 1.9, blinkInterval: 2.6, size: 42 },
    recipe: ['crystal_phantom', 'crystal_phantom', 'crystal_phantom']
  },

  {
    id: 'flame_banshee',
    name: '火焰女妖',
    rarity: 'epic',
    rarityStars: 3,
    color: '#ff8c42',
    glowColor: '#ffbc72',
    preferredBait: 'pumpkin',
    spawnRooms: ['basement'],
    baseCatchRate: 0.2,
    animation: { floatAmplitude: 8, floatPeriod: 1.4, blinkInterval: 1.5, size: 52 },
    recipe: ['shadow_crawler', 'shadow_crawler', 'shadow_crawler']
  },
  {
    id: 'library_warden',
    name: '图书馆守护者',
    rarity: 'epic',
    rarityStars: 3,
    color: '#b56cf5',
    glowColor: '#d58cff',
    preferredBait: 'book',
    spawnRooms: ['study'],
    baseCatchRate: 0.2,
    animation: { floatAmplitude: 8, floatPeriod: 1.7, blinkInterval: 1.8, size: 54 },
    recipe: ['ink_specter', 'ink_specter', 'ink_specter']
  },
  {
    id: 'frost_phoenix',
    name: '冰霜凤凰',
    rarity: 'epic',
    rarityStars: 3,
    color: '#7dd3fc',
    glowColor: '#ade3ff',
    preferredBait: 'crystal',
    spawnRooms: ['basement', 'study'],
    baseCatchRate: 0.2,
    animation: { floatAmplitude: 8, floatPeriod: 1.5, blinkInterval: 1.6, size: 50 },
    recipe: ['prism_wraith', 'prism_wraith', 'prism_wraith']
  },

  {
    id: 'soul_emperor',
    name: '灵魂帝王',
    rarity: 'legendary',
    rarityStars: 5,
    color: '#ffd700',
    glowColor: '#ffef80',
    preferredBait: 'crystal',
    spawnRooms: ['attic', 'basement', 'study'],
    baseCatchRate: 0.2,
    animation: { floatAmplitude: 8, floatPeriod: 1.2, blinkInterval: 1.2, size: 64 },
    recipe: ['flame_banshee', 'library_warden', 'frost_phoenix']
  }
];

export const BAIT_CONFIG: Record<Exclude<BaitType, 'none'>, {
  id: string;
  name: string;
  icon: string;
  color: string;
  cooldown: number;
}> = {
  pumpkin: {
    id: 'pumpkin',
    name: '南瓜灯',
    icon: '🎃',
    color: '#ff8c42',
    cooldown: 15000
  },
  book: {
    id: 'book',
    name: '魔法书',
    icon: '📖',
    color: '#b56cf5',
    cooldown: 15000
  },
  crystal: {
    id: 'crystal',
    name: '水晶球',
    icon: '🔮',
    color: '#60a5fa',
    cooldown: 15000
  }
};

export const ROOM_CONFIG: Record<RoomType, {
  id: string;
  name: string;
  bgGradient: [string, string];
  decorations: Array<{ type: 'cobweb' | 'books' | 'moonwindow'; x: number; y: number; scale?: number }>;
  unlockCost: number;
}> = {
  attic: {
    id: 'attic',
    name: '阁楼',
    bgGradient: ['#2a1a3e', '#1a0f2a'],
    decorations: [
      { type: 'cobweb', x: 60, y: 70, scale: 1 },
      { type: 'cobweb', x: 720, y: 80, scale: 0.8 },
      { type: 'moonwindow', x: 380, y: 100, scale: 1 }
    ],
    unlockCost: 0
  },
  basement: {
    id: 'basement',
    name: '地下室',
    bgGradient: ['#1a2a1a', '#0a1a0a'],
    decorations: [
      { type: 'cobweb', x: 100, y: 500, scale: 1.2 },
      { type: 'cobweb', x: 680, y: 480, scale: 0.9 }
    ],
    unlockCost: 5
  },
  study: {
    id: 'study',
    name: '书房',
    bgGradient: ['#1a1a3e', '#0f0f2a'],
    decorations: [
      { type: 'books', x: 80, y: 450, scale: 1 },
      { type: 'books', x: 680, y: 460, scale: 0.9 },
      { type: 'moonwindow', x: 400, y: 80, scale: 0.9 }
    ],
    unlockCost: 5
  }
};

export function getGhostById(id: string): GhostConfig | undefined {
  return GHOSTS.find(g => g.id === id);
}

export function getGhostsByRarity(rarity: Rarity): GhostConfig[] {
  return GHOSTS.filter(g => g.rarity === rarity);
}

export function getRecipeResult(ghostId: string): GhostConfig | undefined {
  return GHOSTS.find(g => g.recipe?.includes(ghostId));
}
