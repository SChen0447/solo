export interface RecipeStep {
  id: string
  description: string
  ingredients: string
}

export interface Recipe {
  id: string
  name: string
  duration: number
  difficulty: number
  icon: string
  steps: RecipeStep[]
  createdAt: number
}

export type RecipeList = Recipe[]
export type FavoriteList = string[]
