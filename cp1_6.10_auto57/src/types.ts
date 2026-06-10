export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  id: string;
  name: string;
  thumbnailColor: string;
  difficulty: 'easy' | 'medium' | 'hard';
  cookTime: number;
  ingredients: Ingredient[];
  steps: string[];
  isFavorite: boolean;
  createdAt: number;
}

export interface MealPlanItem {
  id: string;
  recipeId: string;
  recipe: Recipe;
  mealType: 'breakfast' | 'lunch' | 'dinner';
}

export interface MealPlanDay {
  date: string;
  items: MealPlanItem[];
}

export type ViewType = 'welcome' | 'recipes' | 'ingredients' | 'planner';

export type TabType = 'recipes' | 'ingredients' | 'planner';

export const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '易',
  medium: '中',
  hard: '难'
};

export const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐'
};

export const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export const PRESET_GRADIENTS = [
  'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
  'linear-gradient(135deg, #ff8a5c 0%, #ffcd3c 100%)',
  'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
  'linear-gradient(135deg, #f39c12 0%, #e74c3c 100%)',
  'linear-gradient(135deg, #e67e22 0%, #d35400 100%)',
  'linear-gradient(135deg, #ff9a56 0%, #ff6b6b 100%)'
];

export const COMMON_INGREDIENTS = [
  '鸡蛋', '面粉', '西红柿', '大米', '猪肉', '牛肉', '鸡肉', '鱼肉',
  '土豆', '胡萝卜', '洋葱', '大蒜', '生姜', '青椒', '白菜', '菠菜',
  '豆腐', '牛奶', '黄油', '奶酪', '糖', '盐', '酱油', '醋'
];
