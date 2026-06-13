export type Emotion = 'happy' | 'sad' | 'excited' | 'calm';
export type Flavor = 'sweet' | 'spicy' | 'sour' | 'umami';

export interface Ingredient {
  name: string;
  icon: string;
  amount: string;
}

export interface Step {
  number: number;
  description: string;
}

export interface Dish {
  id: string;
  name: string;
  emotion: Emotion;
  emotionLabel: string;
  flavors: Flavor[];
  ingredients: Ingredient[];
  steps: Step[];
  experience: string;
  gradientFrom: string;
  gradientTo: string;
  icon: string;
  createdAt: string;
}

export interface GenerateRequest {
  emotion: Emotion;
  flavors: Flavor[];
}

export interface FavoriteRequest {
  dish: Dish;
}

export interface FavoriteItem {
  dish: Dish;
  favoritedAt: string;
}

export interface EmotionConfig {
  key: Emotion;
  label: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  icon: string;
}

export interface FlavorConfig {
  key: Flavor;
  label: string;
  color: string;
  icon: string;
}
