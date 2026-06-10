export type NoteType = 'top' | 'middle' | 'base';

export interface Ingredient {
  id: string;
  name: string;
  type: NoteType;
  color: string;
  attributes: {
    fresh: number;
    sweet: number;
    woody: number;
    spicy: number;
    floral: number;
    resinous: number;
  };
}

export interface RecipeIngredient {
  ingredient: Ingredient;
  weight: number;
  selectedCount: number;
}

export interface Recipe {
  id: string;
  name: string;
  createdAt: number;
  ingredients: RecipeIngredient[];
}

export type RadarDimension =
  | 'fresh'
  | 'sweet'
  | 'woody'
  | 'spicy'
  | 'floral'
  | 'resinous';

export const RADAR_LABELS: Record<RadarDimension, string> = {
  fresh: '清新度',
  sweet: '甜度',
  woody: '木质度',
  spicy: '辛辣度',
  floral: '花香度',
  resinous: '树脂度',
};
