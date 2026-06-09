export interface Ingredient {
  name: string;
  amount: string;
}

export interface Recipe {
  id: string;
  name: string;
  prepTime: number;
  difficulty: number;
  favorite: boolean;
  coverImage: string;
  ingredients: Ingredient[];
  steps: string;
}

export interface MatchResult {
  recipe: Recipe;
  matchRate: number;
  matchedCount: number;
  totalCount: number;
  missingIngredients: string[];
}
