import { Ingredient } from '../types';

export const TYPE_COLORS = {
  top: ['#f39c12', '#e67e22', '#d35400', '#e74c3c', '#c0392b'],
  middle: ['#e91e63', '#ec407a', '#ab47bc', '#9b59b6', '#8e44ad'],
  base: ['#8e44ad', '#5e3370', '#34495e', '#2c3e50', '#1a252f'],
};

export const INGREDIENTS: Ingredient[] = [
  {
    id: 'top-citrus',
    name: '柑橘',
    type: 'top',
    color: TYPE_COLORS.top[0],
    attributes: { fresh: 90, sweet: 60, woody: 5, spicy: 10, floral: 15, resinous: 5 },
  },
  {
    id: 'top-mint',
    name: '薄荷',
    type: 'top',
    color: TYPE_COLORS.top[1],
    attributes: { fresh: 95, sweet: 20, woody: 5, spicy: 15, floral: 5, resinous: 0 },
  },
  {
    id: 'top-bergamot',
    name: '佛手柑',
    type: 'top',
    color: TYPE_COLORS.top[2],
    attributes: { fresh: 80, sweet: 55, woody: 10, spicy: 15, floral: 40, resinous: 10 },
  },
  {
    id: 'top-lemon',
    name: '柠檬',
    type: 'top',
    color: TYPE_COLORS.top[3],
    attributes: { fresh: 92, sweet: 45, woody: 5, spicy: 8, floral: 10, resinous: 5 },
  },
  {
    id: 'top-grapefruit',
    name: '葡萄柚',
    type: 'top',
    color: TYPE_COLORS.top[4],
    attributes: { fresh: 88, sweet: 50, woody: 5, spicy: 12, floral: 8, resinous: 3 },
  },
  {
    id: 'middle-rose',
    name: '玫瑰',
    type: 'middle',
    color: TYPE_COLORS.middle[0],
    attributes: { fresh: 30, sweet: 70, woody: 15, spicy: 10, floral: 95, resinous: 20 },
  },
  {
    id: 'middle-lavender',
    name: '薰衣草',
    type: 'middle',
    color: TYPE_COLORS.middle[1],
    attributes: { fresh: 55, sweet: 40, woody: 25, spicy: 15, floral: 85, resinous: 30 },
  },
  {
    id: 'middle-jasmine',
    name: '茉莉',
    type: 'middle',
    color: TYPE_COLORS.middle[2],
    attributes: { fresh: 25, sweet: 75, woody: 10, spicy: 8, floral: 98, resinous: 15 },
  },
  {
    id: 'middle-ylang',
    name: '依兰',
    type: 'middle',
    color: TYPE_COLORS.middle[3],
    attributes: { fresh: 20, sweet: 80, woody: 20, spicy: 12, floral: 92, resinous: 25 },
  },
  {
    id: 'middle-geranium',
    name: '天竺葵',
    type: 'middle',
    color: TYPE_COLORS.middle[4],
    attributes: { fresh: 45, sweet: 50, woody: 30, spicy: 18, floral: 80, resinous: 15 },
  },
  {
    id: 'base-sandalwood',
    name: '檀香',
    type: 'base',
    color: TYPE_COLORS.base[0],
    attributes: { fresh: 10, sweet: 45, woody: 95, spicy: 15, floral: 20, resinous: 60 },
  },
  {
    id: 'base-amber',
    name: '琥珀',
    type: 'base',
    color: TYPE_COLORS.base[1],
    attributes: { fresh: 5, sweet: 70, woody: 55, spicy: 25, floral: 15, resinous: 90 },
  },
  {
    id: 'base-cedar',
    name: '雪松',
    type: 'base',
    color: TYPE_COLORS.base[2],
    attributes: { fresh: 30, sweet: 20, woody: 92, spicy: 20, floral: 10, resinous: 45 },
  },
  {
    id: 'base-vanilla',
    name: '香草',
    type: 'base',
    color: TYPE_COLORS.base[3],
    attributes: { fresh: 5, sweet: 95, woody: 30, spicy: 10, floral: 25, resinous: 50 },
  },
  {
    id: 'base-musk',
    name: '麝香',
    type: 'base',
    color: TYPE_COLORS.base[4],
    attributes: { fresh: 10, sweet: 40, woody: 60, spicy: 20, floral: 30, resinous: 70 },
  },
];

export const NOTE_TYPE_LABELS: Record<string, string> = {
  top: '前调',
  middle: '中调',
  base: '基调',
};
