export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

export interface DiceRoll {
  type: DiceType;
  sides: number;
  value: number;
}

export interface RollResult {
  id: string;
  timestamp: number;
  type: DiceType;
  count: number;
  rolls: DiceRoll[];
  total: number;
}

export interface AbilityScores {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export const DICE_SIDES: Record<DiceType, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20,
};

export const DICE_COLORS: Record<DiceType, string> = {
  d4: '#E74C3C',
  d6: '#3498DB',
  d8: '#2ECC71',
  d10: '#9B59B6',
  d12: '#F39C12',
  d20: '#E67E22',
};

export const ABILITY_NAMES: Record<keyof AbilityScores, string> = {
  strength: '力量',
  dexterity: '敏捷',
  constitution: '体质',
  intelligence: '智力',
  wisdom: '感知',
  charisma: '魅力',
};

export function getDiceSides(type: DiceType): number {
  return DICE_SIDES[type];
}

export function rollDice(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export function rollMultiple(type: DiceType, count: number): DiceRoll[] {
  const sides = getDiceSides(type);
  const rolls: DiceRoll[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push({
      type,
      sides,
      value: rollDice(sides),
    });
  }
  return rolls;
}

export function rollAbilityScore(): number {
  const rolls: number[] = [];
  for (let i = 0; i < 4; i++) {
    rolls.push(rollDice(6));
  }
  rolls.sort((a, b) => b - a);
  return rolls[0] + rolls[1] + rolls[2];
}

export function generateAbilityScores(): AbilityScores {
  return {
    strength: rollAbilityScore(),
    dexterity: rollAbilityScore(),
    constitution: rollAbilityScore(),
    intelligence: rollAbilityScore(),
    wisdom: rollAbilityScore(),
    charisma: rollAbilityScore(),
  };
}

export function getModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(mod: number): string {
  if (mod > 0) return `+${mod}`;
  return `${mod}`;
}

export function getAbilityScoreColor(score: number): { bg: string; text: string } {
  if (score >= 15) {
    return { bg: 'linear-gradient(135deg, #FFD700 0%, #D4AF37 50%, #B8860B 100%)', text: '#3E2C1C' };
  } else if (score >= 10) {
    return { bg: 'linear-gradient(135deg, #5B8BD4 0%, #4A6FA5 50%, #3A5A8A 100%)', text: '#FFFFFF' };
  } else {
    return { bg: 'linear-gradient(135deg, #A0A0A0 0%, #808080 50%, #606060 100%)', text: '#FFFFFF' };
  }
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}
