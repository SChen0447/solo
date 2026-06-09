import { Pet, PetType, Customer, Drink, DrinkId, Table, SkillType, PetSkills } from '../types';

const CAT_NAMES = ['咪咪', '小橘', '奶茶', '布丁', '雪球', '芝麻'];
const DOG_NAMES = ['旺财', '豆豆', '球球', '阿黄', '巧克力', 'Lucky'];
const RABBIT_NAMES = ['小白', '萝卜', '棉花糖', '月牙', '布丁', '毛毛'];

const CUSTOMER_NAMES = [
  '小明', '小红', '阿强', '小丽', '大伟', '小芳', '阿杰', '小雅',
  '老王', '小张', '阿珍', '小李', '大壮', '小美', '阿龙', '小雪',
];

const CUSTOMER_AVATARS = [
  '🧑', '👩', '👨', '👧', '👦', '🧔', '👵', '👴',
  '👩‍🦰', '👨‍🦱', '👩‍🦳', '🧑‍🎓', '👨‍💼', '👩‍🍳', '🧙', '🧝',
];

export const DRINKS: Record<DrinkId, Drink> = {
  espresso: {
    id: 'espresso',
    name: '意式浓缩',
    price: 15,
    steps: [
      { key: 'G', label: '研磨', action: 'grind' },
      { key: 'E', label: '萃取', action: 'extract' },
    ],
    unlocked: true,
  },
  americano: {
    id: 'americano',
    name: '美式咖啡',
    price: 18,
    steps: [
      { key: 'G', label: '研磨', action: 'grind' },
      { key: 'E', label: '萃取', action: 'extract' },
      { key: 'M', label: '加水', action: 'mix' },
    ],
    unlocked: true,
  },
  cappuccino: {
    id: 'cappuccino',
    name: '卡布奇诺',
    price: 22,
    steps: [
      { key: 'G', label: '研磨', action: 'grind' },
      { key: 'E', label: '萃取', action: 'extract' },
      { key: 'S', label: '蒸奶', action: 'steam' },
      { key: 'F', label: '拉花', action: 'foam' },
    ],
    unlocked: true,
  },
  latte: {
    id: 'latte',
    name: '拿铁',
    price: 25,
    steps: [
      { key: 'G', label: '研磨', action: 'grind' },
      { key: 'E', label: '萃取', action: 'extract' },
      { key: 'S', label: '蒸奶', action: 'steam' },
      { key: 'F', label: '拉花', action: 'foam' },
    ],
    unlocked: true,
  },
  mocha: {
    id: 'mocha',
    name: '摩卡',
    price: 28,
    steps: [
      { key: 'G', label: '研磨', action: 'grind' },
      { key: 'E', label: '萃取', action: 'extract' },
      { key: 'M', label: '加巧', action: 'mix' },
      { key: 'S', label: '蒸奶', action: 'steam' },
      { key: 'F', label: '拉花', action: 'foam' },
    ],
    unlocked: false,
  },
};

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function createInitialPets(): Pet[] {
  return [
    createPet('cat', '咪咪', 6, 7, { espresso: 1, latteArt: 1, pourOver: 0 }, 0),
    createPet('dog', '旺财', 7, 5, { espresso: 1, latteArt: 0, pourOver: 1 }, 1),
    createPet('rabbit', '小白', 5, 8, { espresso: 0, latteArt: 1, pourOver: 1 }, 2),
  ];
}

export function createPet(
  type: PetType,
  name: string,
  agility: number,
  focus: number,
  skills: PetSkills,
  index: number
): Pet {
  return {
    id: generateId(),
    name,
    type,
    agility,
    focus,
    skills,
    isTraining: false,
    trainingProgress: 0,
    trainingSkill: null,
    isExcited: false,
    currentTableId: null,
    x: 80 + index * 60,
    y: 420,
  };
}

