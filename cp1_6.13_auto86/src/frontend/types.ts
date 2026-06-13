export type PetalColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'indigo' | 'purple';
export type Rarity = 'common' | 'rare' | 'legendary';
export type TaskType = 'checkin' | 'mood' | 'drawing';
export type Page = 'home' | 'warehouse' | 'exchange' | 'explore' | 'synthesis';

export interface Petal {
  color: PetalColor;
  taskType: TaskType;
  unlockedAt: number;
}

export interface TaskRecord {
  time: number;
  detail?: string;
}

export interface TaskProgress {
  type: TaskType;
  progress: number;
  completedToday: boolean;
  records: TaskRecord[];
}

export interface FlowerCard {
  id: string;
  name: string;
  rarity: Rarity;
  flowerType: string;
  imageData: string;
  createdAt: number;
}

export interface User {
  id: string;
  name: string;
  petals: Petal[];
  tasks: TaskProgress[];
  cards: FlowerCard[];
  lastLoginDate: string;
}

export interface PublicUser {
  id: string;
  name: string;
  cards: FlowerCard[];
}

export interface ExchangeRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  offeredCardId: string;
  requestedCardId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
  fromName?: string;
  toName?: string;
  offeredCard?: FlowerCard;
  requestedCard?: FlowerCard;
}

export const PETAL_COLORS: PetalColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'purple'];
export const PETAL_HEX: Record<PetalColor, string> = {
  red: '#FF4444',
  orange: '#FF8C00',
  yellow: '#FFD700',
  green: '#32CD32',
  blue: '#1E90FF',
  indigo: '#6A5ACD',
  purple: '#9370DB'
};
export const PETAL_NAMES: Record<PetalColor, string> = {
  red: '朱砂红',
  orange: '琥珀橙',
  yellow: '流金黃',
  green: '翡翠绿',
  blue: '天青蓝',
  indigo: '靛蓝紫',
  purple: '紫罗紫'
};
export const RARITY_NAMES: Record<Rarity, string> = {
  common: '普通',
  rare: '稀有',
  legendary: '传说'
};
export const RARITY_COLORS: Record<Rarity, [string, string]> = {
  common: ['#32CD32', '#FFD700'],
  rare: ['#1E90FF', '#9370DB'],
  legendary: ['#FF4444', '#FFD700']
};
export const TASK_NAMES: Record<TaskType, string> = {
  checkin: '每日签到',
  mood: '分享心情',
  drawing: '创作诗画'
};
