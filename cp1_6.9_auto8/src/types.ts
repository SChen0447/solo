export interface Ingredient {
  id: string;
  name: string;
  quantity: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: Ingredient[];
  steps: string[];
  tags: string[];
  coverImage?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ShoppingListItem {
  name: string;
  quantity: number;
  unit: string;
}

export interface SearchFilters {
  query: string;
  tags: string[];
}

export const TAGS = ['早餐', '午餐', '晚餐', '甜点', '饮品', '素食', '快手菜'] as const;
export type TagType = typeof TAGS[number];
