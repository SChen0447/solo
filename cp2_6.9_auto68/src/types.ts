export interface Ingredient {
  name: string;
  amount: number;
}

export interface Nutrition {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  cookTime: number;
  servings: number;
  ingredients: Ingredient[];
  nutritionPerServing: Nutrition;
}

export interface NutritionDBItem {
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export const DAILY_RECOMMENDED: Nutrition = {
  calories: 2000,
  protein: 60,
  fat: 65,
  carbs: 300
};

export const NUTRITION_COLORS = {
  calories: '#FF6B6B',
  protein: '#4ECDC4',
  fat: '#FFD93D',
  carbs: '#6BCB77'
};
