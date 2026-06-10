import { Card, getRarityByLevel, getTemplateByName } from './cardData';
import { generateParticles, Particle } from './effectPlayer';

export interface MergeResult {
  success: boolean;
  mergedCard?: Card;
  particles?: Particle[];
  removedCardIds?: string[];
}

export function canMerge(card1: Card, card2: Card): boolean {
  if (card1.id === card2.id) return false;
  if (card1.name !== card2.name) return false;
  if (card1.level !== card2.level) return false;
  if (card1.level >= 3) return false;
  return true;
}

export function performMerge(card1: Card, card2: Card, targetGridX: number, targetGridY: number): MergeResult {
  if (!canMerge(card1, card2)) {
    return { success: false };
  }

  const template = getTemplateByName(card1.name);
  if (!template) {
    return { success: false };
  }

  const newLevel = card1.level + 1;
  const multiplier = Math.pow(1.5, newLevel - 1);
  const randomFactor = 0.95 + Math.random() * 0.1;

  const newAttack = Math.round(template.baseAttack * multiplier * randomFactor);
  const newDefense = Math.round(template.baseDefense * multiplier * randomFactor);

  const mergedCard: Card = {
    id: `card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: card1.name,
    level: newLevel,
    rarity: getRarityByLevel(newLevel),
    attack: newAttack,
    defense: newDefense,
    gridX: targetGridX,
    gridY: targetGridY,
    color: template.color,
  };

  const particleX = targetGridX;
  const particleY = targetGridY;

  return {
    success: true,
    mergedCard,
    particles: generateParticles(particleX, particleY, template.color),
    removedCardIds: [card1.id, card2.id],
  };
}