export function recruitPet(): Pet {
  const types: PetType[] = ['cat', 'dog', 'rabbit'];
  const type = types[randomInt(0, 2)];
  const nameList = type === 'cat' ? CAT_NAMES : type === 'dog' ? DOG_NAMES : RABBIT_NAMES;
  const name = nameList[randomInt(0, nameList.length - 1)];
  const agility = randomInt(1, 10);
  const focus = randomInt(1, 10);
  const skills: PetSkills = {
    espresso: randomInt(0, 1),
    latteArt: randomInt(0, 1),
    pourOver: randomInt(0, 1),
  };
  return {
    id: generateId(),
    name,
    type,
    agility,
    focus,
    skills,
    isTraining: false,
    trainingProgress: 0,
    trainingSkill: null,
    isExcited: false,
    currentTableId: null,
    x: 80,
    y: 420,
  };
}

export function createInitialTables(): Table[] {
  const positions = [
    { x: 500, y: 150 },
    { x: 700, y: 150 },
    { x: 500, y: 320 },
    { x: 700, y: 320 },
  ];
  return positions.map((pos, i) => ({
    id: `table-${i}`,
    status: 'empty',
    customerId: null,
    x: pos.x,
    y: pos.y,
    waitTime: 0,
    maxWaitTime: 20,
  }));
}

export function generateCustomer(availableDrinks: DrinkId[]): Customer {
  const drinkId = availableDrinks[randomInt(0, availableDrinks.length - 1)];
  return {
    id: generateId(),
    name: CUSTOMER_NAMES[randomInt(0, CUSTOMER_NAMES.length - 1)],
    avatar: CUSTOMER_AVATARS[randomInt(0, CUSTOMER_AVATARS.length - 1)],
    drinkId,
    currentStep: 0,
    timeLeft: 20,
    totalTime: 20,
    tableId: null,
    isAngry: false,
    isHappy: false,
  };
}

export function calculateTrainingSuccess(pet: Pet, skill: SkillType): boolean {
  const baseChance = 0.5;
  const focusBonus = (pet.focus - 5) * 0.05;
  const agilityBonus = (pet.agility - 5) * 0.03;
  const currentLevel = pet.skills[skill];
  const levelPenalty = currentLevel * 0.08;
  const finalChance = Math.max(0.2, Math.min(0.95, baseChance + focusBonus + agilityBonus - levelPenalty));
  return Math.random() < finalChance;
}

export function calculateSatisfaction(timeLeft: number, totalTime: number, drink: Drink): number {
  const timeRatio = timeLeft / totalTime;
  let baseSatisfaction = 10;
  if (timeRatio > 0.7) baseSatisfaction += 5;
  else if (timeRatio > 0.4) baseSatisfaction += 2;
  else if (timeRatio < 0.2) baseSatisfaction -= 3;
  return baseSatisfaction;
}

export function calculateEarnings(drink: Drink, satisfaction: number): number {
  const base = drink.price;
  const tip = satisfaction > 12 ? randomInt(5, 10) : satisfaction > 8 ? randomInt(0, 5) : 0;
  return base + tip;
}

export function getAvailableDrinks(drinks: Record<DrinkId, Drink>): DrinkId[] {
  return (Object.values(drinks) as Drink[]).filter(d => d.unlocked).map(d => d.id);
}

export function checkUnlocks(totalSatisfaction: number, hasAutoSteamer: boolean, coins: number) {
  const unlocks: { mocha: boolean; specialArt: boolean; autoSteamerAvailable: boolean } = {
    mocha: totalSatisfaction >= 200,
    specialArt: totalSatisfaction >= 500,
    autoSteamerAvailable: totalSatisfaction >= 1000 && !hasAutoSteamer && coins >= 2000,
  };
  return unlocks;
}

export function getPetBorderColor(type: PetType): string {
  switch (type) {
    case 'cat': return '#FFB6C1';
    case 'dog': return '#87CEEB';
    case 'rabbit': return '#DDA0DD';
  }
}

export function getPetEmoji(type: PetType): string {
  switch (type) {
    case 'cat': return '🐱';
    case 'dog': return '🐶';
    case 'rabbit': return '🐰';
  }
}
