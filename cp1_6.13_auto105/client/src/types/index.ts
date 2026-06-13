export interface Ingredient {
  name: string;
  icon: string;
  category: string;
}

export interface Cuisine {
  name: string;
  description: string;
  icon: string;
}

export interface UploadResponse {
  success: boolean;
  imageUrl: string;
  ingredients: Ingredient[];
  cuisine: Cuisine;
  confidence: string;
  processingTime: string;
}

export interface Dish {
  id: number;
  name: string;
  icon: string;
  cookTime: number;
  calories: number;
  steps: string[];
  seasonTag: string;
  difficulty: string;
  description: string;
}

export interface MenuResponse {
  success: boolean;
  season: string;
  cuisine: string;
  totalDishes: number;
  totalCookTime: number;
  totalCalories: number;
  menu: Dish[];
}

export interface SavedMenu {
  id: string;
  createdAt: number;
  season: string;
  cuisine: string;
  menu: Dish[];
  imageUrl?: string;
  ingredients?: Ingredient[];
  isFavorite: boolean;
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
