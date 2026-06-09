export enum FragranceType {
  FLORAL = 'floral',
  WOODY = 'woody',
  FRUITY = 'fruity',
  SPICY = 'spicy',
}

export interface FragranceBase {
  id: string;
  name: string;
  type: FragranceType;
  color: string;
  description: string;
}

export interface FormulaNode {
  id: string;
  fragranceId: string;
  concentration: number;
  gridX: number;
  gridY: number;
}

export interface Formula {
  id: string;
  name: string;
  author: string;
  nodes: FormulaNode[];
  createdAt: number;
  averageRating: number;
  ratingCount: number;
  favoriteCount: number;
  isPublic: boolean;
}

export interface Rating {
  id: string;
  formulaId: string;
  score: number;
  comment: string;
  createdAt: number;
}

export interface FormulaListItem {
  id: string;
  name: string;
  author: string;
  averageRating: number;
  ratingCount: number;
  favoriteCount: number;
  createdAt: number;
}

export const PRESET_FRAGRANCES: FragranceBase[] = [
  { id: 'rose', name: '玫瑰', type: FragranceType.FLORAL, color: '#ff6b9d', description: '经典浪漫的花香调，甜美优雅' },
  { id: 'jasmine', name: '茉莉', type: FragranceType.FLORAL, color: '#f8b4d9', description: '浓郁洁白的花香，神秘诱人' },
  { id: 'lavender', name: '薰衣草', type: FragranceType.FLORAL, color: '#9b7ed7', description: '清新舒缓的草本花香' },
  { id: 'ylang', name: '依兰', type: FragranceType.FLORAL, color: '#f9d56e', description: '异域热情的花香，浓郁饱满' },
  { id: 'sandalwood', name: '檀香', type: FragranceType.WOODY, color: '#8b5e3c', description: '温润醇厚的东方木香' },
  { id: 'cedar', name: '雪松', type: FragranceType.WOODY, color: '#a0826d', description: '干燥挺拔的松木香' },
  { id: 'vetiver', name: '香根草', type: FragranceType.WOODY, color: '#6b8e23', description: '深沉泥土的草根香' },
  { id: 'oud', name: '沉香', type: FragranceType.WOODY, color: '#4a3728', description: '珍贵浓郁的木质琥珀香' },
  { id: 'lemon', name: '柠檬', type: FragranceType.FRUITY, color: '#ffd93d', description: '明亮清爽的柑橘果香' },
  { id: 'peach', name: '蜜桃', type: FragranceType.FRUITY, color: '#ffb6a3', description: '饱满多汁的甜美果香' },
  { id: 'berry', name: '浆果', type: FragranceType.FRUITY, color: '#c71585', description: '酸甜诱人的野生浆果香' },
  { id: 'cinnamon', name: '肉桂', type: FragranceType.SPICY, color: '#d2691e', description: '温暖热情的东方辛香' },
];
