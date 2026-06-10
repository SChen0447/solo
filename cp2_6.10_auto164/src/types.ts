export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface CoffeeItem {
  id: string;
  name: string;
  ingredients: string[];
  price: number;
  pairedSnack: string;
  description: string;
  image?: string;
  season: Season;
}

export type FilterType = 'all' | Season;

export const SNACK_OPTIONS = [
  '无搭配',
  '蓝莓芝士蛋糕',
  '提拉米苏',
  '蔓越莓司康',
  '抹茶曲奇',
  '焦糖布丁',
  '巧克力熔岩蛋糕',
  '杏仁可颂',
  '水果塔',
];

export const SEASON_LABELS: Record<Season, string> = {
  spring: '春季',
  summer: '夏季',
  autumn: '秋季',
  winter: '冬季',
};

export const SEASON_GRADIENTS: Record<Season, string> = {
  spring: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
  summer: 'linear-gradient(135deg, #fff8e1 0%, #ffe082 100%)',
  autumn: 'linear-gradient(135deg, #efebe9 0%, #bcaaa4 100%)',
  winter: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
};
