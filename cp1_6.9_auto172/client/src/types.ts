export interface UserData {
  id: string;
  username: string;
  createdAt: number;
}

export interface RecipeElements {
  stardust: number;
  lightdust: number;
  darkmatter: number;
}

export interface RecipeConditions {
  temperature: number;
  pressure: number;
  stirRate: number;
}

export interface Recipe {
  id: string;
  ownerId: string;
  ownerName: string;
  name: string;
  createdAt: number;
  isPublic: boolean;
  elements: RecipeElements;
  conditions: RecipeConditions;
  color: string;
  particleDensity: number;
  likes: string[];
}

export interface SynthesisResult {
  success: boolean;
  name: string;
  color: string;
  particleDensity: number;
}
