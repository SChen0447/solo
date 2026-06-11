export type RuneType = 'fire' | 'ice' | 'poison' | 'light';

export interface RuneStone {
  id: string;
  type: RuneType;
  color: string;
  glowColor: string;
  attackBonus: number;
  speedBonus: number;
  critBonus: number;
  specialEffect: string;
  rotation: number;
  broken: boolean;
}

export interface EnchantmentResult {
  success: boolean;
  runeType: RuneType;
  impurityChange: number;
}

export const RUNE_CONFIGS: Record<RuneType, Omit<RuneStone, 'id' | 'rotation' | 'broken'>> = {
  fire: {
    type: 'fire',
    color: '#ff6f00',
    glowColor: '#ffab40',
    attackBonus: 20,
    speedBonus: 0,
    critBonus: 0,
    specialEffect: '灼烧',
  },
  ice: {
    type: 'ice',
    color: '#1565c0',
    glowColor: '#64b5f6',
    attackBonus: 5,
    speedBonus: 15,
    critBonus: 0,
    specialEffect: '冰冻',
  },
  poison: {
    type: 'poison',
    color: '#2e7d32',
    glowColor: '#81c784',
    attackBonus: 0,
    speedBonus: 0,
    critBonus: 12,
    specialEffect: '剧毒',
  },
  light: {
    type: 'light',
    color: '#ffd600',
    glowColor: '#fff176',
    attackBonus: 10,
    speedBonus: 5,
    critBonus: 5,
    specialEffect: '圣光',
  },
};

export function createRuneStones(): RuneStone[] {
  const types: RuneType[] = ['fire', 'ice', 'poison', 'light'];
  return types.map((type, i) => ({
    id: `rune-${i}`,
    ...RUNE_CONFIGS[type],
    rotation: Math.random() * 360,
    broken: false,
  }));
}

export function calculateEnchantSuccess(impurity: number): boolean {
  const baseChance = 0.75;
  const impurityPenalty = impurity / 200;
  const finalChance = baseChance - impurityPenalty;
  return Math.random() < finalChance;
}

export function attemptEnchant(
  rune: RuneStone,
  impurity: number
): EnchantmentResult {
  const success = calculateEnchantSuccess(impurity);
  return {
    success,
    runeType: rune.type,
    impurityChange: success ? 0 : 10,
  };
}

export function applyEnchantToWeapon(
  weapon: {
    attack: number;
    speed: number;
    critRate: number;
  },
  rune: RuneStone
): { attack: number; speed: number; critRate: number } {
  return {
    attack: weapon.attack + rune.attackBonus,
    speed: weapon.speed + rune.speedBonus,
    critRate: Math.round((weapon.critRate + rune.critBonus) * 10) / 10,
  };
}

export function getRuneGlowColor(type: RuneType): string {
  return RUNE_CONFIGS[type].glowColor;
}
