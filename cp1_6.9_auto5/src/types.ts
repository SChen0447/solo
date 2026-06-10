export type Difficulty = '简单' | '中等' | '困难';

export type BakeResult = '成功' | '一般' | '失败';

export interface Ingredient {
  id: string;
  name: string;
  amount: string;
  unit: string;
}

export interface Recipe {
  id: string;
  name: string;
  temperature: number;
  time: number;
  ingredients: Ingredient[];
  steps: string[];
  difficulty: Difficulty;
  coverImage: string | null;
  createdAt: string;
}

export interface BakeLog {
  id: string;
  recipeId: string;
  date: string;
  result: BakeResult;
  note: string;
  photoUrl: string | null;
  photoThumb: string | null;
  createdAt: string;
}

export interface UploadResponse {
  originalUrl: string;
  thumbnailUrl: string;
}
