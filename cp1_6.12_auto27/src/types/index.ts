export interface Ingredient {
  name: string;
  amount: string;
}

export interface Recipe {
  id: string;
  name: string;
  author: string;
  rating: number;
  cookTime: number;
  ingredients: Ingredient[];
  steps: string[];
  coverColor: string;
  coverEmoji: string;
}
