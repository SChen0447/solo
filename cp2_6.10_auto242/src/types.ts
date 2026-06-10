export type DishStatus = 'available' | 'soldout' | 'limited';

export interface Dish {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  status: DishStatus;
  stock: number;
  limited: number;
  ingredients: string[];
  nutritionTags: string[];
  lastUpdated: string;
}
