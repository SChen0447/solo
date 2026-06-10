export type PetType = 'cat' | 'dog' | 'rabbit';

export type SkillType = 'espresso' | 'latteArt' | 'pourOver';

export interface PetSkills {
  espresso: number;
  latteArt: number;
  pourOver: number;
}

export interface Pet {
  id: string;
  name: string;
  type: PetType;
  agility: number;
  focus: number;
  skills: PetSkills;
  isTraining: boolean;
  trainingProgress: number;
  trainingSkill: SkillType | null;
  isExcited: boolean;
  currentTableId: string | null;
  x: number;
  y: number;
}

export type DrinkId = 'espresso' | 'americano' | 'cappuccino' | 'latte' | 'mocha';

export interface DrinkStep {
  key: 'E' | 'S' | 'G' | 'F' | 'M';
  label: string;
  action: 'extract' | 'steam' | 'grind' | 'foam' | 'mix';
}

export interface Drink {
  id: DrinkId;
  name: string;
  price: number;
  steps: DrinkStep[];
  unlocked: boolean;
  specialArt?: boolean;
}

export type TableStatus = 'empty' | 'waiting' | 'serving' | 'completed';

export interface Table {
  id: string;
  status: TableStatus;
  customerId: string | null;
  x: number;
  y: number;
  waitTime: number;
  maxWaitTime: number;
}

export interface Customer {
  id: string;
  name: string;
  avatar: string;
  drinkId: DrinkId;
  currentStep: number;
  timeLeft: number;
  totalTime: number;
  tableId: string | null;
  isAngry: boolean;
  isHappy: boolean;
}

export type TrainingType = 'espresso' | 'latteArt';

export interface GameState {
  coins: number;
  satisfaction: number;
  totalSatisfaction: number;
  day: number;
  pets: Pet[];
  customers: Customer[];
  tables: Table[];
  drinks: Drink[];
  unlockedSpecials: string[];
  hasAutoSteamer: boolean;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
}
