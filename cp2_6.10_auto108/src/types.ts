export interface Ingredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: Ingredient[];
  imagePlaceholder: string;
}

export type IngredientCategory = 'vegetable' | 'meat' | 'seasoning' | 'staple' | 'other';

export interface ShoppingListItem extends Ingredient {
  category: IngredientCategory;
  purchased: boolean;
}
