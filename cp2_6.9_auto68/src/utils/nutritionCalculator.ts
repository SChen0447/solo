import type { Ingredient, Nutrition, NutritionDBItem } from '../types';

export function calculateTotalNutrition(
  ingredients: Ingredient[],
  nutritionDB: NutritionDBItem[],
  servings: number = 1
): Nutrition {
  const total: Nutrition = { calories: 0, protein: 0, fat: 0, carbs: 0 };

  for (const ing of ingredients) {
    const dbItem = nutritionDB.find(item => item.name === ing.name);
    if (dbItem) {
      const factor = ing.amount / 100;
      total.calories += dbItem.calories * factor;
      total.protein += dbItem.protein * factor;
      total.fat += dbItem.fat * factor;
      total.carbs += dbItem.carbs * factor;
    }
  }

  return {
    calories: Math.round((total.calories / servings) * 10) / 10,
    protein: Math.round((total.protein / servings) * 10) / 10,
    fat: Math.round((total.fat / servings) * 10) / 10,
    carbs: Math.round((total.carbs / servings) * 10) / 10
  };
}
